const { app, BrowserWindow, Notification, ipcMain, Tray, Menu, nativeImage, globalShortcut, dialog } = require('electron');

let store;
let tray;
let mainWindow;

async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({
    name: 'pomodoro-data',
    defaults: {
      sessions: [],
      settings: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15
      }
    }
  });
}

function createTray() {
  const iconPath = __dirname + '/icons/icon.jpg';
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '开始',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-start');
        }
      }
    },
    {
      label: '暂停',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-pause');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('番茄钟');
  tray.setContextMenu(contextMenu);

  // Click to show window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  const iconPath = __dirname + '/icons/icon.jpg';
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 400,
    height: 520,
    minWidth: 340,
    minHeight: 480,
    resizable: true,
    center: true,
    backgroundColor: '#1a1a2e',
    icon: icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.js'
    }
  });

  mainWindow.loadFile('index.html');

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(async () => {
  await initStore();
  createWindow();
  createTray();

  // 注册全局快捷键 Ctrl+Shift+P 开始/暂停
  const ret = globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-toggle');
    }
  });
  if (!ret) {
    console.log('快捷键注册失败');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers for storage
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-get-all', () => {
  return store.store;
});

ipcMain.handle('session-add', (event, session) => {
  const sessions = store.get('sessions', []);
  sessions.push(session);
  store.set('sessions', sessions);
  return sessions.length;
});

ipcMain.handle('save-image', async (event, dataUrl) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '保存专注卡片',
    defaultPath: `focus-card-${Date.now()}.png`,
    filters: [{ name: 'Images', extensions: ['png'] }]
  });

  if (filePath) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const fs = require('fs');
    fs.writeFileSync(filePath, base64Data, 'base64');
    return true;
  }
  return false;
});

function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      silent: false
    });
    notification.show();
  }
}

module.exports = { showNotification };