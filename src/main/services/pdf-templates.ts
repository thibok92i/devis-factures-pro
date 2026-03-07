/**
 * HTML templates for PDF generation of devis and factures.
 * Uses inline CSS for reliable PDF rendering.
 * Supports: company logo, Swiss QR-facture (QR Bill).
 */

import QRCode from 'qrcode'

function formatCHF(amount: number): string {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(amount)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function logoHtml(settings: Record<string, string>): string {
  if (!settings.entreprise_logo) return ''
  return `<img src="${settings.entreprise_logo}" style="max-height: 60px; max-width: 180px; margin-bottom: 8px; display: block;" />`
}

function baseStyles(): string {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #333; padding: 40px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
      .company { font-size: 9pt; color: #666; }
      .company h2 { font-size: 14pt; color: #333; margin-bottom: 4px; }
      .doc-title { font-size: 20pt; font-weight: bold; color: #2563eb; margin-bottom: 20px; }
      .meta-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; width: 48%; }
      .meta-box h4 { font-size: 8pt; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #2563eb; color: white; padding: 8px 10px; text-align: left; font-size: 9pt; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
      tr:nth-child(even) { background: #f8fafc; }
      .text-right { text-align: right; }
      .totals { margin-left: auto; width: 280px; }
      .totals table { margin-bottom: 0; }
      .totals td { padding: 6px 10px; }
      .total-row { font-weight: bold; font-size: 12pt; background: #2563eb !important; color: white; }
      .total-row td { color: white; border: none; }
      .notes { margin-top: 30px; padding: 12px; background: #f8fafc; border-radius: 4px; font-size: 9pt; color: #666; }
      .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      .qr-section { margin-top: 30px; page-break-inside: avoid; border: 1px solid #000; padding: 0; }
      .qr-section .qr-title { background: #000; color: #fff; padding: 4px 10px; font-size: 8pt; font-weight: bold; }
      .qr-section .qr-body { display: flex; padding: 15px; gap: 20px; }
      .qr-section .qr-left { flex: 0 0 auto; text-align: center; }
      .qr-section .qr-right { flex: 1; font-size: 8pt; line-height: 1.6; }
      .qr-section .qr-right p { margin: 0; }
      .qr-section .qr-right .qr-label { font-weight: bold; font-size: 7pt; text-transform: uppercase; color: #666; margin-top: 6px; }
    </style>
  `
}

/**
 * Generate Swiss QR Bill payment section (SPC format).
 * Standard: Swiss Payment Code according to ISO 20022.
 */
function buildSwissQrPayload(
  settings: Record<string, string>,
  facture: Record<string, unknown>
): string {
  const iban = (settings.entreprise_iban || '').replace(/\s/g, '')
  if (!iban || iban.length < 15) return '' // No valid IBAN

  const lines = [
    'SPC',           // QR Type
    '0200',          // Version
    '1',             // Coding Type (UTF-8)
    iban,            // IBAN
    'S',             // Address Type (Structured)
    settings.entreprise_nom || '',  // Creditor Name
    settings.entreprise_adresse || '',  // Street
    '',              // Building number (optional)
    settings.entreprise_npa || '',  // Postal Code
    settings.entreprise_ville || '', // City
    'CH',            // Country
    '',              // Ultimate Creditor (not used)
    '',
    '',
    '',
    '',
    '',
    (facture.total as number).toFixed(2), // Amount
    'CHF',           // Currency
    'S',             // Debtor Address Type
    facture.client_entreprise || [facture.client_prenom, facture.client_nom].filter(Boolean).join(' ') || '', // Debtor Name
    (facture.client_adresse as string) || '', // Debtor Street
    '',              // Building number
    (facture.client_npa as string) || '',   // Postal Code
    (facture.client_ville as string) || '', // City
    'CH',            // Country
    'NON',           // Reference Type (no structured reference)
    '',              // Reference
    `Facture ${facture.numero}`, // Additional info
    'EPD',           // Trailer
    ''               // Billing info (optional)
  ]
  return lines.join('\n')
}

async function generateQrBillHtml(
  settings: Record<string, string>,
  facture: Record<string, unknown>
): Promise<string> {
  const iban = (settings.entreprise_iban || '').replace(/\s/g, '')
  if (!iban || iban.length < 15) return '' // Skip QR bill if no valid IBAN

  const payload = buildSwissQrPayload(settings, facture)
  if (!payload) return ''

  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 170,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch (err) {
    console.error('[QR] Failed to generate QR code:', err)
    return ''
  }

  const clientName = (facture.client_entreprise as string) ||
    [facture.client_prenom, facture.client_nom].filter(Boolean).join(' ') || ''

  const formattedIban = iban.replace(/(.{4})/g, '$1 ').trim()

  return `
    <div class="qr-section">
      <div class="qr-title">Section paiement</div>
      <div class="qr-body">
        <div class="qr-left">
          <img src="${qrDataUrl}" style="width: 140px; height: 140px;" />
          <p style="font-size: 7pt; margin-top: 4px; font-weight: bold;">Swiss QR Code</p>
        </div>
        <div class="qr-right">
          <p class="qr-label">Compte / Payable &agrave;</p>
          <p>${formattedIban}</p>
          <p>${settings.entreprise_nom || ''}</p>
          <p>${settings.entreprise_adresse || ''}</p>
          <p>${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}</p>

          <p class="qr-label">Payable par</p>
          <p>${clientName}</p>
          <p>${facture.client_adresse || ''}</p>
          <p>${facture.client_npa || ''} ${facture.client_ville || ''}</p>

          <p class="qr-label">Monnaie</p>
          <p style="display: inline;">CHF</p>
          <p class="qr-label" style="display: inline; margin-left: 40px;">Montant</p>
          <p style="display: inline; font-weight: bold; font-size: 10pt;">${(facture.total as number).toFixed(2)}</p>

          <p class="qr-label" style="margin-top: 8px;">Informations suppl&eacute;mentaires</p>
          <p>Facture ${facture.numero}</p>
        </div>
      </div>
    </div>
  `
}

export function generateDevisHtml(
  devis: Record<string, unknown>,
  lignes: Record<string, unknown>[],
  settings: Record<string, string>
): string {
  // Build lines HTML with section subtotals and options
  const mainLines: string[] = []
  const optionLines: string[] = []
  let sectionTotal = 0
  let inSection = false
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    if (l.description === '__SECTION__') {
      // Close previous section with subtotal
      if (inSection && sectionTotal > 0) {
        mainLines.push(`<tr><td colspan="5" style="text-align: right; font-size: 8pt; color: #6b7280; padding: 2px 10px; border-top: 1px solid #e5e7eb;">Sous-total section</td><td class="text-right" style="font-size: 8pt; font-weight: 600; color: #2563eb; padding: 2px 10px; border-top: 1px solid #e5e7eb;">${formatCHF(sectionTotal)}</td></tr>`)
      }
      mainLines.push(`<tr><td colspan="6" style="background: #eef2ff; padding: 8px 10px; font-weight: bold; font-size: 10pt; color: #2563eb; border-bottom: 2px solid #2563eb;">${l.designation}</td></tr>`)
      sectionTotal = 0
      inSection = true
    } else if (l.is_option) {
      optionLines.push(`
    <tr>
      <td>${l.designation}</td>
      <td>${l.description || ''}</td>
      <td class="text-right">${l.quantite}</td>
      <td>${l.unite}</td>
      <td class="text-right">${formatCHF(l.prix_unitaire as number)}</td>
      <td class="text-right">${formatCHF(l.total as number)}</td>
    </tr>`)
    } else {
      mainLines.push(`
    <tr>
      <td>${l.designation}</td>
      <td>${l.description || ''}</td>
      <td class="text-right">${l.quantite}</td>
      <td>${l.unite}</td>
      <td class="text-right">${formatCHF(l.prix_unitaire as number)}</td>
      <td class="text-right">${formatCHF(l.total as number)}</td>
    </tr>`)
      if (inSection) sectionTotal += (l.total as number) || 0
    }
  }
  // Close last section
  if (inSection && sectionTotal > 0) {
    mainLines.push(`<tr><td colspan="5" style="text-align: right; font-size: 8pt; color: #6b7280; padding: 2px 10px; border-top: 1px solid #e5e7eb;">Sous-total section</td><td class="text-right" style="font-size: 8pt; font-weight: 600; color: #2563eb; padding: 2px 10px; border-top: 1px solid #e5e7eb;">${formatCHF(sectionTotal)}</td></tr>`)
  }
  const linesHtml = mainLines.join('')
  const optionsTotalHT = lignes.filter(l => l.is_option).reduce((s, l) => s + ((l.total as number) || 0), 0)
  const optionsHtml = optionLines.length > 0 ? `
    <tr><td colspan="6" style="background: #fffbeb; padding: 8px 10px; font-weight: bold; font-size: 10pt; color: #d97706; border-bottom: 2px solid #d97706; border-top: 2px solid #d97706;">Options</td></tr>
    ${optionLines.join('')}
    <tr><td colspan="5" style="text-align: right; font-weight: 600; padding: 4px 10px; color: #d97706;">Total options HT</td><td class="text-right" style="font-weight: 600; color: #d97706;">${formatCHF(optionsTotalHT)}</td></tr>
  ` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles()}</head><body>
    <div class="header">
      <div class="company">
        ${logoHtml(settings)}
        <h2>${settings.entreprise_nom || 'Mon Entreprise'}</h2>
        <p>${settings.entreprise_adresse || ''}</p>
        <p>${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}</p>
        <p>${settings.entreprise_telephone || ''}</p>
        <p>${settings.entreprise_email || ''}</p>
        ${settings.entreprise_numero_tva ? `<p style="font-size: 10px; color: #6b7280;">N&deg; TVA: ${settings.entreprise_numero_tva}</p>` : ''}
      </div>
      <div>
        <div class="doc-title">DEVIS</div>
        <p><strong>N&deg;</strong> ${devis.numero}</p>
        <p><strong>Date:</strong> ${formatDate(devis.date as string)}</p>
        <p><strong>Validit&eacute;:</strong> ${formatDate(devis.validite as string)}</p>
        ${devis.validite ? `<p style="margin-top: 6px; padding: 4px 8px; background: #eff6ff; border-radius: 4px; font-size: 9pt; color: #2563eb; font-weight: 600;">Valable jusqu'au: ${formatDate(devis.validite as string)}</p>` : ''}
      </div>
    </div>

    ${devis.objet ? `<p style="margin: 12px 0 4px; font-size: 11pt;"><strong>Objet:</strong> ${devis.objet}</p>` : ''}

    <div class="meta-grid">
      <div class="meta-box">
        <h4>Client</h4>
        <p><strong>${devis.client_entreprise || ''}</strong></p>
        <p>${devis.client_prenom || ''} ${devis.client_nom || ''}</p>
        <p>${devis.client_adresse || ''}</p>
        <p>${devis.client_npa || ''} ${devis.client_ville || ''}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>D&eacute;signation</th>
          <th>Description</th>
          <th class="text-right">Qt&eacute;</th>
          <th>Unit&eacute;</th>
          <th class="text-right">Prix unit.</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>${linesHtml}${optionsHtml}</tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td>Sous-total</td><td class="text-right">${formatCHF(devis.sous_total as number)}</td></tr>
        ${(devis.remise_pourcent as number) > 0 ? `<tr><td>Remise (${devis.remise_pourcent}%)</td><td class="text-right">-${formatCHF(devis.remise_montant as number)}</td></tr>` : ''}
        <tr><td>TVA (${devis.taux_tva}%)</td><td class="text-right">${formatCHF(devis.montant_tva as number)}</td></tr>
        <tr class="total-row"><td>Total TTC</td><td class="text-right">${formatCHF(devis.total as number)}</td></tr>
      </table>
    </div>

    ${devis.notes || devis.conditions ? `<div class="notes">${devis.notes || ''}<br/>${devis.conditions || ''}</div>` : ''}

    ${settings.mentions_devis ? `<p style="font-size: 10px; color: #6b7280; margin-top: 15px; font-style: italic;">${settings.mentions_devis}</p>` : ''}

    <div class="footer">
      ${settings.entreprise_nom || ''} &bull; ${settings.entreprise_adresse || ''} &bull; ${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}
    </div>
  </body></html>`
}

export async function generateFactureHtml(
  facture: Record<string, unknown>,
  lignes: Record<string, unknown>[],
  settings: Record<string, string>
): Promise<string> {
  const linesHtml = lignes
    .map(
      (l) => {
        if (l.description === '__SECTION__') {
          return `<tr><td colspan="6" style="background: #f0fdf4; padding: 8px 10px; font-weight: bold; font-size: 10pt; color: #059669; border-bottom: 2px solid #059669;">${l.designation}</td></tr>`
        }
        return `
    <tr>
      <td>${l.designation}</td>
      <td>${l.description || ''}</td>
      <td class="text-right">${l.quantite}</td>
      <td>${l.unite}</td>
      <td class="text-right">${formatCHF(l.prix_unitaire as number)}</td>
      <td class="text-right">${formatCHF(l.total as number)}</td>
    </tr>
  `
      }
    )
    .join('')

  // Generate Swiss QR Bill section
  const qrBillHtml = await generateQrBillHtml(settings, facture)

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles()}</head><body>
    <div class="header">
      <div class="company">
        ${logoHtml(settings)}
        <h2>${settings.entreprise_nom || 'Mon Entreprise'}</h2>
        <p>${settings.entreprise_adresse || ''}</p>
        <p>${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}</p>
        <p>${settings.entreprise_telephone || ''}</p>
        <p>${settings.entreprise_email || ''}</p>
        ${settings.entreprise_numero_tva ? `<p style="font-size: 10px; color: #6b7280;">N&deg; TVA: ${settings.entreprise_numero_tva}</p>` : ''}
      </div>
      <div>
        <div class="doc-title" style="color: #059669;">FACTURE</div>
        <p><strong>N&deg;</strong> ${facture.numero}</p>
        <p><strong>Date:</strong> ${formatDate(facture.date as string)}</p>
        ${facture.echeance ? `<p style="margin-top: 6px; padding: 4px 8px; background: #f0fdf4; border-radius: 4px; font-size: 9pt; color: #059669; font-weight: 600;">&Eacute;ch&eacute;ance: ${formatDate(facture.echeance as string)}</p>` : ''}
        ${facture.devis_id ? `<p><strong>R&eacute;f. devis:</strong> ${facture.devis_numero || ''}</p>` : ''}
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h4>Client</h4>
        <p><strong>${facture.client_entreprise || ''}</strong></p>
        <p>${facture.client_prenom || ''} ${facture.client_nom || ''}</p>
        <p>${facture.client_adresse || ''}</p>
        <p>${facture.client_npa || ''} ${facture.client_ville || ''}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="background: #059669;">D&eacute;signation</th>
          <th style="background: #059669;">Description</th>
          <th style="background: #059669;" class="text-right">Qt&eacute;</th>
          <th style="background: #059669;">Unit&eacute;</th>
          <th style="background: #059669;" class="text-right">Prix unit.</th>
          <th style="background: #059669;" class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td>Sous-total</td><td class="text-right">${formatCHF(facture.sous_total as number)}</td></tr>
        ${(facture.remise_pourcent as number) > 0 ? `<tr><td>Remise (${facture.remise_pourcent}%)</td><td class="text-right">-${formatCHF(facture.remise_montant as number)}</td></tr>` : ''}
        <tr><td>TVA (${facture.taux_tva}%)</td><td class="text-right">${formatCHF(facture.montant_tva as number)}</td></tr>
        <tr class="total-row" style="background: #059669 !important;"><td>Total TTC</td><td class="text-right">${formatCHF(facture.total as number)}</td></tr>
      </table>
    </div>

    ${facture.notes || facture.conditions ? `<div class="notes">${facture.notes || ''}<br/>${facture.conditions || ''}</div>` : ''}

    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #059669;">
      <p style="font-weight: 600; margin-bottom: 5px; font-size: 12px;">Informations de paiement</p>
      <p style="font-size: 11px; margin: 2px 0;">IBAN: ${settings.entreprise_iban || 'Non renseign&eacute;'}</p>
      <p style="font-size: 11px; margin: 2px 0;">Banque: ${settings.entreprise_banque || ''}</p>
      <p style="font-size: 11px; margin: 2px 0;">Titulaire: ${settings.entreprise_nom || ''}</p>
    </div>

    ${settings.mentions_facture ? `<p style="font-size: 10px; color: #6b7280; margin-top: 15px; font-style: italic;">${settings.mentions_facture}</p>` : ''}

    ${qrBillHtml}

    <div class="footer">
      ${settings.entreprise_nom || ''} &bull; ${settings.entreprise_adresse || ''} &bull; ${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}
    </div>
  </body></html>`
}
