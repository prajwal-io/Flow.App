import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAppState } from './state'
import './styles.css'

initAppState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
