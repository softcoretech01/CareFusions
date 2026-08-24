import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installApiIdentity } from './utils/apiIdentity'

// Must run before the first render so every API call carries the signed-in
// user's identity (see utils/apiIdentity.ts — the audit trail depends on it).
installApiIdentity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
