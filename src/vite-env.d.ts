/// <reference types="vite/client" />

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  size: { width: number; height: number }
  scaleFactor: number
  primary: boolean
}

interface StageTimeElectronAPI {
  openShowWindow: (displayIds?: number[]) => Promise<{ ok: boolean; displayIds: number[] }>
  openPgmWindow: () => Promise<void>
  closeShowWindow: () => Promise<void>
  closeFocusedShowWindow: () => Promise<{ ok: boolean }>
  focusControlWindow: () => Promise<void>
  closePgmWindow: () => Promise<void>
  getDisplays: () => Promise<DisplayInfo[]>
  getSelectedShowDisplays: () => Promise<number[]>
  setSelectedShowDisplays: (
    displayIds: number[],
  ) => Promise<{ ok: boolean; displayIds: number[] }>
  onDisplaysChanged: (callback: (displays: DisplayInfo[]) => void) => () => void
  getLocalAddresses: () => Promise<string[]>
  getApiInfo: () => Promise<{ port: number; token: string; enabled: boolean }>
  setApiConfig: (config: {
    enabled: boolean
    port: number
    token: string
  }) => Promise<{ ok: boolean; port?: number; error?: string }>
  setOutputConfig: (config: import('./types').OutputConfig) => Promise<{
    ok: boolean
    status?: import('./types').OutputStatus
    error?: string
  }>
  getOutputStatus: () => Promise<import('./types').OutputStatus | null>
  onOutputStatus: (callback: (status: import('./types').OutputStatus) => void) => () => void
  broadcastState: (state: unknown) => void
  onStateUpdate: (callback: (state: unknown) => void) => () => void
  onApiCommand: (
    callback: (payload: {
      action: string
      params: Record<string, string>
      requestId?: string
      expectReply?: boolean
    }) => void,
  ) => () => void
  replyApiQuery: (requestId: string, data: unknown) => void
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: StageTimeElectronAPI
  }
}

export {}
