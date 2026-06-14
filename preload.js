const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
  onMaximizedChange: (callback) => {
    const subscription = (event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-change', subscription);
    return () => ipcRenderer.removeListener('window-maximized-change', subscription);
  },

  // Profile management
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfiles: (profiles) => ipcRenderer.invoke('save-profiles'),

  // Session management
  clearSessionData: (partition) => ipcRenderer.invoke('clear-session-data', partition),

  // Web shell
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
