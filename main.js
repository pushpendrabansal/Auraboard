// Electron Main Process - macOS Native Integration
const { app, BrowserWindow, globalShortcut, Menu, Tray, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let tray;
app.isQuitting = false;

function positionWindow() {
    if (!mainWindow || !tray) return;

    const trayBounds = tray.getBounds();
    const windowBounds = mainWindow.getBounds();

    // Position window horizontally centered under the tray icon
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    
    // Position window vertically below the tray icon
    let y = Math.round(trayBounds.y + trayBounds.height + 4);

    // Ensure window does not go off-screen on the right or left
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    if (x + windowBounds.width > screenWidth) {
        x = screenWidth - windowBounds.width - 12; // 12px padding from screen edge
    }
    if (x < 12) {
        x = 12;
    }

    mainWindow.setPosition(x, y, false);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 360,
        height: 550,
        resizable: false,
        show: false,
        frame: false,
        alwaysOnTop: true,
        // Enable macOS native glassmorphic vibrancy
        vibrancy: 'under-window',
        visualEffectState: 'active',
        // Make window transparent to allow vibrancy to shine through
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // Preload script if we need secure bridge
        }
    });

    // Keep window on top of other workspaces and full-screen windows
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        positionWindow();
        mainWindow.show();
    });

    // Hide window when it loses focus (clicking outside)
    mainWindow.on('blur', () => {
        if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.hide();
        }
    });

    // Intercept close event to hide the window instead of quitting the application
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function toggleWindow() {
    if (!mainWindow) {
        createWindow();
        return;
    }

    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        positionWindow();
        mainWindow.show();
        mainWindow.focus();
    }
}


// System Tray / Menu Bar Integration
function createTray() {
    // Generate a 16x16 menu bar icon from our main app icon
    let trayIcon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));
    if (trayIcon.isEmpty()) {
        // Fallback placeholder if icon.png is missing
        trayIcon = nativeImage.createEmpty();
    } else {
        trayIcon = trayIcon.resize({ width: 18, height: 18 });
        trayIcon.setTemplateImage(true); // macOS automatically flips colors for dark/light mode
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('AuraBoard');

    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Show AuraBoard', 
            accelerator: 'Cmd+Option+V',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createWindow();
                }
            } 
        },
        { type: 'separator' },
        { 
            label: 'Preferences...', 
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                    // Send message to frontend to open preference modal
                    mainWindow.webContents.send('open-preferences');
                }
            } 
        },
        { type: 'separator' },
        { 
            label: 'Quit', 
            click: () => {
                app.isQuitting = true;
                app.quit();
            } 
        }
    ]);
    // Clicking the tray icon toggles the app window
    tray.on('click', () => {
        toggleWindow();
    });

    // Right-clicking the tray icon shows the context menu
    tray.on('right-click', () => {
        tray.popUpContextMenu(contextMenu);
    });
}

// Initialize Application
app.whenReady().then(() => {
    createWindow();
    createTray();

    // Handle Renderer exit call
    ipcMain.on('quit-app', () => {
        app.isQuitting = true;
        app.quit();
    });

    // Handle window resize from renderer while keeping the window centered under tray icon
    ipcMain.on('resize-window', (event, { width, height }) => {
        if (mainWindow && tray) {
            const trayBounds = tray.getBounds();
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth } = primaryDisplay.workAreaSize;

            let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (width / 2));
            if (x + width > screenWidth) {
                x = screenWidth - width - 12;
            }
            if (x < 12) {
                x = 12;
            }

            const [, y] = mainWindow.getPosition();
            mainWindow.setBounds({
                x: x,
                y: y,
                width: width,
                height: height
            });
        }
    });

    // Register Global Toggle Shortcut (Cmd + Option + V)
    const ret = globalShortcut.register('CommandOrControl+Option+V', () => {
        toggleWindow();
    });

    if (!ret) {
        console.warn('Global shortcut registration failed');
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });
});

app.on('will-quit', () => {
    // Unregister all shortcuts when exiting
    globalShortcut.unregisterAll();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
