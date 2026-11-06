/**
 * Content script for eco-jira
 * Intercepts fetch and XHR requests to inject cached responses
 * Works with Manifest V3 (no webRequest blocking)
 */

(function() {
  'use strict';

  // Cache to store intercepted functions
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Message handler for communication with background
  let messageIdCounter = 0;
  const pendingRequests = new Map();

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

  function getCacheTTL(url) {
    if (isImmutableEndpoint(url)) return CACHE_TTLS.METADATA;
    if (isCommentEndpoint(url)) return CACHE_TTLS.COMMENTS;
    if (isWorklogEndpoint(url)) return CACHE_TTLS.WORKLOGS;
    if (isIssueEndpoint(url)) return CACHE_TTLS.ISSUES;
    return CACHE_TTLS.NAVIGATION;
  }

  function generateSimpleCacheKey(url, method) {
    return `${method}:${url}`;
  }

  // Helper to check if URL is from a registered Jira instance
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

  // Get Jira instances from background
  async function getJiraInstances() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_JIRA_INSTANCES' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve([]);
        } else if (response && response.success) {
          resolve(response.instances || []);
        } else {
          resolve([]);
        }
      });
    });
  }

  // Check cache via background
  async function getCachedResponse(cacheKey) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'GET_CACHED_RESPONSE', 
        cacheKey 
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else if (response && response.success && response.cached) {
          resolve(response.data);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Cache response via background
  async function cacheResponse(cacheKey, responseData, url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'CACHE_RESPONSE', 
        cacheKey,
        responseData,
        url
      }, (response) => {
        resolve(response && response.success);
      });
    });
  }

  // Update stats via background
  async function updateStats(statsUpdate) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_STATS', 
        statsUpdate
      }, (response) => {
        resolve(response && response.success);
      });
    });
  }

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
    return true;
  }

  // Override fetch
  window.fetch = async function(resource, init = {}) {
    const method = (init.method || 'GET').toUpperCase();
    
    // Only intercept GET requests
    if (method !== 'GET') {
      return originalFetch.call(this, resource, init);
    }
    
    // Get full URL
    const url = new URL(resource, window.location.href).href;
    
    // Check if this is a Jira URL
    const isJira = await isJiraUrl(url);
    if (!isJira) {
      return originalFetch.call(this, resource, init);
    }
    
    // Generate cache key
    const cacheKey = generateSimpleCacheKey(url, method);
    
    // Check cache via background
    const cachedResponse = await getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      console.log(`[eco-jira] Using cached response for ${url}`);
      
      // Update stats
      await updateStats({
        bytesSaved: cachedResponse.size || 0,
        requestsSaved: 1,
        cacheHits: 1
      });
      
      // Create Response object from cached data
      const response = new Response(
        new Blob([new Uint8Array(cachedResponse.body)]),
        {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText || '',
          headers: new Headers(cachedResponse.headers)
        }
      );
      
      return response;
    } else {
      // Update cache miss stat
      await updateStats({ cacheMisses: 1 });
      
      // Proceed with original fetch
      const response = await originalFetch.call(this, resource, init);
      
      // Cache successful responses
      if (canCacheResponse(response, url)) {
        const clone = response.clone();
        const body = await clone.arrayBuffer();
        
        const responseData = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: Array.from(new Uint8Array(body)),
          size: body.byteLength
        };
        
        await cacheResponse(cacheKey, responseData, url);
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
    
    // Only intercept GET requests
    if (method !== 'GET') {
      return originalXHRSend.apply(this, arguments);
    }
    
    // Check if this is a Jira URL
    const isJira = await isJiraUrl(url);
    if (!isJira) {
      return originalXHRSend.apply(this, arguments);
    }
    
    // Generate cache key
    const cacheKey = generateSimpleCacheKey(url, method);
    
    // Check cache via background
    const cachedResponse = await getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      console.log(`[eco-jira] Using cached response for XHR ${url}`);
      
      // Update stats
      await updateStats({
        bytesSaved: cachedResponse.size || 0,
        requestsSaved: 1,
        cacheHits: 1
      });
      
      // Simulate response
      const xhr = this;
      xhr.status = cachedResponse.status;
      xhr.statusText = cachedResponse.statusText || '';
      
      // Convert body to string
      const bodyArray = new Uint8Array(cachedResponse.body);
      const bodyString = new TextDecoder().decode(bodyArray);
      
      xhr.responseText = bodyString;
      xhr.response = bodyString;
      
      // Mock getResponseHeader
      xhr.getResponseHeader = function(headerName) {
        const headers = cachedResponse.headers || {};
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === headerName.toLowerCase()) {
            return value;
          }
        }
        return null;
      };
      
      xhr.getAllResponseHeaders = function() {
        const headers = cachedResponse.headers || {};
        return Object.entries(headers)
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
      // Update cache miss stat
      await updateStats({ cacheMisses: 1 });
      
      // Store original callbacks
      const originalOnReadyStateChange = this.onreadystatechange;
      const originalOnLoad = this.onload;
      const originalOnError = this.onerror;
      
      // Override callbacks to cache successful responses
      this.onreadystatechange = function() {
        if (this.readyState === 4) {
          if (this.status >= 200 && this.status < 300) {
            // Get response data
            const responseText = this.responseText || this.response;
            const bodyArray = new TextEncoder().encode(responseText);
            
            const responseData = {
              status: this.status,
              statusText: this.statusText,
              headers: this.getAllResponseHeaders ? 
                parseHeaders(this.getAllResponseHeaders()) : {},
              body: Array.from(new Uint8Array(bodyArray.buffer)),
              size: bodyArray.byteLength
            };
            
            cacheResponse(cacheKey, responseData, url).catch(e => {
              console.error('[eco-jira] Error caching XHR response:', e);
            });
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
          
          const responseData = {
            status: this.status,
            statusText: this.statusText,
            headers: this.getAllResponseHeaders ? 
              parseHeaders(this.getAllResponseHeaders()) : {},
            body: Array.from(new Uint8Array(bodyArray.buffer)),
            size: bodyArray.byteLength
          };
          
          cacheResponse(cacheKey, responseData, url).catch(e => {
            console.error('[eco-jira] Error caching XHR response:', e);
          });
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

  console.log('[eco-jira] Content script loaded');
})();
