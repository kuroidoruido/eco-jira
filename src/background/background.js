/**
 * Background script for eco-jira (Manifest V3 compatible)
 * Manages storage, permissions, and message passing between popup and content scripts
 */

// Storage keys
const STORAGE_KEYS = {
  INSTANCES: 'jira_instances',
  STATS: 'eco_jira_stats',
  CACHE_PREFIX: 'cache:'
};

// Cache TTLs (in milliseconds)
const CACHE_TTLS = {
  METADATA: 30 * 24 * 60 * 60 * 1000, // 30 days
  ISSUES: 5 * 60 * 1000, // 5 minutes
  COMMENTS: 5 * 60 * 1000, // 5 minutes
  WORKLOGS: 5 * 60 * 1000, // 5 minutes
  NAVIGATION: 2 * 60 * 1000 // 2 minutes
};

// Jira API endpoints that are quasi-immutable
const IMMUTABLE_ENDPOINTS = [
  '/rest/api/2/field',
  '/rest/api/2/status',
  '/rest/api/2/priority',
  '/rest/api/2/issuetype',
  '/rest/api/2/resolution',
  '/rest/api/2/project',
  '/rest/api/2/createmeta',
  '/rest/api/2/user'
];

// Jira API endpoints for issue data
const ISSUE_ENDPOINTS = [
  '/rest/api/2/issue',
  '/rest/api/2/search'
];

/**
 * Check if an URL is for immutable metadata
 */
function isImmutableEndpoint(url) {
  return IMMUTABLE_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * Check if an URL is for issue data
 */
function isIssueEndpoint(url) {
  return ISSUE_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * Check if an URL is for comments
 */
function isCommentEndpoint(url) {
  return url.includes('/rest/api/2/issue/') && url.includes('/comment');
}

/**
 * Check if an URL is for worklogs
 */
function isWorklogEndpoint(url) {
  return url.includes('/rest/api/2/issue/') && url.includes('/worklog');
}

/**
 * Get cache TTL for a given URL
 */
function getCacheTTL(url) {
  if (isImmutableEndpoint(url)) {
    return CACHE_TTLS.METADATA;
  } else if (isCommentEndpoint(url)) {
    return CACHE_TTLS.COMMENTS;
  } else if (isWorklogEndpoint(url)) {
    return CACHE_TTLS.WORKLOGS;
  } else if (isIssueEndpoint(url)) {
    return CACHE_TTLS.ISSUES;
  }
  return CACHE_TTLS.NAVIGATION;
}

/**
 * Generate a simple cache key
 */
function generateSimpleCacheKey(url, method) {
  return `${method}:${url}`;
}

/**
 * Get Jira instances
 */
async function getJiraInstances() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.INSTANCES]);
  return result[STORAGE_KEYS.INSTANCES] || [];
}

/**
 * Save Jira instance
 */
async function saveJiraInstance(instance) {
  const instances = await getJiraInstances();
  const existingIndex = instances.findIndex(i => i.baseUrl === instance.baseUrl);
  
  if (existingIndex >= 0) {
    instances[existingIndex] = instance;
  } else {
    instances.push(instance);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.INSTANCES]: instances });
  return instances;
}

/**
 * Remove a Jira instance
 */
async function removeJiraInstance(baseUrl) {
  const instances = await getJiraInstances();
  const filtered = instances.filter(i => i.baseUrl !== baseUrl);
  await chrome.storage.local.set({ [STORAGE_KEYS.INSTANCES]: filtered });
  return filtered;
}

/**
 * Check if a URL is from a registered Jira instance
 */
async function isJiraUrl(urlString) {
  try {
    const url = new URL(urlString);
    const instances = await getJiraInstances();
    return instances.some(instance => {
      try {
        const instanceUrl = new URL(instance.baseUrl);
        return url.hostname === instanceUrl.hostname;
      } catch (e) {
        return false;
      }
    });
  } catch (e) {
    return false;
  }
}

/**
 * Get current statistics
 */
async function getStats() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.STATS]);
  return result[STORAGE_KEYS.STATS] || {
    bytesSaved: 0,
    requestsSaved: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastReset: Date.now()
  };
}

/**
 * Update statistics
 */
async function updateStats(statsUpdate) {
  const currentStats = await getStats();
  const newStats = { ...currentStats, ...statsUpdate };
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: newStats });
  return newStats;
}

/**
 * Reset statistics
 */
async function resetStats() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.STATS]: {
      bytesSaved: 0,
      requestsSaved: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastReset: Date.now()
    }
  });
}

/**
 * Get cache data
 */
async function getCache(key) {
  const result = await chrome.storage.local.get([key]);
  return result[key];
}

/**
 * Set cache data
 */
async function setCache(key, data) {
  await chrome.storage.local.set({ [key]: data });
}

/**
 * Remove cache data
 */
async function removeCache(key) {
  await chrome.storage.local.remove([key]);
}

/**
 * Clear all cache for a specific Jira instance
 */
async function clearInstanceCache(baseUrl) {
  const allKeys = await chrome.storage.local.get(null);
  const prefix = `cache:${baseUrl}:`;
  const keysToRemove = Object.keys(allKeys).filter(key => key.startsWith(prefix));
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  
  return keysToRemove.length;
}

/**
 * Clear all cache
 */
async function clearAllCache() {
  const allKeys = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith(STORAGE_KEYS.CACHE_PREFIX));
  
  if (cacheKeys.length > 0) {
    await chrome.storage.local.remove(cacheKeys);
  }
  
  return cacheKeys.length;
}

/**
 * Get cached response
 */
async function getCachedResponse(cacheKey) {
  const cached = await getCache(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  const ttl = getCacheTTL(cached.url);
  
  if (now - cached.timestamp > ttl) {
    return null;
  }
  
  return cached;
}

/**
 * Store response in cache
 */
async function cacheResponse(cacheKey, responseData, url) {
  const cacheData = {
    url,
    timestamp: Date.now(),
    ttl: getCacheTTL(url),
    status: responseData.status,
    headers: responseData.headers,
    body: responseData.body,
    size: responseData.size || (responseData.body ? responseData.body.length : 0)
  };
  
  await setCache(cacheKey, cacheData);
  return cacheData;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verify if URL is a Jira instance
 */
async function verifyJiraInstance(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/rest/api/2/serverInfo`, {
      method: 'GET',
      credentials: 'include'
    });
    return response.ok || response.status === 401 || response.status === 403;
  } catch (error) {
    return false;
  }
}

/**
 * Update extension icon based on current tab
 */
async function updateIcon() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      const instances = await getJiraInstances();
      const url = new URL(tab.url);
      
      const isActive = instances.some(instance => {
        try {
          const instanceUrl = new URL(instance.baseUrl);
          return url.hostname === instanceUrl.hostname;
        } catch (e) {
          return false;
        }
      });
      
      // Use absolute paths from extension root
      chrome.action.setIcon({
        path: isActive 
          ? {
              16: 'icons/icon16.png',
              32: 'icons/icon32.png',
              48: 'icons/icon48.png',
              128: 'icons/icon128.png'
            }
          : {
              16: 'icons/icon16_disabled.png',
              32: 'icons/icon32_disabled.png',
              48: 'icons/icon48_disabled.png',
              128: 'icons/icon128_disabled.png'
            }
      });
    } else {
      // Set default icon if no active tab
      chrome.action.setIcon({
        path: {
          16: 'icons/icon16_disabled.png',
          32: 'icons/icon32_disabled.png',
          48: 'icons/icon48_disabled.png',
          128: 'icons/icon128_disabled.png'
        }
      });
    }
  } catch (e) {
    console.error('[eco-jira] Error updating icon:', e);
  }
}

// Message handler for communication between popup/content scripts and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_JIRA_INSTANCES':
          const instances = await getJiraInstances();
          sendResponse({ success: true, instances });
          break;
          
        case 'ADD_JIRA_INSTANCE':
          const { instance } = message;
          const savedInstances = await saveJiraInstance(instance);
          sendResponse({ success: true, instances: savedInstances });
          break;
          
        case 'REMOVE_JIRA_INSTANCE':
          const { baseUrl } = message;
          const filteredInstances = await removeJiraInstance(baseUrl);
          sendResponse({ success: true, instances: filteredInstances });
          break;
          
        case 'GET_STATS':
          const stats = await getStats();
          sendResponse({ success: true, stats });
          break;
          
        case 'RESET_STATS':
          await resetStats();
          sendResponse({ success: true });
          break;
          
        case 'CLEAR_CACHE':
          const cleared = await clearAllCache();
          sendResponse({ success: true, cleared });
          break;
          
        case 'CLEAR_INSTANCE_CACHE':
          const clearedInstance = await clearInstanceCache(message.baseUrl);
          sendResponse({ success: true, cleared: clearedInstance });
          break;
          
        case 'VERIFY_JIRA':
          const { url } = message;
          const isValid = await verifyJiraInstance(url);
          sendResponse({ success: true, isValid });
          break;
          
        case 'GET_CACHED_RESPONSE': {
          const { cacheKey: getCacheKey } = message;
          const cached = await getCachedResponse(getCacheKey);
          sendResponse({ success: true, cached: cached !== null, data: cached });
          break;
        }
          
        case 'CACHE_RESPONSE': {
          const { cacheKey, responseData, url } = message;
          await cacheResponse(cacheKey, responseData, url);
          sendResponse({ success: true });
          break;
        }
          
        case 'UPDATE_STATS':
          const { statsUpdate } = message;
          await updateStats(statsUpdate);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[eco-jira] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Required for async sendResponse
});

// Update icon when tab changes or window focus changes
chrome.tabs.onActivated.addListener(updateIcon);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) updateIcon();
});
chrome.windows.onFocusChanged.addListener(updateIcon);

// Initial icon update
updateIcon();

// Send initial instances to all tabs on startup
getJiraInstances().then(instances => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_JIRA_INSTANCES',
        instances 
      }).catch(() => {}); // Ignore errors if tab doesn't have content script
    });
  });
});

console.log('[eco-jira] Background script loaded');
