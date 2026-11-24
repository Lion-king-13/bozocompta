import { describe, expect, it } from 'vitest'
import { parseBankCsv } from './csvParser'

describe('parseBankCsv', () => {
  it('lit un CSV valide (colonnes dans un ordre quelconque, BOM, CRLF)', () => {
    const csv =
      '﻿sens;date;libelle;contrepartie;montant\r\ndebit;2026-11-20;CB TAXI;Taxi;15,5\r\ncredit;2026-11-21;VIR;Client;1.234,56\r\n'
    const { rows, errors } = parseBankCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toEqual([
      expect.objectContaining({
        line: 2,
        amountCents: 1550,
        direction: 'debit',
        categoryCode: null,
      }),
      expect.objectContaining({ line: 3, amountCents: 123_456, direction: 'credit' }),
    ])
  })

  it('signale les colonnes manquantes', () => {
    expect(parseBankCsv('date;montant\n2026-11-20;10').errors[0]?.message).toMatch(
      /Colonnes manquantes/,
    )
  })

  it('signale chaque ligne invalide', () => {
    const { errors } = parseBankCsv(
      'date;libelle;contrepartie;montant;sens\n2026-02-30;X;Y;10;debit\n2026-11-20;X;Y;-5;debit\n2026-11-20;X;Y\n',
    )
    expect(errors.map((e) => e.field)).toEqual(['ligne 2', 'ligne 3', 'ligne 4'])
  })

  it('refuse un fichier vide ou sans transaction', () => {
    expect(parseBankCsv('').errors).toHaveLength(1)
    expect(parseBankCsv('date;libelle;contrepartie;montant;sens\n').errors[0]?.message).toMatch(
      /Aucune/,
    )
  })
})
