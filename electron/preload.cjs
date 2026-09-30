const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openShowWindow: (displayIds) => ipcRenderer.invoke('open-show-window', displayIds),
  openPgmWindow: () => ipcRenderer.invoke('open-pgm-window'),
  closeShowWindow: () => ipcRenderer.invoke('close-show-window'),
  closeFocusedShowWindow: () => ipcRenderer.invoke('close-focused-show-window'),
  focusControlWindow: () => ipcRenderer.invoke('focus-control-window'),
  closePgmWindow: () => ipcRenderer.invoke('close-pgm-window'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  getSelectedShowDisplays: () => ipcRenderer.invoke('get-selected-show-displays'),
  setSelectedShowDisplays: (displayIds) =>
    ipcRenderer.invoke('set-selected-show-displays', displayIds),
  onDisplaysChanged: (callback) => {
    const handler = (_event, displays) => callback(displays)
    ipcRenderer.on('displays-changed', handler)
    return () => ipcRenderer.removeListener('displays-changed', handler)
  },
  getLocalAddresses: () => ipcRenderer.invoke('get-local-addresses'),
  getApiInfo: () => ipcRenderer.invoke('get-api-info'),
  setApiConfig: (config) => ipcRenderer.invoke('set-api-config', config),
  setOutputConfig: (config) => ipcRenderer.invoke('set-output-config', config),
  getOutputStatus: () => ipcRenderer.invoke('get-output-status'),
  onOutputStatus: (callback) => {
    const handler = (_event, status) => callback(status)
    ipcRenderer.on('output-status', handler)
    return () => ipcRenderer.removeListener('output-status', handler)
  },
  broadcastState: (state) => ipcRenderer.send('broadcast-state', state),
  onStateUpdate: (callback) => {
    const handler = (_event, state) => callback(state)
    ipcRenderer.on('state-update', handler)
    return () => ipcRenderer.removeListener('state-update', handler)
  },
  onApiCommand: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('api-command', handler)
    return () => ipcRenderer.removeListener('api-command', handler)
  },
  replyApiQuery: (requestId, data) => {
    ipcRenderer.send('api-query-reply', requestId, data)
  },
})
