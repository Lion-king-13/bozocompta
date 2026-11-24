import { parseAmountToCents } from '@/core/money'
import { isIsoDate } from '@/core/dates/dates'
import type { FieldError } from '@/core/errors'
import type { TransactionDirection } from '@/domain'

/**
 * Parseur CSV RÉEL des relevés bancaires (format de démonstration, à confirmer avec A).
 *
 * - encodage UTF-8, séparateur `;`, première ligne = en-tête ;
 * - colonnes obligatoires (ordre libre) : `date;libelle;contrepartie;montant;sens`
 *   + colonne facultative `categorie` (code de catégorie, ex. TRAVEL) ;
 * - `date` au format AAAA-MM-JJ ; `montant` positif, virgule ou point décimal (ex. 23,90) ;
 * - `sens` = `debit` ou `credit`.
 * Pas de guillemets ni de `;` dans les valeurs (format volontairement simple).
 */
export const CSV_REQUIRED_COLUMNS = ['date', 'libelle', 'contrepartie', 'montant', 'sens'] as const
export const MAX_CSV_SIZE_BYTES = 1024 * 1024

export interface ParsedCsvRow {
  line: number
  date: string
  label: string
  counterparty: string
  amountCents: number
  direction: TransactionDirection
  categoryCode: string | null
}

export interface CsvParseResult {
  rows: ParsedCsvRow[]
  errors: FieldError[]
}

export function parseBankCsv(text: string): CsvParseResult {
  const errors: FieldError[] = []
  const rows: ParsedCsvRow[] = []
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const header = (lines[0] ?? '').split(';').map((h) => h.trim().toLowerCase())
  if (lines.every((l) => l.trim() === '')) {
    return { rows, errors: [{ field: 'file', message: 'Le fichier est vide.' }] }
  }
  const missing = CSV_REQUIRED_COLUMNS.filter((c) => !header.includes(c))
  if (missing.length > 0) {
    return {
      rows,
      errors: [{ field: 'ligne 1', message: `Colonnes manquantes : ${missing.join(', ')}.` }],
    }
  }
  const col = (name: string) => header.indexOf(name)

  lines.slice(1).forEach((raw, index) => {
    const line = index + 2
    if (raw.trim() === '') return
    const cells = raw.split(';').map((c) => c.trim())
    if (cells.length !== header.length) {
      errors.push({
        field: `ligne ${line}`,
        message: `${header.length} colonnes attendues, ${cells.length} trouvées.`,
      })
      return
    }
    const get = (name: string) => cells[col(name)] ?? ''
    const date = get('date')
    const amountCents = parseAmountToCents(get('montant'))
    const direction = get('sens').toLowerCase()
    const problems: string[] = []
    if (!isIsoDate(date)) problems.push('date invalide (AAAA-MM-JJ attendu)')
    if (!get('libelle')) problems.push('libellé vide')
    if (amountCents === null || amountCents <= 0)
      problems.push('montant invalide (positif attendu)')
    if (direction !== 'debit' && direction !== 'credit')
      problems.push('sens invalide (debit ou credit)')
    if (problems.length > 0) {
      errors.push({ field: `ligne ${line}`, message: problems.join(', ') })
      return
    }
    const category = col('categorie') >= 0 ? get('categorie') : ''
    rows.push({
      line,
      date,
      label: get('libelle'),
      counterparty: get('contrepartie'),
      amountCents: amountCents as number,
      direction: direction as TransactionDirection,
      categoryCode: category || null,
    })
  })
  if (rows.length === 0 && errors.length === 0) {
    errors.push({ field: 'file', message: 'Aucune transaction dans le fichier.' })
  }
  return { rows, errors }
}
