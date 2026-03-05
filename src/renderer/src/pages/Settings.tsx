import { useState, useEffect } from 'react'
import { Save, Key, HardDrive, Building2, Landmark, ReceiptText, Clock } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function Settings() {
  const toast = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [licenseKey, setLicenseKey] = useState('')
  const [licenseStatus, setLicenseStatus] = useState<{ isActive: boolean; key?: string }>({ isActive: false })
  const [licenseMessage, setLicenseMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Réglages</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saved ? 'Sauvegardé !' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* Company info */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Informations entreprise</h2>
        </div>
        <div className="space-y-3">
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
        <button onClick={handleBackup} className="btn-secondary">
          <HardDrive className="h-4 w-4" />
          Sauvegarder maintenant
        </button>
      </div>
    </div>
  )
}
