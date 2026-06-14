// ==========================================================================
// Renderer Process Logic (NotebookLM Desktop Shell)
// ==========================================================================

// Application State
let state = {
  profiles: [],
  activeProfile: null,
  tabs: [],
  activeTabId: null,
  maxTabs: 4
};

// DOM Elements Cache
const DOM = {
  // Window controls
  winMinBtn: document.getElementById('win-min-btn'),
  winMaxBtn: document.getElementById('win-max-btn'),
  winCloseBtn: document.getElementById('win-close-btn'),
  maxIcon: document.getElementById('max-icon'),
  restoreIcon: document.getElementById('restore-icon'),

  // Header & Tabs
  tabStrip: document.getElementById('tab-strip'),
  addTabBtn: document.getElementById('add-tab-btn'),
  activeProfileName: document.getElementById('active-profile-name'),
  profileBtn: document.getElementById('profile-btn'),
  profileMenu: document.getElementById('profile-menu'),
  profilesList: document.getElementById('profiles-list'),
  manageProfilesBtn: document.getElementById('manage-profiles-btn'),
  logoutBtn: document.getElementById('logout-btn'),

  // Navigation
  navBackBtn: document.getElementById('nav-back-btn'),
  navForwardBtn: document.getElementById('nav-forward-btn'),
  navReloadBtn: document.getElementById('nav-reload-btn'),
  reloadSvg: document.getElementById('reload-svg'),
  stopSvg: document.getElementById('stop-svg'),
  addressInput: document.getElementById('address-input'),

  // Utilities
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomText: document.getElementById('zoom-text'),

  // Workspace
  webviewContainer: document.getElementById('webview-container'),
  appLoadingScreen: document.getElementById('app-loading-screen'),

  // Profiles Modal
  profilesModal: document.getElementById('profiles-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  createProfileForm: document.getElementById('create-profile-form'),
  newProfileName: document.getElementById('new-profile-name'),
  modalProfilesList: document.getElementById('modal-profiles-list')
};

// User Agent matching Firefox on Windows (bypasses Google Sign-In secure browser blocks)
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0';

// Initialize App
async function init() {
  setupWindowControls();
  setupNavigationControls();
  setupProfileMenu();
  setupKeyboardShortcuts();
  
  // Load Profiles
  await loadProfiles();
}

// ==========================================================================
// Window Frame Controls
// ==========================================================================
function setupWindowControls() {
  DOM.winMinBtn.addEventListener('click', () => window.electronAPI.minimize());
  DOM.winMaxBtn.addEventListener('click', () => window.electronAPI.maximize());
  DOM.winCloseBtn.addEventListener('click', () => window.electronAPI.close());

  // Listen for maximize change events from main process
  window.electronAPI.onMaximizedChange((isMaximized) => {
    toggleMaximizeIcon(isMaximized);
  });

  // Check initial maximized state
  window.electronAPI.isMaximized().then(toggleMaximizeIcon);
}

function toggleMaximizeIcon(isMaximized) {
  if (isMaximized) {
    DOM.maxIcon.classList.add('hidden');
    DOM.restoreIcon.classList.remove('hidden');
  } else {
    DOM.maxIcon.classList.remove('hidden');
    DOM.restoreIcon.classList.add('hidden');
  }
}

// ==========================================================================
// Profile Management
// ==========================================================================
async function loadProfiles() {
  state.profiles = await window.electronAPI.getProfiles();
  
  // Find active profile
  state.activeProfile = state.profiles.find(p => p.active) || state.profiles[0];
  if (!state.activeProfile) {
    state.activeProfile = { id: 'default', name: 'Perfil Principal', partition: 'persist:default', active: true };
    state.profiles = [state.activeProfile];
    await window.electronAPI.saveProfiles(state.profiles);
  }

  // Update profile button name
  DOM.activeProfileName.textContent = state.activeProfile.name;
  
  // Render dropdown profiles list
  renderProfilesDropdown();

  // Load tabs for the active profile
  loadProfileTabs();
}

function renderProfilesDropdown() {
  DOM.profilesList.innerHTML = '';
  state.profiles.forEach(profile => {
    const btn = document.createElement('button');
    btn.className = `dropdown-item ${profile.id === state.activeProfile.id ? 'active' : ''}`;
    btn.innerHTML = `
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span>${escapeHtml(profile.name)}</span>
    `;
    
    if (profile.id !== state.activeProfile.id) {
      btn.addEventListener('click', () => switchProfile(profile.id));
    }
    DOM.profilesList.appendChild(btn);
  });
}

function setupProfileMenu() {
  // Toggle profile menu
  DOM.profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.profileMenu.classList.toggle('show');
  });

  // Close profile menu on clicking outside
  document.addEventListener('click', () => {
    DOM.profileMenu.classList.remove('show');
  });

  DOM.profileMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Manage profiles button click
  DOM.manageProfilesBtn.addEventListener('click', () => {
    DOM.profileMenu.classList.remove('show');
    openProfilesModal();
  });

  // Logout / Reset session data
  DOM.logoutBtn.addEventListener('click', async () => {
    if (confirm(`¿Estás seguro de que quieres cerrar la sesión de Google en el perfil "${state.activeProfile.name}"? Se cerrarán todas las pestañas de este perfil y se borrarán tus credenciales de este entorno.`)) {
      DOM.profileMenu.classList.remove('show');
      DOM.appLoadingScreen.classList.remove('hidden');
      
      // Clear session storage on main process
      await window.electronAPI.clearSessionData(state.activeProfile.partition);
      
      // Reload the active profile (re-creates tabs starting fresh)
      loadProfileTabs();
    }
  });

  // Manage Profiles Modal Controls
  DOM.closeModalBtn.addEventListener('click', closeProfilesModal);
  DOM.profilesModal.addEventListener('click', (e) => {
    if (e.target === DOM.profilesModal) closeProfilesModal();
  });

  DOM.createProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = DOM.newProfileName.value.trim();
    if (!name) return;

    const id = 'profile_' + Date.now();
    const newProfile = {
      id: id,
      name: name,
      partition: `persist:${id}`,
      active: false
    };

    state.profiles.push(newProfile);
    await window.electronAPI.saveProfiles(state.profiles);
    
    DOM.newProfileName.value = '';
    renderModalProfilesList();
    renderProfilesDropdown();
    
    // Switch to new profile immediately
    switchProfile(id);
    closeProfilesModal();
  });
}

async function switchProfile(profileId) {
  DOM.appLoadingScreen.classList.remove('hidden');
  
  // Set active flag in state
  state.profiles.forEach(p => {
    p.active = (p.id === profileId);
  });
  
  await window.electronAPI.saveProfiles(state.profiles);
  state.activeProfile = state.profiles.find(p => p.id === profileId);
  
  // Update header UI
  DOM.activeProfileName.textContent = state.activeProfile.name;
  renderProfilesDropdown();
  
  // Reload tabs
  loadProfileTabs();
}

function openProfilesModal() {
  renderModalProfilesList();
  DOM.profilesModal.classList.remove('hidden');
}

function closeProfilesModal() {
  DOM.profilesModal.classList.add('hidden');
}

function renderModalProfilesList() {
  DOM.modalProfilesList.innerHTML = '';
  state.profiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = 'modal-profile-card';
    
    const isActive = profile.id === state.activeProfile.id;
    
    card.innerHTML = `
      <div class="modal-profile-info">
        <div class="modal-profile-avatar">
          ${escapeHtml(profile.name.charAt(0).toUpperCase())}
        </div>
        <div class="modal-profile-details">
          <span class="modal-profile-name">${escapeHtml(profile.name)}</span>
          ${isActive ? '<span class="modal-profile-tag">Activo</span>' : ''}
        </div>
      </div>
      <div class="modal-profile-actions">
        ${!isActive ? `
          <button class="btn btn-danger btn-sm" onclick="deleteProfile('${profile.id}')">Eliminar</button>
        ` : ''}
      </div>
    `;
    DOM.modalProfilesList.appendChild(card);
  });
}

// Exposed globally to window for onclick handlers in modal list
window.deleteProfile = async function(profileId) {
  const profileToDelete = state.profiles.find(p => p.id === profileId);
  if (!profileToDelete) return;

  if (confirm(`¿Estás seguro de que quieres eliminar el perfil "${profileToDelete.name}"? Se perderán todas las sesiones y credenciales de este perfil.`)) {
    state.profiles = state.profiles.filter(p => p.id !== profileId);
    
    // Clear the session data from main process to free up disk space
    await window.electronAPI.clearSessionData(profileToDelete.partition);
    await window.electronAPI.saveProfiles(state.profiles);
    
    renderModalProfilesList();
    renderProfilesDropdown();
  }
};

// ==========================================================================
// Tabs & WebView Management
// ==========================================================================
function loadProfileTabs() {
  // Clear existing tabs
  state.tabs.forEach(tab => {
    if (tab.webview) {
      tab.webview.remove();
    }
    const tabEl = document.getElementById(`tab-btn-${tab.id}`);
    if (tabEl) tabEl.remove();
  });
  
  state.tabs = [];
  state.activeTabId = null;
  DOM.webviewContainer.querySelectorAll('webview').forEach(el => el.remove());

  // Show loading screen
  DOM.appLoadingScreen.classList.remove('hidden');

  // Spawn 3 tabs by default for NotebookLM (all logged into the same account session)
  createTab('https://notebooklm.google.com');
  createTab('https://notebooklm.google.com');
  createTab('https://notebooklm.google.com');

  // Select first tab
  if (state.tabs.length > 0) {
    selectTab(state.tabs[0].id);
  }
  
  // Update UI Add Button disabled state
  updateAddTabButtonState();
}

function createTab(url = 'https://notebooklm.google.com') {
  if (state.tabs.length >= state.maxTabs) return;

  const tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // 1. Create Tab element in top header
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.id = `tab-btn-${tabId}`;
  tabEl.setAttribute('draggable', 'false');
  tabEl.innerHTML = `
    <span class="tab-title">Cargando...</span>
    <button class="tab-close-btn" title="Cerrar pestaña (Ctrl+W)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  
  // Close Tab button event handler
  const closeBtn = tabEl.querySelector('.tab-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });

  // Select Tab event handler
  tabEl.addEventListener('click', () => {
    selectTab(tabId);
  });

  DOM.tabStrip.appendChild(tabEl);

  // 2. Create Webview element in workspace
  const webview = document.createElement('webview');
  webview.id = `webview-${tabId}`;
  webview.setAttribute('src', url);
  webview.setAttribute('partition', state.activeProfile.partition);
  webview.setAttribute('useragent', USER_AGENT); // Bypasses Google Sign-In checks
  webview.setAttribute('allowpopups', '');
  
  DOM.webviewContainer.appendChild(webview);

  const tabObj = {
    id: tabId,
    webview: webview,
    title: 'Nuevo Cuaderno',
    zoomLevel: 1.0,
    isLoading: true,
    canGoBack: false,
    canGoForward: false
  };

  state.tabs.push(tabObj);

  // 3. Register WebView events
  setupWebviewEvents(tabObj);

  updateAddTabButtonState();
  return tabObj;
}

function setupWebviewEvents(tab) {
  const { webview, id } = tab;

  // Intercept links inside webview to keep application locked to NotebookLM
  webview.addEventListener('will-navigate', (e) => {
    const url = e.url;
    if (!isAllowedUrl(url)) {
      webview.stop(); // Stop webview navigation
      window.electronAPI.openExternal(url); // Open in default OS browser
    }
  });

  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    const url = e.url;
    if (url.startsWith('https://notebooklm.google.com') || url.startsWith('https://notebooklm.google')) {
      // If it's a NotebookLM URL, open a new tab internally
      const newTab = createTab(url);
      if (newTab) selectTab(newTab.id);
    } else {
      // Otherwise, open in user's default external browser (e.g. Chrome, Edge)
      window.electronAPI.openExternal(url);
    }
  });

  // Track navigation states to disable/enable back/forward buttons
  const updateNavState = () => {
    try {
      tab.canGoBack = webview.canGoBack();
      tab.canGoForward = webview.canGoForward();
    } catch (e) {
      // Webview might not be fully initialized or crashed
    }

    if (id === state.activeTabId) {
      updateNavButtonsUI();
    }
  };

  webview.addEventListener('did-navigate', (e) => {
    updateNavState();
    if (id === state.activeTabId) {
      DOM.addressInput.textContent = e.url;
    }
  });

  webview.addEventListener('did-navigate-in-page', () => {
    updateNavState();
  });

  // Spinner / Loading status
  webview.addEventListener('did-start-loading', () => {
    tab.isLoading = true;
    updateTabTitleUI(tab, 'Cargando...');
    if (id === state.activeTabId) {
      DOM.reloadSvg.classList.add('hidden');
      DOM.stopSvg.classList.remove('hidden');
    }
  });

  webview.addEventListener('did-stop-loading', () => {
    tab.isLoading = false;
    updateNavState();
    
    // Hide overlay loader once the active webview is loaded
    if (id === state.activeTabId) {
      DOM.appLoadingScreen.classList.add('hidden');
      DOM.reloadSvg.classList.remove('hidden');
      DOM.stopSvg.classList.add('hidden');
      DOM.addressInput.textContent = webview.getURL();
    }
  });

  // Webview Title
  webview.addEventListener('page-title-updated', (e) => {
    let cleanTitle = e.title;
    // Clean NotebookLM title templates
    if (cleanTitle.endsWith(' - NotebookLM')) {
      cleanTitle = cleanTitle.substring(0, cleanTitle.length - 13);
    }
    if (cleanTitle.toLowerCase() === 'notebooklm') {
      cleanTitle = 'Cuaderno';
    }
    tab.title = cleanTitle;
    updateTabTitleUI(tab, cleanTitle);
  });

  // Handle zoom on first load
  webview.addEventListener('dom-ready', () => {
    webview.setZoomFactor(tab.zoomLevel);
    updateNavState();
  });
}

function updateTabTitleUI(tab, title) {
  const tabEl = document.getElementById(`tab-btn-${tab.id}`);
  if (tabEl) {
    const titleEl = tabEl.querySelector('.tab-title');
    if (titleEl) titleEl.textContent = title;
  }
}

function selectTab(tabId) {
  if (state.activeTabId === tabId) return;

  // Unselect old active tab
  const oldActiveTab = state.tabs.find(t => t.id === state.activeTabId);
  if (oldActiveTab) {
    const oldBtn = document.getElementById(`tab-btn-${oldActiveTab.id}`);
    if (oldBtn) oldBtn.classList.remove('active');
    if (oldActiveTab.webview) oldActiveTab.webview.classList.remove('active');
  }

  // Set new active tab
  state.activeTabId = tabId;
  const newActiveTab = state.tabs.find(t => t.id === tabId);
  if (newActiveTab) {
    const newBtn = document.getElementById(`tab-btn-${tabId}`);
    if (newBtn) newBtn.classList.add('active');
    if (newActiveTab.webview) newActiveTab.webview.classList.add('active');
    
    // Focus active webview so user can type immediately
    setTimeout(() => {
      try {
        newActiveTab.webview.focus();
      } catch (err) {}
    }, 50);

    // Apply active tab settings to main shell UI
    updateNavButtonsUI();
    updateZoomUI();
    
    // Update loading screen
    if (newActiveTab.isLoading) {
      DOM.appLoadingScreen.classList.remove('hidden');
      DOM.reloadSvg.classList.add('hidden');
      DOM.stopSvg.classList.remove('hidden');
      DOM.addressInput.textContent = 'https://notebooklm.google.com';
    } else {
      DOM.appLoadingScreen.classList.add('hidden');
      DOM.reloadSvg.classList.remove('hidden');
      DOM.stopSvg.classList.add('hidden');
      try {
        DOM.addressInput.textContent = newActiveTab.webview.getURL();
      } catch (e) {
        DOM.addressInput.textContent = 'https://notebooklm.google.com';
      }
    }
  }
}

function closeTab(tabId) {
  // Prevent closing the last remaining tab
  if (state.tabs.length <= 1) {
    // Just reload it back to NotebookLM home if it's the only one
    const activeTab = state.tabs[0];
    if (activeTab && activeTab.webview) {
      activeTab.webview.loadURL('https://notebooklm.google.com');
    }
    return;
  }

  const tabIndex = state.tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const tabToRemove = state.tabs[tabIndex];

  // If we closed the active tab, select a neighboring tab
  if (state.activeTabId === tabId) {
    const nextActiveIndex = (tabIndex === 0) ? 1 : tabIndex - 1;
    selectTab(state.tabs[nextActiveIndex].id);
  }

  // Remove elements from DOM
  if (tabToRemove.webview) {
    tabToRemove.webview.remove();
  }
  const btnEl = document.getElementById(`tab-btn-${tabId}`);
  if (btnEl) btnEl.remove();

  // Remove from state array
  state.tabs = state.tabs.filter(t => t.id !== tabId);

  updateAddTabButtonState();
}

function updateAddTabButtonState() {
  if (state.tabs.length >= state.maxTabs) {
    DOM.addTabBtn.setAttribute('disabled', 'true');
    DOM.addTabBtn.setAttribute('title', `Límite de pestañas alcanzado (${state.maxTabs})`);
  } else {
    DOM.addTabBtn.removeAttribute('disabled');
    DOM.addTabBtn.setAttribute('title', 'Nueva Pestaña (Ctrl+T)');
  }
}

// ==========================================================================
// Navigation & Utilities Controls
// ==========================================================================
function setupNavigationControls() {
  // Back
  DOM.navBackBtn.addEventListener('click', () => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.canGoBack) {
      activeTab.webview.goBack();
    }
  });

  // Forward
  DOM.navForwardBtn.addEventListener('click', () => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.canGoForward) {
      activeTab.webview.goForward();
    }
  });

  // Reload / Stop Loading
  DOM.navReloadBtn.addEventListener('click', () => {
    const activeTab = getActiveTab();
    if (activeTab) {
      if (activeTab.isLoading) {
        activeTab.webview.stop();
      } else {
        activeTab.webview.reload();
      }
    }
  });

  // Add tab button
  DOM.addTabBtn.addEventListener('click', () => {
    const newTab = createTab();
    if (newTab) selectTab(newTab.id);
  });

  // Zoom In
  DOM.zoomInBtn.addEventListener('click', () => adjustZoom(0.1));
  
  // Zoom Out
  DOM.zoomOutBtn.addEventListener('click', () => adjustZoom(-0.1));

  // Reset Zoom
  DOM.zoomText.addEventListener('click', () => {
    const activeTab = getActiveTab();
    if (activeTab) {
      activeTab.zoomLevel = 1.0;
      activeTab.webview.setZoomFactor(1.0);
      updateZoomUI();
    }
  });
}

// Helper to get active tab
function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTabId);
}

function updateNavButtonsUI() {
  const activeTab = getActiveTab();
  if (activeTab) {
    DOM.navBackBtn.disabled = !activeTab.canGoBack;
    DOM.navForwardBtn.disabled = !activeTab.canGoForward;
  } else {
    DOM.navBackBtn.disabled = true;
    DOM.navForwardBtn.disabled = true;
  }
}

function adjustZoom(delta) {
  const activeTab = getActiveTab();
  if (activeTab) {
    let currentZoom = activeTab.zoomLevel;
    let newZoom = Math.max(0.5, Math.min(2.0, currentZoom + delta));
    
    // Round to avoid precision issues
    newZoom = Math.round(newZoom * 10) / 10;
    
    activeTab.zoomLevel = newZoom;
    activeTab.webview.setZoomFactor(newZoom);
    updateZoomUI();
  }
}

function updateZoomUI() {
  const activeTab = getActiveTab();
  if (activeTab) {
    DOM.zoomText.textContent = `${Math.round(activeTab.zoomLevel * 100)}%`;
  }
}

// ==========================================================================
// Keyboard Shortcuts
// ==========================================================================
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl + T: New Tab
    if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      const newTab = createTab();
      if (newTab) selectTab(newTab.id);
    }

    // Ctrl + W: Close Active Tab
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (state.activeTabId) {
        closeTab(state.activeTabId);
      }
    }

    // Ctrl + R: Reload
    if (e.ctrlKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      const activeTab = getActiveTab();
      if (activeTab) activeTab.webview.reload();
    }

    // Ctrl + Tab: Switch to next tab
    if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      switchNextTab();
    }

    // Ctrl + Shift + Tab: Switch to previous tab
    if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      switchPrevTab();
    }

    // Ctrl + "=" or Ctrl + "+": Zoom In
    if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      adjustZoom(0.1);
    }

    // Ctrl + "-": Zoom Out
    if (e.ctrlKey && e.key === '-') {
      e.preventDefault();
      adjustZoom(-0.1);
    }

    // Ctrl + "0": Reset Zoom
    if (e.ctrlKey && e.key === '0') {
      e.preventDefault();
      const activeTab = getActiveTab();
      if (activeTab) {
        activeTab.zoomLevel = 1.0;
        activeTab.webview.setZoomFactor(1.0);
        updateZoomUI();
      }
    }
  });
}

function switchNextTab() {
  if (state.tabs.length <= 1) return;
  const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
  const nextIndex = (currentIndex + 1) % state.tabs.length;
  selectTab(state.tabs[nextIndex].id);
}

function switchPrevTab() {
  if (state.tabs.length <= 1) return;
  const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
  const prevIndex = (currentIndex - 1 + state.tabs.length) % state.tabs.length;
  selectTab(state.tabs[prevIndex].id);
}

// ==========================================================================
// Helpers & Utilities
// ==========================================================================
function isAllowedUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname;
    return (
      host.endsWith('notebooklm.google.com') ||
      host.endsWith('notebooklm.google') ||
      host.endsWith('accounts.google.com') ||
      host.endsWith('accounts.google.es') ||
      host.includes('google-analytics') ||
      host === 'accounts.google' ||
      host.endsWith('ssl.gstatic.com') ||
      host.endsWith('apis.google.com') ||
      host.endsWith('gstatic.com') ||
      host.endsWith('googleusercontent.com')
    );
  } catch (err) {
    return false;
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Kickstart the App
init();
