const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  executeCommand: (command, workingDir) => ipcRenderer.invoke('execute-command', command, workingDir),
  onCommandOutput: (callback) => ipcRenderer.on('command-output', callback),
  removeCommandOutputListener: (callback) => ipcRenderer.removeListener('command-output', callback),
  saveShortcut: (shortcut) => ipcRenderer.invoke('save-shortcut', shortcut),
  loadShortcuts: () => ipcRenderer.invoke('load-shortcuts'),
  deleteShortcut: (id) => ipcRenderer.invoke('delete-shortcut', id)
});