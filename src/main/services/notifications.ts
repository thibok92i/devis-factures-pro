import { Notification } from 'electron'
import { queryAll } from '../database'

/**
 * Check for overdue invoices and expiring devis, then show desktop notifications.
 * Called once on app startup (after a short delay to let the window load).
 */
export function checkAndNotify(): void {
  // Delay check so the window is fully loaded
  setTimeout(() => {
    try {
      checkOverdueInvoices()
      checkExpiringDevis()
    } catch (err) {
      console.error('[Notifications] Error:', err)
    }
  }, 5000)
}

function checkOverdueInvoices(): void {
  const today = new Date().toISOString().slice(0, 10)
  const overdue = queryAll(
    `SELECT f.numero, c.nom, c.prenom, c.entreprise, f.echeance, f.total
     FROM factures f
     LEFT JOIN clients c ON c.id = f.client_id
     WHERE f.statut IN ('envoyee', 'en_retard')
       AND f.echeance < ?
     ORDER BY f.echeance ASC
     LIMIT 10`,
    [today]
  )

  if (overdue.length === 0) return

  const count = overdue.length
  const body = count === 1
    ? `Facture ${overdue[0].numero} pour ${clientName(overdue[0])} est en retard.`
    : `${count} factures sont en retard de paiement.`

  showNotification('Factures en retard', body)
}

function checkExpiringDevis(): void {
  const today = new Date().toISOString().slice(0, 10)
  const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const expiring = queryAll(
    `SELECT d.numero, c.nom, c.prenom, c.entreprise, d.validite
     FROM devis d
     LEFT JOIN clients c ON c.id = d.client_id
     WHERE d.statut = 'envoye'
       AND d.validite BETWEEN ? AND ?
     ORDER BY d.validite ASC
     LIMIT 10`,
    [today, in3days]
  )

  if (expiring.length === 0) return

  const count = expiring.length
  const body = count === 1
    ? `Le devis ${expiring[0].numero} expire le ${formatDate(String(expiring[0].validite))}.`
    : `${count} devis expirent dans les 3 prochains jours.`

  showNotification('Devis bientôt expirés', body)
}

function clientName(row: Record<string, unknown>): string {
  if (row.entreprise) return String(row.entreprise)
  return [row.prenom, row.nom].filter(Boolean).join(' ')
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long' })
  } catch {
    return d
  }
}

function showNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title: `DevisPro — ${title}`,
    body,
    icon: undefined // Uses app icon by default on Windows
  })
  notification.show()
}
