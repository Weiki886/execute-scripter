const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: isDev // 只在开发模式下启用开发者工具
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'default',
    autoHideMenuBar: true, // 自动隐藏菜单栏
    show: false,
    // 完全隐藏菜单栏（可选，如果需要更干净的界面）
    menuBarVisible: false
  });

  // 修改这里的URL加载逻辑
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 只在开发模式下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式下禁用右键菜单和快捷键打开开发者工具
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // 禁用F12和Ctrl+Shift+I等开发者工具快捷键
      if (input.key === 'F12' || 
          (input.control && input.shift && input.key === 'I') ||
          (input.control && input.shift && input.key === 'J')) {
        event.preventDefault();
      }
    });
    
    // 禁用右键菜单
    mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 完全移除应用程序菜单栏
  if (process.platform !== 'darwin') {
    // Windows和Linux平台完全移除菜单
    Menu.setApplicationMenu(null);
  } else {
    // macOS平台设置最小菜单（因为macOS要求有菜单）
    const template = [
      {
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for command execution
ipcMain.handle('execute-command', async (event, command, workingDir) => {
  return new Promise((resolve) => {
    // 使用 exec 而不是 spawn，它会自动处理 shell 路径问题
    const { exec } = require('child_process');
    
    // 清理命令，去除多余的空格和换行符
    const cleanCommand = command.trim();
    
    // 确保工作目录存在且有效
    let effectiveWorkingDir = workingDir || process.cwd();
    try {
      if (workingDir && !fs.existsSync(workingDir)) {
        // 如果指定的工作目录不存在，使用当前目录
        effectiveWorkingDir = process.cwd();
      }
    } catch (error) {
      effectiveWorkingDir = process.cwd();
    }
    
    const execOptions = {
      cwd: effectiveWorkingDir,
      env: { ...process.env },
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      encoding: 'utf8',
      timeout: 300000, // 5分钟超时
      windowsHide: true, // 在Windows上隐藏子进程窗口
      shell: true // 明确指定使用shell
    };
    
    // 在Windows上，确保使用正确的shell
    if (process.platform === 'win32') {
      execOptions.shell = 'cmd.exe';
    }
    
    // exec 会自动找到正确的 shell，无需手动指定路径
    const childProcess = exec(cleanCommand, execOptions, (error, stdout, stderr) => {
      if (error) {
        // 更详细的错误信息
        let errorMessage = error.message;
        if (error.code === 'ENOENT') {
          errorMessage = `命令未找到: ${cleanCommand}`;
        } else if (error.code === 'EACCES') {
          errorMessage = `权限不足: ${cleanCommand}`;
        } else if (error.signal) {
          errorMessage = `命令被信号终止 (${error.signal}): ${cleanCommand}`;
        }
        
        resolve({
          success: false,
          error: errorMessage,
          code: error.code,
          stdout: stdout || '',
          stderr: stderr || ''
        });
      } else {
        resolve({
          success: true,
          code: 0,
          stdout: stdout || '',
          stderr: stderr || ''
        });
      }
    });
    
    // 实时输出处理
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        event.sender.send('command-output', {
          type: 'stdout',
          data: data.toString()
        });
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        event.sender.send('command-output', {
          type: 'stderr',
          data: data.toString()
        });
      });
    }
    
    // 处理进程错误
    childProcess.on('error', (error) => {
      resolve({
        success: false,
        error: `进程错误: ${error.message}`,
        code: error.code || -1,
        stdout: '',
        stderr: ''
      });
    });
  });
});

// Shortcuts management
const shortcutsFile = path.join(os.homedir(), '.execute-scripter-shortcuts.json');

ipcMain.handle('save-shortcut', async (event, shortcut) => {
  try {
    let shortcuts = [];
    if (fs.existsSync(shortcutsFile)) {
      const data = fs.readFileSync(shortcutsFile, 'utf8');
      shortcuts = JSON.parse(data);
    }
    
    shortcuts.push({
      ...shortcut,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });
    
    fs.writeFileSync(shortcutsFile, JSON.stringify(shortcuts, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-shortcuts', async () => {
  try {
    if (fs.existsSync(shortcutsFile)) {
      const data = fs.readFileSync(shortcutsFile, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    return [];
  }
});

ipcMain.handle('delete-shortcut', async (event, id) => {
  try {
    if (fs.existsSync(shortcutsFile)) {
      const data = fs.readFileSync(shortcutsFile, 'utf8');
      let shortcuts = JSON.parse(data);
      shortcuts = shortcuts.filter(s => s.id !== id);
      fs.writeFileSync(shortcutsFile, JSON.stringify(shortcuts, null, 2));
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

