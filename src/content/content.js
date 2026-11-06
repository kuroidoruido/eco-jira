/**
 * Content script for eco-jira
 * Intercepts fetch and XHR requests to inject cached responses
 * Works with Manifest V3 (no webRequest blocking)
 */

(function() {
  'use strict';

  // Log function - logs will be visible in console
  function ecoJiraLog(message, type = 'info', data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[eco-jira] [${timestamp}] [${type.toUpperCase()}] ${message}`, data || '');
  }

  // Cache to store intercepted functions
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Store Jira instances and cache locally
  let jiraInstances = [];
  let requestCache = new Map();

  // Storage keys
  const STORAGE_KEYS = {
    INSTANCES: 'jira_instances',
    STATS: 'eco_jira_stats',
    CACHE_PREFIX: 'cache:'
  };

  // Cache TTLs (in milliseconds)
  const CACHE_TTLS = {
    METADATA: 30 * 24 * 60 * 60 * 1000,
    ISSUES: 5 * 60 * 1000,
    COMMENTS: 5 * 60 * 1000,
    WORKLOGS: 5 * 60 * 1000,
    NAVIGATION: 2 * 60 * 1000
  };

  // Jira API endpoints
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

  const ISSUE_ENDPOINTS = ['/rest/api/2/issue', '/rest/api/2/search'];

  function isImmutableEndpoint(url) {
    return IMMUTABLE_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }

  function isIssueEndpoint(url) {
    return ISSUE_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }

  function isCommentEndpoint(url) {
    return url.includes('/rest/api/2/issue/') && url.includes('/comment');
  }

  function isWorklogEndpoint(url) {
    return url.includes('/rest/api/2/issue/') && url.includes('/worklog');
  }

  function isBatchEndpoint(url) {
    return url.includes('/s/') && url.includes('/batch.js') ||
           url.includes('/s/') && url.includes('/batch.css');
  }

  function getCacheTTL(url) {
    if (isImmutableEndpoint(url)) return CACHE_TTLS.METADATA;
    if (isCommentEndpoint(url)) return CACHE_TTLS.COMMENTS;
    if (isWorklogEndpoint(url)) return CACHE_TTLS.WORKLOGS;
    if (isIssueEndpoint(url)) return CACHE_TTLS.ISSUES;
    if (isBatchEndpoint(url)) return CACHE_TTLS.METADATA; // Cache batch files aggressively
    return CACHE_TTLS.NAVIGATION;
  }

  function generateSimpleCacheKey(url, method) {
    return `${method}:${url}`;
  }

  // Check if URL belongs to a Jira instance
  function isJiraRequest(urlString, method = 'GET') {
    try {
      const url = new URL(urlString);
      
      // Check if URL matches any registered Jira instance
      for (const instance of jiraInstances) {
        try {
          const instanceUrl = new URL(instance.baseUrl);
          // Compare hostname WITHOUT port
          if (url.hostname.replace(/:\d+$/, '') === instanceUrl.hostname.replace(/:\d+$/, '')) {
            // Only cache GET requests for now
            if (method === 'GET') {
              return true;
            }
            return false;
          }
        } catch (e) {
          // Invalid instance URL, skip
        }
      }
      
      // Also check for common Jira patterns (in case instances not loaded yet)
      if (url.hostname.includes('atlassian.net') || 
          url.hostname.includes('jira') ||
          url.pathname.includes('/jira') ||
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.match(/^localhost:\d+$/)) {
        return method === 'GET';
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  // Message handler for communication with background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_JIRA_INSTANCES') {
      jiraInstances = message.instances || [];
      ecoJiraLog(`Updated Jira instances: ${jiraInstances.length} instances`, 'info', jiraInstances);
    }
    return true;
  });

  // Request instances from background on load
  chrome.runtime.sendMessage({ type: 'GET_JIRA_INSTANCES' }, (response) => {
    if (response && response.instances) {
      jiraInstances = response.instances;
      ecoJiraLog(`Loaded ${jiraInstances.length} Jira instances`, 'info', jiraInstances);
    } else {
      ecoJiraLog('No Jira instances loaded', 'warn');
    }
  });

  // Parse headers from XHR
  function parseHeaders(headersString) {
    const headers = {};
    if (!headersString) return headers;
    const lines = headersString.trim().split('\r\n');
    lines.forEach(line => {
      const [name, value] = line.split(': ');
      if (name && value) {
        headers[name] = value;
      }
    });
    return headers;
  }

  // Check if response can be cached
  function canCacheResponse(response, url) {
    if (response.status >= 400) return false;
    
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl && cacheControl.includes('no-cache')) return false;
    if (cacheControl && cacheControl.includes('private')) return false;
    
    // Don't cache non-Jira URLs
    return true;
  }

  // Store response in local cache
  function storeInCache(cacheKey, url, response) {
    const cacheEntry = {
      url,
      timestamp: Date.now(),
      ttl: getCacheTTL(url),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: null,
      size: parseInt(response.headers.get('content-length')) || 0
    };
    
    // Store body as array
    response.clone().arrayBuffer().then(buffer => {
      cacheEntry.body = Array.from(new Uint8Array(buffer));
      cacheEntry.size = buffer.byteLength;
      requestCache.set(cacheKey, cacheEntry);
      ecoJiraLog(`Cached response for ${url} (${cacheEntry.size} bytes)`, 'cache');
    }).catch(e => {
      ecoJiraLog(`Error caching body for ${url}: ${e.message}`, 'error');
    });
    
    return cacheEntry;
  }

  // Check cache
  function getFromCache(cacheKey) {
    const entry = requestCache.get(cacheKey);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      requestCache.delete(cacheKey);
      return null;
    }
    
    return entry;
  }

  // Format time remaining as HH:MM:SS
  function formatTimeRemaining(timestamp, ttl) {
    const remaining = Math.max(0, ttl - (Date.now() - timestamp));
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Override fetch
  window.fetch = async function(resource, init = {}) {
    const method = (init.method || 'GET').toUpperCase();
    const url = new URL(resource, window.location.href).href;
    
    // Only process GET requests for Jira instances
    if (method !== 'GET' || !isJiraRequest(url, method)) {
      return originalFetch.call(this, resource, init);
    }
    
    const cacheKey = generateSimpleCacheKey(url, method);
    ecoJiraLog(`Fetch request: ${method} ${url}`);
    
    // Check cache
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      ecoJiraLog(`Cache HIT for ${url}`, 'cache');
      
      // Update stats via background
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_STATS',
        statsUpdate: {
          bytesSaved: cached.size || 0,
          requestsSaved: 1,
          cacheHits: 1
        }
      });
      
      // Create Response object from cached data with 304 status and custom headers
      const response = new Response(
        new Blob([new Uint8Array(cached.body)]),
        {
          status: 304,
          statusText: 'Not Modified (from eco-jira cache)',
          headers: new Headers({
            ...cached.headers,
            'X-EcoJira-fromCache': 'true',
            'X-EcoJira-expiresIn': formatTimeRemaining(cached.timestamp, cached.ttl)
          })
        }
      );
      
      return response;
    } else {
      ecoJiraLog(`Cache MISS for ${url}`, 'cache');
      
      // Update cache miss stat
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_STATS',
        statsUpdate: { cacheMisses: 1 }
      });
      
      // Proceed with original fetch
      const response = await originalFetch.call(this, resource, init);
      
      // Cache successful responses
      if (canCacheResponse(response, url)) {
        storeInCache(cacheKey, url, response);
      }
      
      return response;
    }
  };

  // Override XMLHttpRequest
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method.toUpperCase();
    this._url = new URL(url, window.location.href).href;
    this._headers = {};
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    this._headers[name] = value;
    return originalSetRequestHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = async function(body) {
    const method = this._method;
    const url = this._url;
    
    // Only process GET requests for Jira instances
    if (method !== 'GET' || !isJiraRequest(url, method)) {
      return originalXHRSend.apply(this, arguments);
    }
    
    const cacheKey = generateSimpleCacheKey(url, method);
    ecoJiraLog(`XHR request: ${method} ${url}`);
    
    // Check cache
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      ecoJiraLog(`XHR Cache HIT for ${url}`, 'cache');
      
      // Update stats
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_STATS',
        statsUpdate: {
          bytesSaved: cached.size || 0,
          requestsSaved: 1,
          cacheHits: 1
        }
      });
      
      // Simulate response with 304 status and custom headers
      const xhr = this;
      xhr.status = 304;
      xhr.statusText = 'Not Modified (from eco-jira cache)';
      
      // Convert body to string
      const bodyArray = cached.body ? new Uint8Array(cached.body) : new Uint8Array();
      const bodyString = new TextDecoder().decode(bodyArray);
      
      xhr.responseText = bodyString;
      xhr.response = bodyString;
      
      // Add custom headers to cached headers
      const allHeaders = {
        ...(cached.headers || {}),
        'X-EcoJira-fromCache': 'true',
        'X-EcoJira-expiresIn': formatTimeRemaining(cached.timestamp, cached.ttl)
      };
      
      // Mock getResponseHeader
      xhr.getResponseHeader = function(headerName) {
        for (const [key, value] of Object.entries(allHeaders)) {
          if (key.toLowerCase() === headerName.toLowerCase()) {
            return value;
          }
        }
        return null;
      };
      
      xhr.getAllResponseHeaders = function() {
        return Object.entries(allHeaders)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n');
      };
      
      // Trigger events
      if (xhr.onreadystatechange) {
        xhr.readyState = 1;
        xhr.onreadystatechange();
        xhr.readyState = 4;
        xhr.onreadystatechange();
      }
      
      if (xhr.onload) {
        xhr.onload();
      }
      
      return;
    } else {
      ecoJiraLog(`XHR Cache MISS for ${url}`, 'cache');
      
      // Update cache miss stat
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_STATS',
        statsUpdate: { cacheMisses: 1 }
      });
      
      // Store original callbacks
      const originalOnReadyStateChange = this.onreadystatechange;
      const originalOnLoad = this.onload;
      const originalOnError = this.onerror;
      
      // Override callbacks to cache successful responses
      this.onreadystatechange = function() {
        if (this.readyState === 4) {
          if (this.status >= 200 && this.status < 300) {
            const responseText = this.responseText || this.response;
            const bodyArray = new TextEncoder().encode(responseText);
            
            // Create a mock Response object for caching
            const mockResponse = {
              status: this.status,
              statusText: this.statusText,
              headers: new Headers(this.getAllResponseHeaders ? 
                parseHeaders(this.getAllResponseHeaders()) : {}),
              clone: function() {
                return {
                  arrayBuffer: async () => bodyArray.buffer,
                  headers: this.headers
                };
              }
            };
            
            storeInCache(cacheKey, url, mockResponse);
          }
        }
        
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };
      
      this.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          const responseText = this.responseText || this.response;
          const bodyArray = new TextEncoder().encode(responseText);
          
          const mockResponse = {
            status: this.status,
            statusText: this.statusText,
            headers: new Headers(this.getAllResponseHeaders ? 
              parseHeaders(this.getAllResponseHeaders()) : {}),
            clone: function() {
              return {
                arrayBuffer: async () => bodyArray.buffer,
                headers: this.headers
              };
            }
          };
          
          storeInCache(cacheKey, url, mockResponse);
        }
        
        if (originalOnLoad) {
          originalOnLoad.apply(this, arguments);
        }
      };
      
      this.onerror = function() {
        if (originalOnError) {
          originalOnError.apply(this, arguments);
        }
      };
      
      // Call original send
      return originalXHRSend.apply(this, arguments);
    }
  };

  // Initial log
  ecoJiraLog('Content script loaded and ready to intercept requests');
  
  // Listen for instance updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'UPDATE_JIRA_INSTANCES') {
      jiraInstances = message.instances || [];
      ecoJiraLog(`Updated Jira instances in content script: ${jiraInstances.length}`);
    }
  });
})();
