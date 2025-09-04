import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Save,
  Delete,
  FolderOpen,
  Terminal,
  Bookmark,
  Clear,
  KeyboardArrowDown
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
  },
});

function App() {
  const [commands, setCommands] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [shortcuts, setShortcuts] = useState([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutDescription, setShortcutDescription] = useState('');
  const [currentWorkingDir, setCurrentWorkingDir] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef(null);

  // 监控输出变化，确保初始滚动状态正确
  useEffect(() => {
    if (outputRef.current && output) {
      // 当有新输出时，检查是否需要自动滚动
      const element = outputRef.current;
      if (autoScroll) {
        setTimeout(() => {
          element.scrollTop = element.scrollHeight;
        }, 50);
      }
    }
  }, [output, autoScroll]);

  useEffect(() => {
    loadShortcuts();
    // 监听命令输出
    const handleCommandOutput = (event, data) => {
      setOutput(prev => prev + data.data);
      // 自动滚动到底部（如果用户在底部或接近底部）
      setTimeout(() => {
        if (outputRef.current) {
          const element = outputRef.current;
          const wasNearBottom = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= 50;
          if (autoScroll || wasNearBottom) {
            element.scrollTop = element.scrollHeight;
            setAutoScroll(true);
          }
        }
      }, 100);
    };

    if (window.electronAPI) {
      window.electronAPI.onCommandOutput(handleCommandOutput);
      return () => {
        window.electronAPI.removeCommandOutputListener(handleCommandOutput);
      };
    }
  }, []);

  const loadShortcuts = async () => {
    if (window.electronAPI) {
      const loadedShortcuts = await window.electronAPI.loadShortcuts();
      setShortcuts(loadedShortcuts);
    }
  };

  // 处理用户滚动事件
  const handleOutputScroll = () => {
    if (outputRef.current) {
      const element = outputRef.current;
      const isAtBottom = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= 5;
      setAutoScroll(isAtBottom);
    }
  };

  const executeCommands = async () => {
    if (!commands.trim()) return;
    
    setIsExecuting(true);
    setOutput('');
    setAutoScroll(true); // 开始执行时重新启用自动滚动
    
    const commandLines = commands.split('\n').filter(line => line.trim());
    let workingDir = currentWorkingDir;
    
    for (let i = 0; i < commandLines.length; i++) {
      const command = commandLines[i].trim();
      if (!command) continue;
      
      setOutput(prev => prev + `> ${command}\n`);
      
      try {
        const result = await window.electronAPI.executeCommand(command, workingDir);
        
        // 检查是否是cd命令，更新工作目录
        if (command.toLowerCase().startsWith('cd ')) {
          const newDir = command.substring(3).trim();
          if (result.success) {
            workingDir = newDir;
            setCurrentWorkingDir(newDir);
          }
        }
        
        if (!result.success) {
          setOutput(prev => prev + `错误: ${result.error || result.stderr}\n`);
          break;
        }
      } catch (error) {
        setOutput(prev => prev + `执行错误: ${error.message}\n`);
        break;
      }
    }
    
    setIsExecuting(false);
  };

  const stopExecution = () => {
    setIsExecuting(false);
  };

  const saveShortcut = async () => {
    if (!shortcutName.trim() || !commands.trim()) return;
    
    const shortcut = {
      name: shortcutName,
      description: shortcutDescription,
      commands: commands,
      workingDir: currentWorkingDir
    };
    
    if (window.electronAPI) {
      const result = await window.electronAPI.saveShortcut(shortcut);
      if (result.success) {
        loadShortcuts();
        setSaveDialogOpen(false);
        setShortcutName('');
        setShortcutDescription('');
      }
    }
  };

  const loadShortcut = (shortcut) => {
    setCommands(shortcut.commands);
    setCurrentWorkingDir(shortcut.workingDir || '');
  };

  const deleteShortcut = async (id) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.deleteShortcut(id);
      if (result.success) {
        loadShortcuts();
      }
    }
  };



  const clearOutput = () => {
    setOutput('');
  };

  const scrollToBottom = () => {
    if (outputRef.current) {
      const element = outputRef.current;
      element.scrollTop = element.scrollHeight;
      setAutoScroll(true);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ height: '100vh', py: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* 左侧 - 命令输入和执行 */}
          <Grid item xs={9}>
            <Paper sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden' // 防止整个Paper滚动
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Terminal sx={{ mr: 1 }} />
                <Typography variant="h6">脚本执行器</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Chip 
                  icon={<FolderOpen />} 
                  label={currentWorkingDir || '当前目录'} 
                  variant="outlined" 
                  size="small"
                />
              </Box>
              
              <TextField
                multiline
                rows={6}
                fullWidth
                variant="outlined"
                placeholder="请输入要执行的命令，每行一个命令"
                value={commands}
                onChange={(e) => setCommands(e.target.value)}
                sx={{ 
                  mb: 2,
                  maxHeight: '160px', // 减少最大高度
                  '& .MuiInputBase-input': { 
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '14px'
                  },
                  '& .MuiInputBase-root': {
                    maxHeight: '160px'
                  }
                }}
              />
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isExecuting ? <CircularProgress size={16} /> : <PlayArrow />}
                  onClick={executeCommands}
                  disabled={isExecuting || !commands.trim()}
                >
                  {isExecuting ? '执行中...' : '执行命令'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Stop />}
                  onClick={stopExecution}
                  disabled={!isExecuting}
                >
                  停止
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={!commands.trim()}
                >
                  保存快捷方式
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={clearOutput}
                >
                  清空输出
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<KeyboardArrowDown />}
                  onClick={scrollToBottom}
                  disabled={autoScroll && output.length > 0}
                  title={autoScroll ? "已在底部" : "滚动到底部查看最新输出"}
                >
                  {autoScroll ? "已在底部" : "滚动到底部"}
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, flexShrink: 0 }}>执行输出：</Typography>
                <Paper 
                  ref={outputRef}
                  onScroll={handleOutputScroll}
                  sx={{ 
                    height: 'calc(100vh - 380px)', // 进一步增加高度
                    minHeight: '300px',
                    maxHeight: 'calc(100vh - 380px)', // 确保不超出
                    width: '100%',
                    p: 2, 
                    backgroundColor: '#f8f8f8', 
                    border: '1px solid #e0e0e0',
                    overflowY: 'auto', // 明确指定Y轴滚动
                    overflowX: 'hidden', // 隐藏X轴滚动
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    color: '#333333',
                    // 强制显示滚动条样式
                    scrollbarWidth: 'thin', // Firefox
                    scrollbarColor: '#c1c1c1 #f1f1f1', // Firefox
                    '&::-webkit-scrollbar': {
                      width: '12px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: '#f1f1f1',
                      borderRadius: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#c1c1c1',
                      borderRadius: '6px',
                      '&:hover': {
                        backgroundColor: '#a8a8a8',
                      }
                    }
                  }}
                >
                  {output || '等待执行命令...'}
                </Paper>
              </Box>
            </Paper>
          </Grid>
          
          {/* 右侧 - 快捷方式管理 */}
          <Grid item xs={3}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Bookmark sx={{ mr: 1 }} />
                <Typography variant="h6">快捷方式</Typography>
              </Box>
              
              {shortcuts.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  暂无保存的快捷方式
                </Alert>
              ) : (
                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {shortcuts.map((shortcut) => (
                    <React.Fragment key={shortcut.id}>
                      <ListItem 
                        button 
                        onClick={() => loadShortcut(shortcut)}
                        sx={{ 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: 1, 
                          mb: 1,
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        <ListItemText
                          primary={shortcut.name}
                          secondary={
                            <>
                              <span style={{ display: 'block', fontSize: '14px', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {shortcut.description}
                              </span>
                              <span style={{ display: 'block', fontSize: '12px', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {shortcut.commands.split('\n').length} 条命令
                              </span>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>

                          <IconButton 
                            edge="end" 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteShortcut(shortcut.id);
                            }}
                            size="small"
                            title="删除快捷方式"
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        {/* 保存快捷方式对话框 */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>保存快捷方式</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="快捷方式名称"
              fullWidth
              variant="outlined"
              value={shortcutName}
              onChange={(e) => setShortcutName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="描述（可选）"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={shortcutDescription}
              onChange={(e) => setShortcutDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>取消</Button>
            <Button onClick={saveShortcut} variant="contained" disabled={!shortcutName.trim()}>
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App;