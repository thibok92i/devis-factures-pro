import { Save } from 'lucide-react'

interface TemplateSaveModalProps {
  lignesCount: number
  templateName: string
  onTemplateNameChange: (name: string) => void
  onSave: () => void
  onClose: () => void
}

export default function TemplateSaveModal({
  lignesCount,
  templateName,
  onTemplateNameChange,
  onSave,
  onClose
}: TemplateSaveModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Sauver comme modèle</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Les {lignesCount} lignes actuelles seront sauvegardées comme modèle réutilisable.
        </p>
        <input
          className="input mb-4"
          placeholder="Nom du modèle (ex: Cuisine standard)..."
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={onSave} disabled={!templateName.trim() || lignesCount === 0} className="btn-primary">
            <Save className="h-4 w-4" />
            Sauver
          </button>
        </div>
      </div>
    </div>
  )
}
