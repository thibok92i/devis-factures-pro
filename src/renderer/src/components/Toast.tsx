import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const styles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'hsl(145 60% 40% / 0.08)',
    border: 'hsl(145 60% 40% / 0.25)',
    text: 'hsl(145 60% 30%)',
    icon: 'hsl(145 60% 40%)'
  },
  error: {
    bg: 'hsl(var(--destructive) / 0.08)',
    border: 'hsl(var(--destructive) / 0.25)',
    text: 'hsl(0 70% 40%)',
    icon: 'hsl(var(--destructive))'
  },
  warning: {
    bg: 'hsl(35 80% 50% / 0.08)',
    border: 'hsl(35 80% 50% / 0.25)',
    text: 'hsl(35 80% 30%)',
    icon: 'hsl(35 80% 50%)'
  },
  info: {
    bg: 'hsl(var(--primary) / 0.08)',
    border: 'hsl(var(--primary) / 0.25)',
    text: 'hsl(var(--primary))',
    icon: 'hsl(var(--primary))'
  }
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    warning: (msg: string) => addToast('warning', msg),
    info: (msg: string) => addToast('info', msg)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          const s = styles[t.type]
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-slide-in"
              style={{
                background: s.bg,
                borderColor: s.border,
                color: s.text
              }}
            >
              <Icon className="h-5 w-5 shrink-0" style={{ color: s.icon }} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
