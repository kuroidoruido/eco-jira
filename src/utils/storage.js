/**
 * Storage utilities for eco-jira
 * Handles chrome.storage.local and IndexedDB for caching
 */

// Storage keys
const STORAGE_KEYS = {
  INSTANCES: 'jira_instances',
  STATS: 'eco_jira_stats',
  CACHE_VERSION: 'cache_version'
};

// Default cache TTLs (in milliseconds)
const CACHE_TTLS = {
  METADATA: 30 * 24 * 60 * 60 * 1000, // 30 days for quasi-immutable metadata
  ISSUES: 5 * 60 * 1000, // 5 minutes for issue data
  COMMENTS: 5 * 60 * 1000, // 5 minutes for comments
  WORKLOGS: 5 * 60 * 1000, // 5 minutes for worklogs
  NAVIGATION: 2 * 60 * 1000 // 2 minutes for navigation cache
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
export function isImmutableEndpoint(url) {
  return IMMUTABLE_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * Check if an URL is for issue data
 */
export function isIssueEndpoint(url) {
  return ISSUE_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * Check if an URL is for comments
 */
export function isCommentEndpoint(url) {
  return url.includes('/rest/api/2/issue/') && url.includes('/comment');
}

/**
 * Check if an URL is for worklogs
 */
export function isWorklogEndpoint(url) {
  return url.includes('/rest/api/2/issue/') && url.includes('/worklog');
}

/**
 * Get cache TTL for a given URL
 */
export function getCacheTTL(url) {
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
 * Generate a cache key for a request
 */
export function generateCacheKey(url, method, body) {
  const bodyHash = body ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)).then(buf => {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }) : Promise.resolve('');
  
  return bodyHash.then(hash => {
    return `${url}:${method}:${hash}`;
  });
}

/**
 * Generate a simpler cache key (sync version, no body hash for GET)
 */
export function generateSimpleCacheKey(url, method = 'GET') {
  return `${method}:${url}`;
}

/**
 * Get Jira instance configuration
 */
export async function getJiraInstances() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.INSTANCES]);
  return result[STORAGE_KEYS.INSTANCES] || [];
}

/**
 * Save Jira instance configuration
 */
export async function saveJiraInstance(instance) {
  const instances = await getJiraInstances();
  
  // Check if instance already exists
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
export async function removeJiraInstance(baseUrl) {
  const instances = await getJiraInstances();
  const filtered = instances.filter(i => i.baseUrl !== baseUrl);
  
  await chrome.storage.local.set({ [STORAGE_KEYS.INSTANCES]: filtered });
  return filtered;
}

/**
 * Check if current tab URL matches a registered Jira instance
 */
export async function isCurrentTabJira() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return { active: false };
  
  const instances = await getJiraInstances();
  const url = new URL(tab.url);
  
  for (const instance of instances) {
    try {
      const instanceUrl = new URL(instance.baseUrl);
      if (url.hostname === instanceUrl.hostname) {
        return { active: true, instance };
      }
    } catch (e) {
      // Invalid URL format, skip
    }
  }
  
  return { active: false };
}

/**
 * Check if a URL is from a registered Jira instance
 */
export async function isJiraUrl(urlString) {
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
export async function getStats() {
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
export async function updateStats(statsUpdate) {
  const currentStats = await getStats();
  const newStats = { ...currentStats, ...statsUpdate };
  
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: newStats });
  return newStats;
}

/**
 * Reset statistics
 */
export async function resetStats() {
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
 * Get cache data from chrome.storage.local
 * Note: chrome.storage.local has a 5MB limit, so we use it for metadata only
 */
export async function getCache(key) {
  const result = await chrome.storage.local.get([key]);
  return result[key];
}

/**
 * Set cache data in chrome.storage.local
 */
export async function setCache(key, data) {
  await chrome.storage.local.set({ [key]: data });
}

/**
 * Remove cache data
 */
export async function removeCache(key) {
  await chrome.storage.local.remove([key]);
}

/**
 * Clear all cache for a specific Jira instance
 */
export async function clearInstanceCache(baseUrl) {
  const instances = await getJiraInstances();
  const prefix = `cache:${baseUrl}:`;
  
  // For chrome.storage, we need to get all keys and filter
  const allKeys = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(allKeys).filter(key => key.startsWith(prefix));
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  
  return keysToRemove.length;
}

/**
 * Clear all cache
 */
export async function clearAllCache() {
  const allKeys = await chrome.storage.local.get(null);
  const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('cache:'));
  
  if (cacheKeys.length > 0) {
    await chrome.storage.local.remove(cacheKeys);
  }
  
  return cacheKeys.length;
}

/**
 * Get cached response
 */
export async function getCachedResponse(cacheKey) {
  const cached = await getCache(cacheKey);
  if (!cached) return null;
  
  // Check if cache is still valid
  const now = Date.now();
  const ttl = getCacheTTL(cached.url);
  
  if (now - cached.timestamp > ttl) {
    // Cache expired
    return null;
  }
  
  return cached;
}

/**
 * Store response in cache
 */
export async function cacheResponse(cacheKey, response, url) {
  const cacheData = {
    url,
    timestamp: Date.now(),
    ttl: getCacheTTL(url),
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.clone().arrayBuffer(),
    size: response.headers.get('content-length') || new Blob([await response.clone().arrayBuffer()]).size
  };
  
  await setCache(cacheKey, cacheData);
  return cacheData;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if response can be cached
 */
export function canCacheResponse(response, url) {
  // Don't cache errors
  if (response.status >= 400) return false;
  
  // Don't cache non-GET requests
  // Don't cache if no-cache header is present
  const cacheControl = response.headers.get('cache-control');
  if (cacheControl && cacheControl.includes('no-cache')) return false;
  
  // Don't cache if private
  if (cacheControl && cacheControl.includes('private')) return false;
  
  return true;
}

export { STORAGE_KEYS, CACHE_TTLS };
