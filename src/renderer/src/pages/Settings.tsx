import { useState, useEffect } from 'react'
import { Save, Key, HardDrive, Building2, Landmark, ReceiptText, Clock, ImagePlus, Hash, Moon, Sun, FileText, Upload, X, RotateCcw } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function Settings() {
  const toast = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseStatus, setLicenseStatus] = useState<{ isActive: boolean; key?: string }>({ isActive: false })
  const [licenseMessage, setLicenseMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [backups, setBackups] = useState<{ name: string; date: string; size: number }[]>([])
  const [showBackups, setShowBackups] = useState(false)

  useEffect(() => {
    window.api.settings.getAll().then(setSettings)
    window.api.license.check().then(setLicenseStatus)
  }, [])

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.api.settings.setMultiple(settings)
      setSaved(true)
      toast.success('Réglages sauvegardés')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleActivateLicense = async () => {
    const result = await window.api.license.activate(licenseKey)
    setLicenseMessage(result.message)
    if (result.success) {
      setLicenseStatus(await window.api.license.check())
      setLicenseKey('')
    }
  }

  const handleBackup = async () => {
    try {
      const result = await window.api.backup.run()
      if (result.success) {
        toast.success('Sauvegarde effectuée avec succès')
        if (showBackups) loadBackups()
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const loadBackups = async () => {
    try {
      const list = await window.api.backup.list()
      setBackups(list || [])
    } catch {
      setBackups([])
    }
  }

  const handleRestore = async (fileName: string) => {
    if (!confirm(`Restaurer la sauvegarde "${fileName}" ?\n\nUne sauvegarde de la base actuelle sera créée avant la restauration. L'application va redémarrer.`)) return
    try {
      const result = await window.api.backup.restore(fileName)
      if (result.success) {
        toast.success('Sauvegarde restaurée ! Redémarrage...')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        toast.error(result.error || 'Erreur lors de la restauration')
      }
    } catch {
      toast.error('Erreur lors de la restauration')
    }
  }

  const toggleBackups = () => {
    if (!showBackups) loadBackups()
    setShowBackups(!showBackups)
  }

  const handleUploadLogo = async () => {
    try {
      const result = await window.api.settings.uploadLogo()
      if (result.success && result.logo) {
        setSettings((prev) => ({ ...prev, entreprise_logo: result.logo }))
        toast.success('Logo importé')
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur lors de l'import du logo")
    }
  }

  const handleRemoveLogo = () => {
    setSettings((prev) => {
      const next = { ...prev }
      delete next.entreprise_logo
      return next
    })
    toast.info('Logo supprimé (sauvegarder pour confirmer)')
  }

  const handleToggleDarkMode = () => {
    const isDark = settings.theme_mode === 'dark'
    const newMode = isDark ? 'light' : 'dark'
    updateSetting('theme_mode', newMode)
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const isDark = settings.theme_mode === 'dark'

  return (
    <div className="max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Réglages</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saved ? 'Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Theme toggle */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5" style={{ color: 'hsl(35 80% 50%)' }} />}
            <h2 className="text-lg font-semibold text-foreground">Apparence</h2>
          </div>
          <button
            onClick={handleToggleDarkMode}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {isDark ? 'Mode sombre activé' : 'Mode clair activé'}. Le thème est appliqué immédiatement.
        </p>
      </div>

      {/* Company info */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Informations entreprise</h2>
        </div>
        <div className="space-y-3">
          {/* Logo */}
          <div>
            <label className="label">Logo entreprise</label>
            <div className="flex items-center gap-4">
              {settings.entreprise_logo ? (
                <div className="relative group">
                  <img src={settings.entreprise_logo} alt="Logo" className="h-16 max-w-[180px] object-contain rounded border border-border p-1" />
                  <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Supprimer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-border">
                  <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              <button onClick={handleUploadLogo} className="btn-secondary text-sm">
                <Upload className="h-3.5 w-3.5" />
                {settings.entreprise_logo ? 'Changer' : 'Importer'}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nom de l'entreprise</label>
            <input className="input" value={settings.entreprise_nom || ''} onChange={(e) => updateSetting('entreprise_nom', e.target.value)} placeholder="Menuiserie Dupont" />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={settings.entreprise_adresse || ''} onChange={(e) => updateSetting('entreprise_adresse', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">NPA</label>
              <input className="input" value={settings.entreprise_npa || ''} onChange={(e) => updateSetting('entreprise_npa', e.target.value)} />
            </div>
            <div>
              <label className="label">Ville</label>
              <input className="input" value={settings.entreprise_ville || ''} onChange={(e) => updateSetting('entreprise_ville', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={settings.entreprise_telephone || ''} onChange={(e) => updateSetting('entreprise_telephone', e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={settings.entreprise_email || ''} onChange={(e) => updateSetting('entreprise_email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Site web</label>
              <input className="input" value={settings.entreprise_site || ''} onChange={(e) => updateSetting('entreprise_site', e.target.value)} />
            </div>
            <div>
              <label className="label">N° TVA</label>
              <input className="input" value={settings.entreprise_numero_tva || ''} onChange={(e) => updateSetting('entreprise_numero_tva', e.target.value)} placeholder="CHE-123.456.789 TVA" />
            </div>
          </div>
        </div>
      </div>

      {/* Numérotation */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Numérotation</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Personnalisez les préfixes des numéros de devis et factures. Exemple : D-0001, F-0001.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Préfixe devis</label>
            <input className="input" value={settings.devis_prefix || 'D'} onChange={(e) => updateSetting('devis_prefix', e.target.value)} placeholder="D" maxLength={10} />
          </div>
          <div>
            <label className="label">Préfixe facture</label>
            <input className="input" value={settings.facture_prefix || 'F'} onChange={(e) => updateSetting('facture_prefix', e.target.value)} placeholder="F" maxLength={10} />
          </div>
        </div>
      </div>

      {/* TVA & Conditions */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">TVA & Conditions</h2>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Taux TVA (%)</label>
              <input className="input" type="number" step="0.1" value={settings.tva_taux || '8.1'} onChange={(e) => updateSetting('tva_taux', e.target.value)} />
            </div>
            <div>
              <label className="label">Devise</label>
              <input className="input" value={settings.devise || 'CHF'} onChange={(e) => updateSetting('devise', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Conditions devis</label>
            <textarea className="input" rows={2} value={settings.conditions_devis || ''} onChange={(e) => updateSetting('conditions_devis', e.target.value)} />
          </div>
          <div>
            <label className="label">Conditions facture</label>
            <textarea className="input" rows={2} value={settings.conditions_facture || ''} onChange={(e) => updateSetting('conditions_facture', e.target.value)} />
          </div>

          {/* Mentions légales */}
          <div className="border-t border-border pt-3 mt-3">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Mentions légales (pied de page PDF)</span>
            </div>
            <div>
              <label className="label">Mentions devis</label>
              <textarea className="input" rows={2} value={settings.mentions_devis || ''} onChange={(e) => updateSetting('mentions_devis', e.target.value)} placeholder="Ex: TVA non applicable, art. 293 B du CGI" />
            </div>
            <div className="mt-3">
              <label className="label">Mentions facture</label>
              <textarea className="input" rows={2} value={settings.mentions_facture || ''} onChange={(e) => updateSetting('mentions_facture', e.target.value)} placeholder="Ex: Pénalités de retard: 3x taux d'intérêt légal" />
            </div>
          </div>

          {/* Délais */}
          <div className="border-t border-border pt-3 mt-3">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Délais</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Délai validité devis (jours)</label>
                <input className="input" type="number" min="1" value={settings.delai_validite_devis || '30'} onChange={(e) => updateSetting('delai_validite_devis', e.target.value)} />
              </div>
              <div>
                <label className="label">Délai paiement facture (jours)</label>
                <input className="input" type="number" min="1" value={settings.delai_paiement_facture || '30'} onChange={(e) => updateSetting('delai_paiement_facture', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IBAN / Informations bancaires */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Landmark className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
          <h2 className="text-lg font-semibold text-foreground">Informations bancaires</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          L'IBAN est utilisé pour générer le QR-code de paiement suisse sur les factures.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">IBAN</label>
            <input className="input" value={settings.entreprise_iban || ''} onChange={(e) => updateSetting('entreprise_iban', e.target.value)} placeholder="CH93 0076 2011 6238 5295 7" />
          </div>
          <div>
            <label className="label">Banque</label>
            <input className="input" value={settings.entreprise_banque || ''} onChange={(e) => updateSetting('entreprise_banque', e.target.value)} placeholder="Banque Cantonale Vaudoise" />
          </div>
        </div>
      </div>

      {/* License */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-5 w-5" style={{ color: 'hsl(35 80% 50%)' }} />
          <h2 className="text-lg font-semibold text-foreground">Licence</h2>
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2 w-2 rounded-full ${licenseStatus.isActive ? 'bg-green-500' : 'bg-destructive'}`} />
            <span className="text-sm font-medium text-foreground">
              {licenseStatus.isActive ? `Licence active (${licenseStatus.key})` : 'Licence non activée'}
            </span>
          </div>
        </div>
        {!licenseStatus.isActive && (
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              maxLength={19}
            />
            <button onClick={handleActivateLicense} className="btn-primary">Activer</button>
          </div>
        )}
        {licenseMessage && <p className="mt-2 text-sm" style={{ color: 'hsl(145 60% 40%)' }}>{licenseMessage}</p>}
      </div>

      {/* Backup */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Sauvegarde</h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Les sauvegardes automatiques sont effectuées toutes les 30 minutes dans le dossier Documents/DevisPro/Sauvegardes.
        </p>
        <div className="flex gap-2">
          <button onClick={handleBackup} className="btn-secondary">
            <HardDrive className="h-4 w-4" />
            Sauvegarder maintenant
          </button>
          <button onClick={toggleBackups} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            {showBackups ? 'Masquer' : 'Restaurer'}
          </button>
        </div>
        {showBackups && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Sauvegardes disponibles</h3>
            {backups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune sauvegarde trouvée.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {backups.map((b) => (
                  <div key={b.name} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(b.date).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-muted-foreground">{(b.size / 1024).toFixed(0)} Ko</p>
                    </div>
                    <button onClick={() => handleRestore(b.name)} className="text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      Restaurer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
