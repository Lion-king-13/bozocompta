import { describe, expect, it } from 'vitest'
import { MAX_PDF_SIZE_BYTES, checkPdfFile } from './pdfCheck'

const PDF_HEADER = new TextEncoder().encode('%PDF-1.4')

describe('checkPdfFile', () => {
  it('accepte un PDF', () => {
    expect(
      checkPdfFile({ name: 'f.pdf', type: 'application/pdf', size: 1000 }, PDF_HEADER),
    ).toEqual([])
  })
  it('refuse une extension / un type non PDF', () => {
    expect(
      checkPdfFile({ name: 'f.docx', type: 'application/msword', size: 1000 }, PDF_HEADER),
    ).toHaveLength(1)
  })
  it('refuse un fichier vide ou trop gros', () => {
    expect(
      checkPdfFile({ name: 'f.pdf', type: 'application/pdf', size: 0 }, new Uint8Array()),
    ).toHaveLength(1)
    expect(
      checkPdfFile(
        { name: 'f.pdf', type: 'application/pdf', size: MAX_PDF_SIZE_BYTES + 1 },
        PDF_HEADER,
      ),
    ).toHaveLength(1)
  })
  it('refuse un faux PDF (en-tête absent)', () => {
    expect(
      checkPdfFile(
        { name: 'f.pdf', type: 'application/pdf', size: 10 },
        new TextEncoder().encode('hello'),
      ),
    ).toEqual([expect.objectContaining({ field: 'file' })])
  })
})
