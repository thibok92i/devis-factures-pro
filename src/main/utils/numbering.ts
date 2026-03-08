/**
 * Unified numbering utility for devis and factures.
 * Supports three formats:
 * - simple:  PREFIX-0001
 * - year:    PREFIX-2026-0001 (counter resets each year)
 * - full:    PREFIX-2026/03-0001 (counter resets each year)
 */
import { queryOne, execute } from '../database'

export type NumFormat = 'simple' | 'year' | 'full'

interface CounterRow {
  value: number
  counter_year: number | null
}

/**
 * Generate the next numero for a devis or facture.
 * Handles counter increment + optional yearly reset.
 */
export function generateNumero(
  counterName: 'devis' | 'facture',
  prefix: string,
  format: NumFormat
): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')

  const counter = queryOne(
    `SELECT value, counter_year FROM counters WHERE name = ?`,
    [counterName]
  ) as CounterRow

  let nextNum = counter.value + 1

  // If format uses year, reset counter when year changes
  if (format !== 'simple' && counter.counter_year !== null && counter.counter_year !== currentYear) {
    nextNum = 1
  }

  // Update counter + year
  execute(
    `UPDATE counters SET value = ?, counter_year = ? WHERE name = ?`,
    [nextNum, currentYear, counterName]
  )

  const padded = String(nextNum).padStart(4, '0')

  switch (format) {
    case 'year':
      return `${prefix}-${currentYear}-${padded}`
    case 'full':
      return `${prefix}-${currentYear}/${currentMonth}-${padded}`
    case 'simple':
    default:
      return `${prefix}-${padded}`
  }
}

/**
 * Read the numbering format setting (default: simple).
 */
export function getNumFormat(): NumFormat {
  const row = queryOne(
    `SELECT value FROM settings WHERE key = 'num_format'`
  ) as { value: string } | undefined
  const v = row?.value
  if (v === 'year' || v === 'full') return v
  return 'simple'
}

/**
 * Read a prefix setting with fallback.
 */
export function getPrefix(key: 'devis_prefix' | 'facture_prefix', fallback: string): string {
  const row = queryOne(
    `SELECT value FROM settings WHERE key = ?`,
    [key]
  ) as { value: string } | undefined
  return row?.value || fallback
}
