/**
 * HTML templates for PDF generation of devis and factures.
 * Uses inline CSS for reliable PDF rendering.
 */

function formatCHF(amount: number): string {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(amount)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
    </style>
  `
}

export function generateDevisHtml(
  devis: Record<string, unknown>,
  lignes: Record<string, unknown>[],
  settings: Record<string, string>
): string {
  const linesHtml = lignes
    .map(
      (l) => {
        if (l.description === '__SECTION__') {
          return `<tr><td colspan="6" style="background: #eef2ff; padding: 8px 10px; font-weight: bold; font-size: 10pt; color: #2563eb; border-bottom: 2px solid #2563eb;">${l.designation}</td></tr>`
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles()}</head><body>
    <div class="header">
      <div class="company">
        <h2>${settings.entreprise_nom || 'Mon Entreprise'}</h2>
        <p>${settings.entreprise_adresse || ''}</p>
        <p>${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}</p>
        <p>${settings.entreprise_telephone || ''}</p>
        <p>${settings.entreprise_email || ''}</p>
        ${settings.tva_numero ? `<p>TVA: ${settings.tva_numero}</p>` : ''}
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
      <tbody>${linesHtml}</tbody>
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

export function generateFactureHtml(
  facture: Record<string, unknown>,
  lignes: Record<string, unknown>[],
  settings: Record<string, string>
): string {
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyles()}</head><body>
    <div class="header">
      <div class="company">
        <h2>${settings.entreprise_nom || 'Mon Entreprise'}</h2>
        <p>${settings.entreprise_adresse || ''}</p>
        <p>${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}</p>
        <p>${settings.entreprise_telephone || ''}</p>
        <p>${settings.entreprise_email || ''}</p>
        ${settings.tva_numero ? `<p>TVA: ${settings.tva_numero}</p>` : ''}
        ${settings.entreprise_numero_tva ? `<p style="font-size: 10px; color: #6b7280;">N&deg; TVA: ${settings.entreprise_numero_tva}</p>` : ''}
      </div>
      <div>
        <div class="doc-title" style="color: #059669;">FACTURE</div>
        <p><strong>N&deg;</strong> ${facture.numero}</p>
        <p><strong>Date:</strong> ${formatDate(facture.date as string)}</p>
        <p><strong>&Eacute;ch&eacute;ance:</strong> ${formatDate(facture.echeance as string)}</p>
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
          <th>D&eacute;signation</th>
          <th>Description</th>
          <th class="text-right">Qt&eacute;</th>
          <th>Unit&eacute;</th>
          <th class="text-right">Prix unit.</th>
          <th class="text-right">Total</th>
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

    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #2563eb;">
      <p style="font-weight: 600; margin-bottom: 5px; font-size: 12px;">Informations de paiement</p>
      <p style="font-size: 11px; margin: 2px 0;">IBAN: ${settings.entreprise_iban || 'Non renseign&eacute;'}</p>
      <p style="font-size: 11px; margin: 2px 0;">Banque: ${settings.entreprise_banque || ''}</p>
      <p style="font-size: 11px; margin: 2px 0;">Titulaire: ${settings.entreprise_nom || ''}</p>
    </div>

    ${settings.mentions_facture ? `<p style="font-size: 10px; color: #6b7280; margin-top: 15px; font-style: italic;">${settings.mentions_facture}</p>` : ''}

    <div class="footer">
      ${settings.entreprise_nom || ''} &bull; ${settings.entreprise_adresse || ''} &bull; ${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}
    </div>
  </body></html>`
}
