/**
 * Formatting utilities for Swiss currency, dates, etc.
 */

export function formatCHF(amount: number): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2
  }).format(amount)
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function clientDisplayName(client: {
  nom: string
  prenom?: string | null
  entreprise?: string | null
}): string {
  if (client.entreprise) return client.entreprise
  return [client.prenom, client.nom].filter(Boolean).join(' ')
}

export function devisStatutLabel(statut: string): string {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé'
  }
  return labels[statut] || statut
}

export function factureStatutLabel(statut: string): string {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    envoyee: 'Envoyée',
    payee: 'Payée',
    en_retard: 'En retard'
  }
  return labels[statut] || statut
}

export function devisStatutColor(statut: string): string {
  const classes: Record<string, string> = {
    brouillon: 'badge-draft',
    envoye: 'badge-sent',
    accepte: 'badge-accepted',
    refuse: 'badge-refused'
  }
  return classes[statut] || 'badge-draft'
}

export function factureStatutColor(statut: string): string {
  const classes: Record<string, string> = {
    brouillon: 'badge-draft',
    envoyee: 'badge-sent-invoice',
    payee: 'badge-paid',
    en_retard: 'badge-late'
  }
  return classes[statut] || 'badge-draft'
}
