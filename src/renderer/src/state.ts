import { useSyncExternalStore } from 'react'
import type { AppState } from '../../shared/types'
import { api } from './lib/api'

let current: AppState | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): AppState | null {
  return current
}

let initialized = false

/** Subscribes to main-process state pushes and performs the first fetch. */
export function initAppState(): void {
  if (initialized) return
  initialized = true
  api.onState((state) => {
    current = state
    emit()
  })
  void api.getState().then((state) => {
    current = state
    emit()
  })
}

export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
