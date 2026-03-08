import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import App from './App'
import './index.css'

// In browser preview (outside Electron), inject mock API
if (!window.api) {
  import('./mock-api').then(({ mockApi }) => {
    window.api = mockApi as unknown as typeof window.api
    mount()
  })
} else {
  mount()
}

function mount() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </HashRouter>
    </React.StrictMode>
  )
}
