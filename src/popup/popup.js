/**
 * Popup script for eco-jira
 * Uses message passing to background for storage operations
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

// Storage keys
const STORAGE_KEYS = {
  INSTANCES: 'jira_instances',
  STATS: 'eco_jira_stats'
};

// Message helper
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
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
  } catch (error) {
    console.error('Error updating extension icon:', error);
  }
}

// Load Jira instances
async function loadJiraInstances() {
  try {
    const response = await sendMessage({ type: 'GET_JIRA_INSTANCES' });
    const instances = response ? response.instances : [];
    
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
    console.error('Error loading instances:', error);
    instancesList.innerHTML = '<p class="empty-message">Erreur de chargement</p>';
  }
}

// Load statistics
async function loadStats() {
  try {
    const response = await sendMessage({ type: 'GET_STATS' });
    const stats = response ? response.stats : {};
    bytesSavedEl.textContent = formatBytes(stats.bytesSaved || 0);
    requestsSavedEl.textContent = (stats.requestsSaved || 0).toLocaleString();
    cacheHitsEl.textContent = (stats.cacheHits || 0).toLocaleString();
    cacheMissesEl.textContent = (stats.cacheMisses || 0).toLocaleString();
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load current tab state
async function loadCurrentTabState() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      currentTabUrl = tab.url;
      const response = await sendMessage({ type: 'GET_JIRA_INSTANCES' });
      const instances = response ? response.instances : [];
      
      const url = new URL(tab.url);
      const matchingInstance = instances.find(i => {
        try {
          const instanceUrl = new URL(i.baseUrl);
          return url.hostname === instanceUrl.hostname;
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
      } else if (isPotentialJiraUrl(url)) {
        updateStatus('inactive', 'Jira détecté', 'Non activé');
        activateBtn.style.display = 'inline-block';
        deactivateBtn.style.display = 'none';
        testConnectionBtn.style.display = 'none';
      } else {
        updateStatus('inactive', 'Site non-Jira', 'Seuls les sites Jira peuvent être activés');
        activateBtn.style.display = 'none';
        deactivateBtn.style.display = 'none';
        testConnectionBtn.style.display = 'none';
      }
      
      controlsSection.style.display = 'block';
    } else {
      updateStatus('error', 'Pas d\'onglet actif', '');
    }
  } catch (error) {
    console.error('Error loading tab state:', error);
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
}

// Check if URL looks like a Jira instance
function isPotentialJiraUrl(url) {
  // Check for Atlassian Cloud
  if (url.hostname.includes('atlassian.net')) return true;
  
  // Check for self-hosted Jira
  if (url.hostname.includes('jira') || url.hostname === 'localhost') return true;
  
  // Check for Jira in path
  if (url.pathname.includes('/jira') || url.pathname.includes('/jira/')) return true;
  
  return false;
}

// Verify Jira instance
async function verifyJiraInstance(baseUrl) {
  const response = await sendMessage({ type: 'VERIFY_JIRA', url: baseUrl });
  return response ? response.isValid : false;
}

// Handle activate current site - MUST be called from user input handler
activateBtn.addEventListener('click', function() {
  if (!currentTabUrl) {
    showToast('Aucun onglet actif', 'error');
    console.error('[eco-jira] No active tab');
    return;
  }

  const url = new URL(currentTabUrl);
  const baseUrl = `${url.protocol}//${url.hostname}`;
  
  console.log('[eco-jira] User clicked activate for:', baseUrl);
  console.log('[eco-jira] Requesting permissions (must be direct user gesture)...');
  
  // permissions.request MUST be called directly from user input handler
  // This is the ONLY way Chrome/Firefox will show the permission prompt
  chrome.permissions.request({
    origins: [`${baseUrl}/*`]
  }, function(granted) {
    console.log('[eco-jira] Permissions result:', granted);
    
    if (!granted) {
      console.error('[eco-jira] Permissions denied by user for:', baseUrl);
      showToast('Permission refusée', 'error');
      return;
    }
    
    console.log('[eco-jira] Permissions granted, checking if already exists...');
    
    // Now check if already registered
    sendMessage({ type: 'GET_JIRA_INSTANCES' }).then(async (response) => {
      const instances = response ? response.instances : [];
      const existing = instances.find(i => i.baseUrl === baseUrl);
      
      if (existing) {
        console.log('[eco-jira] Already activated:', baseUrl);
        showToast('Déjà activé', 'error');
        return;
      }
      
      // Verify it's a Jira instance
      try {
        const isJira = await verifyJiraInstance(baseUrl);
        
        const instance = {
          baseUrl,
          enabled: true,
          verified: isJira,
          addedAt: Date.now()
        };
        
        await sendMessage({ type: 'ADD_JIRA_INSTANCE', instance });
        await loadJiraInstances();
        await loadCurrentTabState();
        
        if (isJira) {
          showToast('Site activé !', 'success');
          console.log('[eco-jira] SUCCESS: Jira site activated:', baseUrl);
        } else {
          showToast('Site ajouté (vérification nécessaire)', 'success');
          console.log('[eco-jira] SUCCESS: Site added, verification needed:', baseUrl);
        }
      } catch (error) {
        console.error('[eco-jira] Error after permissions:', error);
        showToast('Erreur lors de l\'activation', 'error');
      }
    }).catch(error => {
      console.error('[eco-jira] Error checking instances:', error);
      showToast('Erreur de vérification', 'error');
    });
  });
});

// Handle deactivate current instance
async function handleDeactivateCurrentInstance() {
  if (!currentInstance) {
    showToast('Aucune instance active', 'error');
    return;
  }

  try {
    await chrome.permissions.remove({
      origins: [`${currentInstance.baseUrl}/*`]
    });
    
    await sendMessage({ type: 'REMOVE_JIRA_INSTANCE', baseUrl: currentInstance.baseUrl });
    await loadJiraInstances();
    await loadCurrentTabState();
    
    showToast('Site désactivé', 'success');
  } catch (error) {
    console.error('Error deactivating:', error);
    showToast('Erreur lors de la désactivation', 'error');
  }
}

// Remove instance
async function removeInstance(baseUrl) {
  try {
    await chrome.permissions.remove({
      origins: [`${baseUrl}/*`]
    });
    
    await sendMessage({ type: 'REMOVE_JIRA_INSTANCE', baseUrl });
    await loadJiraInstances();
    
    if (currentInstance && currentInstance.baseUrl === baseUrl) {
      currentInstance = null;
      await loadCurrentTabState();
    }
    
    showToast('Instance supprimée', 'success');
  } catch (error) {
    console.error('Error removing instance:', error);
    showToast('Erreur lors de la suppression', 'error');
  }
}

// Test instance connection
async function testInstanceConnection(baseUrl) {
  try {
    const isValid = await verifyJiraInstance(baseUrl);
    
    if (isValid) {
      showToast('Connexion valide ✓', 'success');
    } else {
      showToast('Connexion échouée ou non-Jira', 'error');
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    showToast('Erreur de test', 'error');
  }
}

// Handle test connection
async function handleTestConnection() {
  if (!currentInstance) {
    showToast('Aucune instance active', 'error');
    return;
  }
  
  await testInstanceConnection(currentInstance.baseUrl);
}

// Handle clear cache
async function handleClearCache() {
  try {
    await sendMessage({ type: 'CLEAR_CACHE' });
    showToast('Cache vidé', 'success');
  } catch (error) {
    console.error('Error clearing cache:', error);
    showToast('Erreur lors du vidage', 'error');
  }
}

// Handle reset stats
async function handleResetStats() {
  try {
    await sendMessage({ type: 'RESET_STATS' });
    await loadStats();
    showToast('Statistiques réinitialisées', 'success');
  } catch (error) {
    console.error('Error resetting stats:', error);
    showToast('Erreur lors de la réinitialisation', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Deactivate current instance
  deactivateBtn.addEventListener('click', handleDeactivateCurrentInstance);
  
  // Clear cache
  clearCacheBtn.addEventListener('click', handleClearCache);
  
  // Reset stats
  resetStatsBtn.addEventListener('click', handleResetStats);
  
  // Test connection
  testConnectionBtn.addEventListener('click', handleTestConnection);
  
  // Window focus - refresh state when popup is reopened
  window.addEventListener('focus', init);
}

// Initialize popup
async function init() {
  await loadCurrentTabState();
  await loadJiraInstances();
  await loadStats();
  setupEventListeners();
}

// Make functions available for inline event handlers
window.removeInstance = removeInstance;
window.testInstanceConnection = testInstanceConnection;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);
