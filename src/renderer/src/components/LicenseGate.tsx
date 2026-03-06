import { useState, useEffect } from 'react'
import { Key, AlertCircle, CheckCircle } from 'lucide-react'

interface LicenseGateProps {
  children: React.ReactNode
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const [checking, setChecking] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [activating, setActivating] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    window.api.license.check().then((result) => {
      setIsActive(result.isActive)
      setChecking(false)
    })
  }, [])

  const handleActivate = async () => {
    if (key.length !== 19) {
      setError('Format attendu : XXXX-XXXX-XXXX-XXXX')
      return
    }
    setActivating(true)
    setError('')
    try {
      const result = await window.api.license.activate(key)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => setIsActive(true), 1200)
      } else {
        setError(result.message)
      }
    } catch {
      setError("Erreur lors de l'activation")
    } finally {
      setActivating(false)
    }
  }

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    // Auto-add dashes after every 4 chars
    const clean = value.replace(/-/g, '')
    if (clean.length > 16) return
    const parts = clean.match(/.{1,4}/g) || []
    setKey(parts.join('-'))
    setError('')
  }

  // Loading state
  if (checking) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'hsl(var(--background))' }}
      >
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Vérification de la licence...</p>
        </div>
      </div>
    )
  }

  // License active → show the app
  if (isActive) {
    return <>{children}</>
  }

  // License not active → show activation screen
  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: 'hsl(var(--background))' }}
    >
      <div className="w-full max-w-md mx-auto px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, hsl(30 50% 30%), hsl(25 45% 22%))',
              boxShadow: '0 4px 20px hsl(30 50% 20% / 0.3)'
            }}
          >
            {/* Hammer icon SVG matching the app icon */}
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect
                x="18"
                y="14"
                width="4"
                height="22"
                rx="2"
                transform="rotate(-45 18 14)"
                fill="white"
                opacity="0.9"
              />
              <rect
                x="6"
                y="8"
                width="22"
                height="8"
                rx="2"
                transform="rotate(-45 6 8)"
                fill="white"
                opacity="0.95"
              />
              <circle cx="19" cy="19" r="3" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">DevisPro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion de devis & factures pour artisans
          </p>
        </div>

        {/* Activation card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 className="text-lg font-semibold text-foreground mb-1">Activation requise</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Entrez votre clé de licence pour commencer à utiliser DevisPro.
          </p>

          {success ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle className="h-12 w-12 mb-3" style={{ color: 'hsl(145 60% 40%)' }} />
              <p className="text-lg font-semibold" style={{ color: 'hsl(145 60% 40%)' }}>
                Licence activée !
              </p>
              <p className="text-sm text-muted-foreground mt-1">Chargement de l'application...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <input
                  className="input text-center text-lg tracking-widest font-mono"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={key}
                  onChange={handleKeyChange}
                  maxLength={19}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  autoFocus
                />
                <button
                  onClick={handleActivate}
                  disabled={activating || key.length < 19}
                  className="btn-primary w-full justify-center"
                >
                  {activating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" /> Activer la licence
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 mt-3 text-sm"
                  style={{ color: 'hsl(var(--destructive))' }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-5 text-center">
                Contactez votre revendeur pour obtenir une clé de licence.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="wood-accent flex-1" />
          <p className="text-xs text-muted-foreground whitespace-nowrap">DevisPro © 2025</p>
          <div className="wood-accent flex-1" />
        </div>
      </div>
    </div>
  )
}
