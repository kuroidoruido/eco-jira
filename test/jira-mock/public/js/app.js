/**
 * Mock Jira Application
 * Simulates Jira API calls with random delays (100-200ms)
 */

// Intercept fetch requests to add delay
const originalFetch = window.fetch;

window.fetch = async function(resource, init = {}) {
  // For API requests, add random delay
  if (resource.includes('/rest/api/2/') || resource.includes('/rest/agile/')) {
    const delay = Math.floor(Math.random() * 100) + 100; // 100-200ms
    await new Promise(resolve => setTimeout(resolve, delay));
    console.log(`[Mock Jira] API request to ${resource} - delay: ${delay}ms`);
  }
  
  return originalFetch.call(this, resource, init);
};

// Also intercept XMLHttpRequest for compatibility
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
  this._method = method;
  this._url = url;
  return originalXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
  if (this._url && this._url.includes('/rest/api/2/')) {
    const delay = Math.floor(Math.random() * 100) + 100;
    setTimeout(() => {
      originalXHRSend.apply(this, arguments);
    }, delay);
    console.log(`[Mock Jira] XHR request to ${this._url} - delay: ${delay}ms`);
  } else {
    return originalXHRSend.apply(this, arguments);
  }
};

// Log initialization
console.log('[Mock Jira] Application initialized with random API delays (100-200ms)');

// Expose for debugging
window.MockJira = {
  getOriginalFetch: () => originalFetch,
  getOriginalXHROpen: () => originalXHROpen,
  getOriginalXHRSend: () => originalXHRSend
};
