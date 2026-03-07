import { BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export async function generatePdf(
  htmlContent: string,
  outputPath: string
): Promise<string> {
  // Create hidden window for PDF generation
  const win = new BrowserWindow({
    show: false,
    width: 794, // A4 width at 96 DPI
    height: 1123, // A4 height at 96 DPI
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 500))

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      marginsType: 0,
      pageSize: 'A4',
      landscape: false
    })

    writeFileSync(outputPath, pdfBuffer)
    return outputPath
  } finally {
    win.destroy()
  }
}

export function getDefaultExportPath(type: 'devis' | 'facture' | 'rapport', numero: string): string {
  const documentsPath = app.getPath('documents')
  const folders: Record<string, string> = { devis: 'Devis', facture: 'Factures', rapport: 'Rapports' }
  const prefixes: Record<string, string> = { devis: 'Devis', facture: 'Facture', rapport: 'Rapport' }
  const exportDir = join(documentsPath, 'DevisPro', folders[type])
  return join(exportDir, `${prefixes[type]}_${numero}.pdf`)
}
