import type { FlowApi } from '../../../shared/types'

declare global {
  interface Window {
    flow: FlowApi
  }
}

export const api: FlowApi = window.flow
