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

// 获取完整的系统环境变量
function getFullEnvironmentVariables() {
  const env = { ...process.env };
  
  // 在Windows上，尝试获取完整的PATH环境变量
  if (process.platform === 'win32') {
    try {
      // 使用reg命令获取系统和用户的PATH变量
      const { execSync } = require('child_process');
      
      // 获取系统PATH
      let systemPath = '';
      try {
        const systemPathCmd = 'reg query "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v PATH';
        const systemResult = execSync(systemPathCmd, { encoding: 'utf8', windowsHide: true });
        const systemMatch = systemResult.match(/PATH\s+REG_(?:EXPAND_)?SZ\s+(.+)/);
        if (systemMatch) {
          systemPath = systemMatch[1].trim();
        }
      } catch (e) {
        console.warn('无法获取系统PATH:', e.message);
      }
      
      // 获取用户PATH
      let userPath = '';
      try {
        const userPathCmd = 'reg query "HKEY_CURRENT_USER\\Environment" /v PATH';
        const userResult = execSync(userPathCmd, { encoding: 'utf8', windowsHide: true });
        const userMatch = userResult.match(/PATH\s+REG_(?:EXPAND_)?SZ\s+(.+)/);
        if (userMatch) {
          userPath = userMatch[1].trim();
        }
      } catch (e) {
        console.warn('无法获取用户PATH:', e.message);
      }
      
      // 组合完整的PATH
      const pathParts = [];
      if (systemPath) pathParts.push(systemPath);
      if (userPath) pathParts.push(userPath);
      if (env.PATH) pathParts.push(env.PATH);
      
      if (pathParts.length > 0) {
        env.PATH = pathParts.join(';');
      }
      
      // 展开环境变量（如%SystemRoot%等）
      if (env.PATH) {
        env.PATH = env.PATH.replace(/%([^%]+)%/g, (match, varName) => {
          return env[varName] || match;
        });
      }
      
    } catch (error) {
      console.warn('获取环境变量时出错:', error.message);
    }
  }
  
  return env;
}

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
    
    // 获取完整的环境变量
    const fullEnv = getFullEnvironmentVariables();
    
    const execOptions = {
      cwd: effectiveWorkingDir,
      env: fullEnv,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      encoding: 'utf8',
      timeout: 300000, // 5分钟超时
      windowsHide: true, // 在Windows上隐藏子进程窗口
      shell: true // 明确指定使用shell
    };
    
    // 在Windows上，确保使用正确的shell
    if (process.platform === 'win32') {
      // 使用系统默认的cmd.exe，并确保使用完整路径
      execOptions.shell = process.env.COMSPEC || 'cmd.exe';
    }
    
    // exec 会自动找到正确的 shell，无需手动指定路径
    const childProcess = exec(cleanCommand, execOptions, (error, stdout, stderr) => {
      if (error) {
        // 更详细的错误信息和诊断
        let errorMessage = error.message;
        let diagnosticInfo = '';
        
        if (error.code === 'ENOENT') {
          errorMessage = `命令未找到: ${cleanCommand}`;
          // 提供诊断信息
          const commandParts = cleanCommand.split(' ');
          const executable = commandParts[0];
          diagnosticInfo = `\n诊断信息:\n- 可执行文件: ${executable}\n- 当前工作目录: ${effectiveWorkingDir}\n- 建议: 检查 ${executable} 是否在 PATH 环境变量中，或使用完整路径`;
        } else if (error.code === 'EACCES') {
          errorMessage = `权限不足: ${cleanCommand}`;
          diagnosticInfo = `\n诊断信息:\n- 请检查文件执行权限\n- 尝试以管理员身份运行应用程序`;
        } else if (error.signal) {
          errorMessage = `命令被信号终止 (${error.signal}): ${cleanCommand}`;
        } else if (error.message.includes('is not recognized')) {
          // Windows特有的错误处理
          const commandParts = cleanCommand.split(' ');
          const executable = commandParts[0];
          errorMessage = `'${executable}' 不是内部或外部命令，也不是可运行的程序或批处理文件。`;
          diagnosticInfo = `\n诊断信息:\n- 可执行文件: ${executable}\n- 当前工作目录: ${effectiveWorkingDir}\n- PATH变量长度: ${fullEnv.PATH ? fullEnv.PATH.length : 0} 字符\n- 建议解决方案:\n  1. 确认 ${executable} 已正确安装\n  2. 将 ${executable} 的安装路径添加到系统 PATH 环境变量\n  3. 使用完整路径执行命令\n  4. 重启应用程序以刷新环境变量`;
        }
        
        resolve({
          success: false,
          error: errorMessage + diagnosticInfo,
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

