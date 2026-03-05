import { useState, useEffect } from 'react'
import { Download, RefreshCw, X, CheckCircle } from 'lucide-react'

interface UpdateInfo {
  version: string
  releaseDate?: string
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Only register if running in Electron (not browser preview)
    if (!window.api?.updater) return

    const cleanup = window.api.updater.onUpdate((event: string, data: unknown) => {
      switch (event) {
        case 'update:checking':
          setState('checking')
          break
        case 'update:available':
          setState('available')
          setUpdateInfo(data as UpdateInfo)
          setDismissed(false)
          break
        case 'update:not-available':
          setState('idle')
          break
        case 'update:progress':
          setState('downloading')
          setProgress((data as { percent: number }).percent)
          break
        case 'update:downloaded':
          setState('ready')
          setDismissed(false)
          break
        case 'update:error':
          setState('error')
          break
      }
    })

    return cleanup
  }, [])

  const handleDownload = () => {
    window.api?.updater.download()
    setState('downloading')
  }

  const handleInstall = () => {
    window.api?.updater.install()
  }

  // Don't show anything if dismissed, idle, checking, or error
  if (dismissed || state === 'idle' || state === 'checking' || state === 'error') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-blue-200 bg-white p-4 shadow-lg">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      {state === 'available' && updateInfo && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Mise à jour disponible</span>
          </div>
          <p className="mb-3 text-sm text-gray-600">
            Version {updateInfo.version} est disponible.
          </p>
          <button onClick={handleDownload} className="btn-primary w-full justify-center text-sm">
            <Download className="h-4 w-4" />
            Télécharger
          </button>
        </div>
      )}

      {state === 'downloading' && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="font-medium text-gray-900">Téléchargement...</span>
          </div>
          <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-500">{progress}%</p>
        </div>
      )}

      {state === 'ready' && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-gray-900">Prêt à installer</span>
          </div>
          <p className="mb-3 text-sm text-gray-600">
            L'application va redémarrer pour installer la mise à jour.
          </p>
          <button onClick={handleInstall} className="btn-primary w-full justify-center text-sm">
            <RefreshCw className="h-4 w-4" />
            Installer et redémarrer
          </button>
        </div>
      )}
    </div>
  )
}
