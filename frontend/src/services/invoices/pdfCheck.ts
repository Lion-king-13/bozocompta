import type { FieldError } from '@/core/errors'

export const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Contrôle RÉEL d'un fichier PDF avant envoi / extraction.
 * Retourne la liste des problèmes (vide si le fichier est acceptable).
 * `header` = premiers octets du fichier.
 */
export function checkPdfFile(
  file: { name: string; type: string; size: number },
  header: Uint8Array,
): FieldError[] {
  const errors: FieldError[] = []
  const looksPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksPdf) errors.push({ field: 'file', message: 'Le fichier doit être un PDF (.pdf).' })
  if (file.size === 0) errors.push({ field: 'file', message: 'Le fichier est vide.' })
  if (file.size > MAX_PDF_SIZE_BYTES)
    errors.push({ field: 'file', message: 'Le fichier dépasse 5 Mo.' })
  const magic = String.fromCharCode(...header.slice(0, 5))
  if (file.size > 0 && magic !== '%PDF-') {
    errors.push({
      field: 'file',
      message: "Le contenu n'est pas un PDF valide (en-tête %PDF absent).",
    })
  }
  return errors
}
