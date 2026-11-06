/**
 * Popup script for eco-jira
 * Manages UI and user interactions
 */

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusDescription = document.getElementById('status-description');
const controlsSection = document.getElementById('controls-section');
const activateBtn = document.getElementById('activate-btn');
const deactivateBtn = document.getElementById('deactivate-btn');
const instancesList = document.getElementById('instances-list');
const bytesSavedEl = document.getElementById('bytes-saved');
const requestsSavedEl = document.getElementById('requests-saved');
const cacheHitsEl = document.getElementById('cache-hits');
const cacheMissesEl = document.getElementById('cache-misses');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');

// Current tab state
let currentTabUrl = null;
let currentInstance = null;

// Logs storage
let ecoJiraLogs = [];

// Storage keys
const STORAGE_KEYS = {
  INSTANCES: 'jira_instances',
  STATS: 'eco_jira_stats'
};

// Add log function
function addLog(message, type = 'info', data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  ecoJiraLogs.push(logEntry);
  console.log(`[eco-jira] ${logEntry}`, data || '');
  
  // Keep only last 100 logs
  if (ecoJiraLogs.length > 100) {
    ecoJiraLogs = ecoJiraLogs.slice(-100);
  }
  
  // Update modal if open
  const logsContent = document.getElementById('logs-content');
  if (logsContent && logsContent.style.display !== 'none') {
    updateLogsDisplay();
  }
}

// Update logs display
function updateLogsDisplay() {
  const logsContent = document.getElementById('logs-content');
  if (logsContent) {
    logsContent.textContent = ecoJiraLogs.join('\n');
    logsContent.scrollTop = logsContent.scrollHeight;
  }
}

// Get display URL
function getDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return url;
  }
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update status display
function updateStatus(type, text, description) {
  statusIcon.className = 'status-icon ' + type;
  statusText.textContent = text;
  statusDescription.textContent = description || '';
}

// Update extension icon
async function updateExtensionIcon(type) {
  try {
    const paths = {
      active: {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      },
      inactive: {
        16: 'icons/icon16_disabled.png',
        32: 'icons/icon32_disabled.png',
        48: 'icons/icon48_disabled.png',
        128: 'icons/icon128_disabled.png'
      },
      error: {
        16: 'icons/icon16_disabled.png',
        32: 'icons/icon32_disabled.png',
        48: 'icons/icon48_disabled.png',
        128: 'icons/icon128_disabled.png'
      }
    };
    
    const iconPaths = paths[type] || paths.inactive;
    await chrome.action.setIcon({ path: iconPaths });
    addLog(`Extension icon updated to: ${type}`);
  } catch (error) {
    addLog(`Error updating extension icon: ${error.message}`, 'error');
  }
}

// Check if URL looks like a Jira instance
function isPotentialJiraUrl(url) {
  if (url.hostname.includes('atlassian.net')) return true;
  if (url.hostname.includes('jira') || url.hostname === 'localhost') return true;
  if (url.pathname.includes('/jira') || url.pathname.includes('/jira/')) return true;
  return false;
}

// Get Jira instances directly from storage (no background needed)
async function getJiraInstances() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.INSTANCES]);
    return result[STORAGE_KEYS.INSTANCES] || [];
  } catch (error) {
    addLog(`Error getting instances: ${error.message}`, 'error');
    return [];
  }
}

// Save Jira instance
async function saveJiraInstance(instance) {
  try {
    const instances = await getJiraInstances();
    const existingIndex = instances.findIndex(i => i.baseUrl === instance.baseUrl);
    
    if (existingIndex >= 0) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }
    
    await chrome.storage.local.set({ [STORAGE_KEYS.INSTANCES]: instances });
    addLog(`Instance saved: ${instance.baseUrl}`);
    return instances;
  } catch (error) {
    addLog(`Error saving instance: ${error.message}`, 'error');
    return [];
  }
}

// Remove a Jira instance
async function removeJiraInstance(baseUrl) {
  try {
    const instances = await getJiraInstances();
    const filtered = instances.filter(i => i.baseUrl !== baseUrl);
    await chrome.storage.local.set({ [STORAGE_KEYS.INSTANCES]: filtered });
    addLog(`Instance removed: ${baseUrl}`);
    return filtered;
  } catch (error) {
    addLog(`Error removing instance: ${error.message}`, 'error');
    return [];
  }
}

// Get stats
async function getStats() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.STATS]);
    return result[STORAGE_KEYS.STATS] || {
      bytesSaved: 0,
      requestsSaved: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastReset: Date.now()
    };
  } catch (error) {
    addLog(`Error getting stats: ${error.message}`, 'error');
    return {
      bytesSaved: 0,
      requestsSaved: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastReset: Date.now()
    };
  }
}

// Update stats
async function updateStats(statsUpdate) {
  try {
    const currentStats = await getStats();
    const newStats = { ...currentStats, ...statsUpdate };
    await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: newStats });
    addLog(`Stats updated: +${statsUpdate.requestsSaved || 0} requests, +${statsUpdate.bytesSaved || 0} bytes`);
    return newStats;
  } catch (error) {
    addLog(`Error updating stats: ${error.message}`, 'error');
    return currentStats;
  }
}

// Reset stats
async function resetStats() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.STATS]: {
        bytesSaved: 0,
        requestsSaved: 0,
        cacheHits: 0,
        cacheMisses: 0,
        lastReset: Date.now()
      }
    });
    addLog('Stats reset');
  } catch (error) {
    addLog(`Error resetting stats: ${error.message}`, 'error');
  }
}

// Clear all cache
async function clearAllCache() {
  try {
    const allKeys = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('cache:'));
    if (cacheKeys.length > 0) {
      await chrome.storage.local.remove(cacheKeys);
      addLog(`Cache cleared: ${cacheKeys.length} entries removed`);
    }
    return cacheKeys.length;
  } catch (error) {
    addLog(`Error clearing cache: ${error.message}`, 'error');
    return 0;
  }
}

// Verify Jira instance
async function verifyJiraInstance(baseUrl) {
  addLog(`Verifying Jira instance: ${baseUrl}`);
  try {
    const response = await fetch(`${baseUrl}/rest/api/2/serverInfo`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    
    const isValid = response.ok || response.status === 401 || response.status === 403;
    addLog(`Verification result for ${baseUrl}: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  } catch (error) {
    addLog(`Error verifying Jira instance ${baseUrl}: ${error.message}`, 'error');
    return false;
  }
}

// Load Jira instances into UI
async function loadJiraInstances() {
  addLog('Loading Jira instances for UI');
  try {
    const instances = await getJiraInstances();
    addLog(`Found ${instances.length} instances`);
    
    if (instances.length === 0) {
      instancesList.innerHTML = '<p class="empty-message">Aucune instance enregistrée</p>';
      return;
    }
    
    instancesList.innerHTML = instances.map(instance => `
      <div class="instance-item" data-base-url="${instance.baseUrl}">
        <span class="instance-url" title="${instance.baseUrl}">${getDisplayUrl(instance.baseUrl)}</span>
        <div class="instance-actions">
          <button class="btn btn-sm" onclick="testInstanceConnection('${instance.baseUrl.replace(/'/g, "\\'")}')">Test</button>
          <button class="btn btn-sm btn-danger" onclick="removeInstance('${instance.baseUrl.replace(/'/g, "\\'")}')">×</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    addLog(`Error loading instances to UI: ${error.message}`, 'error');
    instancesList.innerHTML = '<p class="empty-message">Erreur de chargement</p>';
  }
}

// Load statistics into UI
async function loadStats() {
  addLog('Loading stats for UI');
  try {
    const stats = await getStats();
    bytesSavedEl.textContent = formatBytes(stats.bytesSaved || 0);
    requestsSavedEl.textContent = (stats.requestsSaved || 0).toLocaleString();
    cacheHitsEl.textContent = (stats.cacheHits || 0).toLocaleString();
    cacheMissesEl.textContent = (stats.cacheMisses || 0).toLocaleString();
    addLog(`Stats loaded: ${stats.requestsSaved} requests saved, ${formatBytes(stats.bytesSaved)} bytes`);
  } catch (error) {
    addLog(`Error loading stats to UI: ${error.message}`, 'error');
  }
}

// Load current tab state
async function loadCurrentTabState() {
  addLog('Loading current tab state');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      currentTabUrl = tab.url;
      const url = new URL(tab.url);
      const instances = await getJiraInstances();
      
      const matchingInstance = instances.find(i => {
        try {
          const instanceUrl = new URL(i.baseUrl);
          // Compare hostname WITHOUT port
          return url.hostname.replace(/:\d+$/, '') === instanceUrl.hostname.replace(/:\d+$/, '');
        } catch (e) {
          return false;
        }
      });
      
      if (matchingInstance) {
        currentInstance = matchingInstance;
        updateStatus('active', 'Actif sur ce site', currentInstance.baseUrl);
        activateBtn.style.display = 'none';
        deactivateBtn.style.display = 'inline-block';
        testConnectionBtn.style.display = 'inline-block';
        addLog(`Active on Jira instance: ${currentInstance.baseUrl}`);
      } else if (isPotentialJiraUrl(url)) {
        updateStatus('inactive', 'Jira détecté', 'Non activé');
        activateBtn.style.display = 'inline-block';
        deactivateBtn.style.display = 'none';
        testConnectionBtn.style.display = 'none';
        addLog(`Jira detected but not activated: ${url.hostname}`);
      } else {
        updateStatus('inactive', 'Site non-Jira', 'Seuls les sites Jira peuvent être activés');
        activateBtn.style.display = 'none';
        deactivateBtn.style.display = 'none';
        testConnectionBtn.style.display = 'none';
        addLog(`Not a Jira site: ${url.hostname}`);
      }
      
      controlsSection.style.display = 'block';
    } else {
      updateStatus('error', 'Pas d\'onglet actif', '');
      addLog('No active tab found');
    }
  } catch (error) {
    addLog(`Error loading tab state: ${error.message}`, 'error');
    updateStatus('error', 'Erreur', 'Impossible de charger l\'état');
  }
}

// Show toast
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
  
  addLog(`Toast: ${message} (${type})`);
}

// Handle activate current site
activateBtn.addEventListener('click', function() {
  addLog('Activate button clicked');
  
  if (!currentTabUrl) {
    addLog('No active tab', 'error');
    showToast('Aucun onglet actif', 'error');
    return;
  }

  const url = new URL(currentTabUrl);
  const baseUrl = `${url.protocol}//${url.hostname}`;
  
  addLog(`Attempting to activate: ${baseUrl}`);
  addLog('Requesting permissions (must be direct user gesture)...');
  
  // permissions.request MUST be called directly from user input handler
  chrome.permissions.request({
    origins: [`${baseUrl}/*`]
  }, function(granted) {
    addLog(`Permissions result: ${granted ? 'GRANTED' : 'DENIED'}`);
    
    if (!granted) {
      addLog(`Permissions denied by user for: ${baseUrl}`, 'error');
      showToast('Permission refusée', 'error');
      return;
    }
    
    addLog('Permissions granted, checking if already exists...');
    
    // Now check if already registered
    getJiraInstances().then(async (instances) => {
      const existing = instances.find(i => i.baseUrl === baseUrl);
      
      if (existing) {
        addLog(`Already activated: ${baseUrl}`, 'warn');
        showToast('Déjà activé', 'error');
        return;
      }
      
      addLog(`Verifying Jira instance: ${baseUrl}`);
      // Verify it's a Jira instance
      try {
        const isJira = await verifyJiraInstance(baseUrl);
        
        const instance = {
          baseUrl,
          enabled: true,
          verified: isJira,
          addedAt: Date.now()
        };
        
        addLog(`Adding instance: ${baseUrl}, verified: ${isJira}`);
        await saveJiraInstance(instance);
        await loadJiraInstances();
        await loadCurrentTabState();
        
        // Update background service worker
        chrome.runtime.sendMessage({ 
          type: 'ADD_JIRA_INSTANCE', 
          instance 
        });
        
        if (isJira) {
          showToast('Site activé !', 'success');
          addLog(`SUCCESS: Jira site activated: ${baseUrl}`);
        } else {
          showToast('Site ajouté (vérification nécessaire)', 'success');
          addLog(`SUCCESS: Site added, verification needed: ${baseUrl}`);
        }
      } catch (error) {
        addLog(`Error after permissions: ${error.message}`, 'error');
        showToast('Erreur lors de l\'activation', 'error');
      }
    }).catch(error => {
      addLog(`Error checking instances: ${error.message}`, 'error');
      showToast('Erreur de vérification', 'error');
    });
  });
});

// Handle deactivate current instance
async function handleDeactivateCurrentInstance() {
  addLog('Deactivate button clicked');
  
  if (!currentInstance) {
    addLog('No current instance to deactivate', 'error');
    showToast('Aucune instance active', 'error');
    return;
  }

  try {
    await chrome.permissions.remove({
      origins: [`${currentInstance.baseUrl}/*`]
    });
    
    await removeJiraInstance(currentInstance.baseUrl);
    await loadJiraInstances();
    await loadCurrentTabState();
    
    // Notify background
    chrome.runtime.sendMessage({ 
      type: 'REMOVE_JIRA_INSTANCE', 
      baseUrl: currentInstance.baseUrl 
    });
    
    addLog(`Deactivated: ${currentInstance.baseUrl}`);
    showToast('Site désactivé', 'success');
  } catch (error) {
    addLog(`Error deactivating: ${error.message}`, 'error');
    showToast('Erreur lors de la désactivation', 'error');
  }
}

// Remove instance (called from inline event handler)
async function removeInstance(baseUrl) {
  addLog(`Removing instance: ${baseUrl}`);
  
  try {
    await chrome.permissions.remove({
      origins: [`${baseUrl}/*`]
    });
    
    await removeJiraInstance(baseUrl);
    await loadJiraInstances();
    
    // Notify background
    chrome.runtime.sendMessage({ 
      type: 'REMOVE_JIRA_INSTANCE', 
      baseUrl 
    });
    
    if (currentInstance && currentInstance.baseUrl === baseUrl) {
      currentInstance = null;
      await loadCurrentTabState();
    }
    
    addLog(`Instance removed: ${baseUrl}`);
    showToast('Instance supprimée', 'success');
  } catch (error) {
    addLog(`Error removing instance: ${error.message}`, 'error');
    showToast('Erreur lors de la suppression', 'error');
  }
}

// Test instance connection (called from inline event handler)
async function testInstanceConnection(baseUrl) {
  addLog(`Testing connection to: ${baseUrl}`);
  
  // Get the button that was clicked
  const testBtn = document.querySelector(`button[onclick*="testInstanceConnection('${baseUrl.replace(/'/g, "\\'")}'")"]`);
  const originalText = testBtn ? testBtn.textContent : 'Test';
  
  if (testBtn) {
    testBtn.textContent = '...';
    testBtn.disabled = true;
  }
  
  try {
    addLog(`Sending verification request to ${baseUrl}/rest/api/2/serverInfo`);
    const isValid = await verifyJiraInstance(baseUrl);
    
    if (isValid) {
      addLog(`Connection valid for ${baseUrl}`, 'success');
      showToast('Connexion valide ✓', 'success');
    } else {
      addLog(`Connection failed or not Jira: ${baseUrl}`, 'warn');
      showToast('Connexion échouée ou non-Jira', 'warn');
    }
  } catch (error) {
    addLog(`Error testing connection: ${error.message}`, 'error');
    showToast(`Erreur: ${error.message}`, 'error');
  } finally {
    if (testBtn) {
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }
}

// Handle test connection
async function handleTestConnection() {
  addLog('Test connection button clicked');
  
  if (!currentInstance) {
    addLog('No current instance to test', 'error');
    showToast('Aucune instance active', 'error');
    return;
  }
  
  await testInstanceConnection(currentInstance.baseUrl);
}

// Handle clear cache
async function handleClearCache() {
  addLog('Clear cache button clicked');
  
  try {
    const count = await clearAllCache();
    showToast(`Cache vidé (${count} entrées)`, 'success');
    addLog(`Cache cleared: ${count} entries`);
  } catch (error) {
    addLog(`Error clearing cache: ${error.message}`, 'error');
    showToast('Erreur lors du vidage', 'error');
  }
}

// Handle reset stats
async function handleResetStats() {
  addLog('Reset stats button clicked');
  
  try {
    await resetStats();
    await loadStats();
    showToast('Statistiques réinitialisées', 'success');
    addLog('Stats reset');
  } catch (error) {
    addLog(`Error resetting stats: ${error.message}`, 'error');
    showToast('Erreur lors de la réinitialisation', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  addLog('Setting up event listeners');
  
  // Deactivate current instance
  deactivateBtn.addEventListener('click', handleDeactivateCurrentInstance);
  
  // Clear cache
  clearCacheBtn.addEventListener('click', handleClearCache);
  
  // Reset stats
  resetStatsBtn.addEventListener('click', handleResetStats);
  
  // Test connection
  testConnectionBtn.addEventListener('click', handleTestConnection);
  
  // Window focus - refresh state when popup is reopened
  window.addEventListener('focus', async () => {
    addLog('Window focused, reloading state');
    await loadCurrentTabState();
    await loadJiraInstances();
    await loadStats();
  });
  
  // Setup logs modal
  setupLogsModal();
}

// Setup logs modal
function setupLogsModal() {
  addLog('Setting up logs modal');
  
  const infoLink = document.getElementById('info-link');
  const logsModal = document.getElementById('logs-modal');
  const closeLogs = document.getElementById('close-logs');
  const clearLogsBtn = document.getElementById('clear-logs');
  const downloadLogsBtn = document.getElementById('download-logs');
  
  if (infoLink) {
    infoLink.addEventListener('click', (e) => {
      addLog('Info/Logs link clicked');
      e.preventDefault();
      if (logsModal) {
        logsModal.style.display = 'flex';
        updateLogsDisplay();
      }
    });
  }
  
  if (closeLogs) {
    closeLogs.addEventListener('click', () => {
      addLog('Close logs button clicked');
      if (logsModal) logsModal.style.display = 'none';
    });
  }
  
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      addLog('Clear logs button clicked');
      ecoJiraLogs = [];
      updateLogsDisplay();
      addLog('Logs cleared', 'info');
    });
  }
  
  if (downloadLogsBtn) {
    downloadLogsBtn.addEventListener('click', () => {
      addLog('Download logs button clicked');
      const blob = new Blob([ecoJiraLogs.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eco-jira-logs-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('Logs downloaded', 'info');
    });
  }
  
  // Close modal on outside click
  if (logsModal) {
    logsModal.addEventListener('click', (e) => {
      if (e.target === logsModal) {
        addLog('Modal outside click, closing');
        logsModal.style.display = 'none';
      }
    });
  }
}

// Initialize popup
async function init() {
  addLog('Initializing popup...');
  
  try {
    await loadCurrentTabState();
    await loadJiraInstances();
    await loadStats();
    setupEventListeners();
    addLog('Popup initialized successfully');
  } catch (error) {
    addLog(`Error during initialization: ${error.message}`, 'error');
    updateStatus('error', 'Erreur', 'Impossible d\'initialiser');
  }
}

// Make functions available for inline event handlers
window.removeInstance = removeInstance;
window.testInstanceConnection = testInstanceConnection;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
