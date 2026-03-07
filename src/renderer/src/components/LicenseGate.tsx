import { useState, useEffect } from 'react'
import { Key, AlertCircle, CheckCircle, Hammer, WifiOff, RefreshCw } from 'lucide-react'

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
  const [offlineExpired, setOfflineExpired] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const doCheck = async () => {
    const result = await window.api.license.check()
    setIsActive(result.isActive)
    setOfflineExpired(result.offlineExpired || false)
    setChecking(false)
  }

  useEffect(() => {
    doCheck()
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
        setOfflineExpired(false)
        setTimeout(() => setIsActive(true), 1200)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'activation")
    } finally {
      setActivating(false)
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    await doCheck()
    setRetrying(false)
  }

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
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
          <p className="text-sm text-muted-foreground">V&eacute;rification de la licence...</p>
        </div>
      </div>
    )
  }

  // Offline token expired → need internet to re-verify
  if (offlineExpired && !isActive) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'hsl(var(--background))' }}
      >
        <div className="w-full max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
              style={{
                background: 'linear-gradient(145deg, hsl(30 55% 32%), hsl(25 50% 20%))',
                boxShadow: '0 6px 24px hsl(30 50% 15% / 0.4)'
              }}
            >
              <Hammer className="h-10 w-10 text-white" strokeWidth={1.8} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">DevisPro</h1>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <div className="flex items-center gap-3 mb-4">
              <WifiOff className="h-6 w-6 text-amber-500 shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">V&eacute;rification requise</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Votre licence n&eacute;cessite une v&eacute;rification en ligne p&eacute;riodique.
              Connectez-vous &agrave; internet et cliquez sur R&eacute;essayer.
            </p>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="btn-primary w-full justify-center"
            >
              {retrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  V&eacute;rification...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> R&eacute;essayer
                </>
              )}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="wood-accent flex-1" />
            <p className="text-xs text-muted-foreground whitespace-nowrap">DevisPro &copy; 2025</p>
            <div className="wood-accent flex-1" />
          </div>
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
              background: 'linear-gradient(145deg, hsl(30 55% 32%), hsl(25 50% 20%))',
              boxShadow: '0 6px 24px hsl(30 50% 15% / 0.4)'
            }}
          >
            <Hammer className="h-10 w-10 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DevisPro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion de devis &amp; factures pour artisans
          </p>
        </div>

        {/* Activation card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 className="text-lg font-semibold text-foreground mb-1">Activation requise</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Entrez votre cl&eacute; de licence pour commencer &agrave; utiliser DevisPro.
          </p>

          {success ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle className="h-12 w-12 mb-3" style={{ color: 'hsl(145 60% 40%)' }} />
              <p className="text-lg font-semibold" style={{ color: 'hsl(145 60% 40%)' }}>
                Licence activ&eacute;e !
              </p>
              <p className="text-sm text-muted-foreground mt-1">Chargement de l&apos;application...</p>
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
                      V&eacute;rification...
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
                Une connexion internet est requise pour l&apos;activation.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="wood-accent flex-1" />
          <p className="text-xs text-muted-foreground whitespace-nowrap">DevisPro &copy; 2025</p>
          <div className="wood-accent flex-1" />
        </div>
      </div>
    </div>
  )
}
