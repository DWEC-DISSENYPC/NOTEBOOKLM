const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0';

let mainWindow = null;

// Keep track of window state (position, dimensions, maximized state)
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
let windowState = {
  width: 1280,
  height: 800,
  x: undefined,
  y: undefined,
  isMaximized: false
};

// Load window state
try {
  if (fs.existsSync(stateFilePath)) {
    windowState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  }
} catch (err) {
  console.error('Error al cargar el estado de la ventana:', err);
}

// Intercept session creation to apply custom User-Agent and strip headers
app.on('session-created', (sess) => {
  sess.setUserAgent(USER_AGENT);
  sess.setSpellCheckerEnabled(true);

  // Strip headers identifying Electron/Webviews to bypass Google Sign-in blocks
  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = USER_AGENT;
    delete details.requestHeaders['X-Requested-With'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Frameless window for custom premium UI
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true // Allow <webview> tags for embedding NotebookLM
    },
    backgroundColor: '#121614', // Match NotebookLM dark background (dark slate green)
    show: false // Wait to show until ready-to-show
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Track window resizing and movement to persist state
  const saveState = () => {
    if (!mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      windowState.width = bounds.width;
      windowState.height = bounds.height;
      windowState.x = bounds.x;
      windowState.y = bounds.y;
      windowState.isMaximized = mainWindow.isMaximized();
      try {
        fs.writeFileSync(stateFilePath, JSON.stringify(windowState, null, 2), 'utf8');
      } catch (err) {
        console.error('Error al guardar el estado de la ventana:', err);
      }
    }
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);
  mainWindow.on('close', saveState);

  // Send window state events to renderer to update the maximize/restore button
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-change', false);
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC IPC Handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Profile management
const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
ipcMain.handle('get-profiles', () => {
  try {
    if (fs.existsSync(profilesPath)) {
      return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error al leer perfiles:', e);
  }
  // Default fallback profile list
  return [
    { id: 'default', name: 'Perfil Principal', partition: 'persist:default', active: true }
  ];
});

ipcMain.handle('save-profiles', (event, profiles) => {
  try {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error al guardar perfiles:', e);
    return false;
  }
});

// Clear session storage (Log out)
ipcMain.handle('clear-session-data', async (event, partitionName) => {
  try {
    const sess = session.fromPartition(partitionName);
    await sess.clearStorageData();
    return true;
  } catch (e) {
    console.error('Error al borrar sesión:', e);
    return false;
  }
});

// Open external URL in OS default browser
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (e) {
    console.error('Error al abrir URL externa:', e);
    return false;
  }
});
