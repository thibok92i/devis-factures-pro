/**
 * Centralized error handler for the renderer process.
 * Replaces scattered try/catch toast patterns with a consistent approach.
 */

type ToastFn = {
  error: (message: string) => void
}

/**
 * Handle an error by showing a toast and logging to console.
 * @param err - The caught error (unknown type from catch blocks)
 * @param toast - The toast instance (from useToast or similar)
 * @param context - Optional context string (e.g., "Export PDF", "Sauvegarde client")
 */
export function handleError(err: unknown, toast: ToastFn, context?: string): void {
  const message = err instanceof Error ? err.message : 'Erreur inattendue'
  const fullMessage = context ? `${context} : ${message}` : message
  toast.error(fullMessage)
  console.error(`[DevisPro]${context ? ` (${context})` : ''}:`, err)
}

/**
 * Extract a human-readable message from an unknown error.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Erreur inattendue'
}
