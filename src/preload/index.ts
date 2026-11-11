import { contextBridge, ipcRenderer } from 'electron'
import type { Command, FlowApi, PhaseEndKind, AppState } from '../shared/types'

const api: FlowApi = {
  getState: () => ipcRenderer.invoke('flow:get-state'),

  onState: (cb: (state: AppState) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, state: AppState) => cb(state)
    ipcRenderer.on('flow:state', listener)
    return () => ipcRenderer.removeListener('flow:state', listener)
  },

  onPhaseEnd: (cb: (kind: PhaseEndKind) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, kind: PhaseEndKind) => cb(kind)
    ipcRenderer.on('flow:phase-end', listener)
    return () => ipcRenderer.removeListener('flow:phase-end', listener)
  },

  onPresenceCopied: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('flow:presence-copied', listener)
    return () => ipcRenderer.removeListener('flow:presence-copied', listener)
  },

  command: (cmd: Command) => ipcRenderer.send('flow:command', cmd),

  platform: process.platform,

  // Dev-only capture bridge; the main-process handler exists only when unpackaged.
  capture: (name: string) => ipcRenderer.invoke('flow:dev-capture', name),
  captureDone: () => ipcRenderer.send('flow:capture-done'),
}

contextBridge.exposeInMainWorld('flow', api)
