import { computeInvoiceLine, computeInvoiceTotals } from '@/domain/finance'
import type {
  Category,
  CostCenter,
  DataProvenance,
  Id,
  Invoice,
  InvoiceLineInput,
  InvoiceStatus,
  IsoDate,
  Supplier,
} from '@/domain'

export const SUPPLIERS: Supplier[] = [
  { id: 'sup-infomat', organizationId: 'org-lumen', name: 'InfoMatériel SRL', country: 'BE', vatNumber: 'BE0000.000.100', category: 'Matériel informatique' },
  { id: 'sup-agence', organizationId: 'org-lumen', name: 'Agence Créative Bruxelles', country: 'BE', vatNumber: 'BE0000.000.101', category: 'Marketing' },
  { id: 'sup-cloud', organizationId: 'org-lumen', name: 'Nuage Hébergement SRL', country: 'BE', vatNumber: 'BE0000.000.102', category: 'Logiciels & cloud' },
  { id: 'sup-bureau', organizationId: 'org-lumen', name: 'Bureau & Co', country: 'BE', vatNumber: 'BE0000.000.103', category: 'Fournitures' },
  { id: 'sup-telecom', organizationId: 'org-lumen', name: 'TéléLink', country: 'FR', vatNumber: 'FR00000000104', category: 'Télécom' },
  { id: 'sup-delta', organizationId: 'org-lumen', name: 'Cabinet Juridique Delta', country: 'FR', vatNumber: 'FR00000000105', category: 'Honoraires' },
  { id: 'sup-dataviz', organizationId: 'org-lumen', name: 'DataViz Pro', country: 'OTHER', vatNumber: null, category: 'Logiciels & cloud' },
  { id: 'sup-chartboard', organizationId: 'org-lumen', name: 'ChartBoard', country: 'OTHER', vatNumber: null, category: 'Logiciels & cloud' },
  { id: 'sup-transport', organizationId: 'org-lumen', name: 'Transports Rapides', country: 'BE', vatNumber: 'BE0000.000.108', category: 'Logistique' },
]

export const CATEGORIES: Category[] = [
  { id: 'cat-hardware', organizationId: 'org-lumen', code: 'HARDWARE', name: 'Matériel informatique' },
  { id: 'cat-software', organizationId: 'org-lumen', code: 'SOFTWARE', name: 'Logiciels & cloud' },
  { id: 'cat-marketing', organizationId: 'org-lumen', code: 'MARKETING', name: 'Marketing' },
  { id: 'cat-office', organizationId: 'org-lumen', code: 'OFFICE', name: 'Fournitures' },
  { id: 'cat-telecom', organizationId: 'org-lumen', code: 'TELECOM', name: 'Télécom' },
  { id: 'cat-legal', organizationId: 'org-lumen', code: 'LEGAL', name: 'Honoraires' },
  { id: 'cat-logistics', organizationId: 'org-lumen', code: 'LOGISTICS', name: 'Logistique' },
  { id: 'cat-travel', organizationId: 'org-lumen', code: 'TRAVEL', name: 'Déplacements & repas' },
]

/** Centres de coûts : départements et projets, chacun rattaché à une entité (arbitrage D3). */
export const COST_CENTERS: CostCenter[] = [
  { id: 'cc-be-it', entityId: 'ent-be', type: 'department', code: 'BE-IT', name: 'Informatique', active: true },
  { id: 'cc-be-ops', entityId: 'ent-be', type: 'department', code: 'BE-OPS', name: 'Opérations', active: true },
  { id: 'cc-be-mkt', entityId: 'ent-be', type: 'department', code: 'BE-MKT', name: 'Marketing', active: true },
  { id: 'cc-be-erp', entityId: 'ent-be', type: 'project', code: 'BE-ERP', name: 'Migration ERP', active: true },
  { id: 'cc-fr-ops', entityId: 'ent-fr', type: 'department', code: 'FR-OPS', name: 'Opérations', active: true },
  { id: 'cc-fr-adm', entityId: 'ent-fr', type: 'department', code: 'FR-ADM', name: 'Administration', active: true },
  // « Projet France » de l'exemple obligatoire.
  { id: 'cc-fr-paris', entityId: 'ent-fr', type: 'project', code: 'FR-PARIS', name: 'Projet France — Lancement Paris', active: true },
  { id: 'cc-fr-salon25', entityId: 'ent-fr', type: 'project', code: 'FR-SALON25', name: 'Salon 2025 (clôturé)', active: false },
]

const VAT_BE = 2100 // 21 %
const VAT_FR = 2000 // 20 %
const VAT_REVERSE_CHARGE = 0 // autoliquidation intracommunautaire

interface InvoiceSeed {
  id: Id
  entityId: Id
  supplierId: Id
  number: string
  issueDate: IsoDate
  dueDate: IsoDate
  status: InvoiceStatus
  categoryId: Id | null
  provenance: DataProvenance
  lines: InvoiceLineInput[]
}

/** Construit une facture dont les totaux sont TOUJOURS la somme exacte des lignes. */
function invoice(seed: InvoiceSeed): Invoice {
  const lines = seed.lines.map((l, i) => computeInvoiceLine(`${seed.id}-l${i + 1}`, l, seed.provenance))
  return {
    id: seed.id,
    organizationId: 'org-lumen',
    entityId: seed.entityId,
    supplierId: seed.supplierId,
    categoryId: seed.categoryId,
    number: seed.number,
    issueDate: seed.issueDate,
    dueDate: seed.dueDate,
    currency: 'EUR',
    status: seed.status,
    lines,
    ...computeInvoiceTotals(lines),
    provenance: seed.provenance,
    sourceDocument: {
      fileName: `${seed.number}.pdf`,
      // Pas de vrai PDF : l'URL est un emplacement fictif que la partie A remplacera.
      url: `/mock-documents/${seed.id}.pdf`,
      sizeBytes: 48_000 + seed.lines.length * 6_000,
      uploadedAt: `${seed.issueDate}T10:00:00Z`,
    },
    createdAt: `${seed.issueDate}T10:00:00Z`,
  }
}

export const INVOICES: Invoice[] = [
  // EXEMPLE OBLIGATOIRE (cahier des charges §5) : matériel informatique, 3 000,00 € TTC,
  // payé par Alice avec la carte de l'entité belge (transaction tx-be-101), rapproché.
  // La ventilation 60/40 porte sur la transaction (voir banking.ts).
  // 2 479,34 € HT + 520,66 € TVA 21 % = 3 000,00 € TTC (HT/TVA à titre informatif).
  invoice({
    id: 'inv-001', entityId: 'ent-be', supplierId: 'sup-infomat', number: 'IM-2026-0412',
    issueDate: '2026-09-15', dueDate: '2026-09-15', status: 'paid', categoryId: 'cat-hardware', provenance: 'recorded',
    lines: [{ description: 'Lot de matériel informatique (portables et écrans)', quantity: 1, unitPriceCents: 247_934, vatRateBp: VAT_BE }],
  }),
  invoice({
    id: 'inv-002', entityId: 'ent-be', supplierId: 'sup-cloud', number: 'NH-2026-0918',
    issueDate: '2026-09-30', dueDate: '2026-10-30', status: 'paid', categoryId: 'cat-software', provenance: 'recorded',
    lines: [
      { description: 'Hébergement serveurs — septembre', quantity: 1, unitPriceCents: 45_000, vatRateBp: VAT_BE },
      { description: 'Sauvegarde externalisée', quantity: 1, unitPriceCents: 5_000, vatRateBp: VAT_BE },
    ],
  }),
  invoice({
    id: 'inv-003', entityId: 'ent-be', supplierId: 'sup-bureau', number: 'BC-55821',
    issueDate: '2026-10-05', dueDate: '2026-11-04', status: 'paid', categoryId: 'cat-office', provenance: 'recorded',
    lines: [
      { description: 'Ramettes de papier A4', quantity: 20, unitPriceCents: 450, vatRateBp: VAT_BE },
      { description: "Cartouches d'encre", quantity: 4, unitPriceCents: 3_999, vatRateBp: VAT_BE },
    ],
  }),
  invoice({
    id: 'inv-004', entityId: 'ent-fr', supplierId: 'sup-telecom', number: 'TL-10-2026-7781',
    issueDate: '2026-10-02', dueDate: '2026-11-01', status: 'paid', categoryId: 'cat-telecom', provenance: 'recorded',
    lines: [
      { description: 'Forfaits mobiles', quantity: 6, unitPriceCents: 2_500, vatRateBp: VAT_FR },
      { description: 'Fibre bureau', quantity: 1, unitPriceCents: 5_999, vatRateBp: VAT_FR },
    ],
  }),
  invoice({
    id: 'inv-005', entityId: 'ent-fr', supplierId: 'sup-delta', number: 'DELTA-2026-311',
    issueDate: '2026-10-20', dueDate: '2026-11-19', status: 'approved', categoryId: 'cat-legal', provenance: 'recorded',
    lines: [{ description: 'Conseil juridique — contrats clients (heures)', quantity: 8, unitPriceCents: 18_000, vatRateBp: VAT_FR }],
  }),
  invoice({
    id: 'inv-006', entityId: 'ent-be', supplierId: 'sup-cloud', number: 'NH-2026-1031',
    issueDate: '2026-10-31', dueDate: '2026-11-30', status: 'approved', categoryId: 'cat-software', provenance: 'recorded',
    lines: [
      { description: 'Hébergement serveurs — octobre', quantity: 1, unitPriceCents: 45_000, vatRateBp: VAT_BE },
      { description: 'Sauvegarde externalisée', quantity: 1, unitPriceCents: 5_000, vatRateBp: VAT_BE },
    ],
  }),
  invoice({
    id: 'inv-007', entityId: 'ent-be', supplierId: 'sup-dataviz', number: 'DVP-88412',
    issueDate: '2026-11-01', dueDate: '2026-11-01', status: 'paid', categoryId: 'cat-software', provenance: 'recorded',
    lines: [{ description: 'Licences DataViz Pro — novembre', quantity: 5, unitPriceCents: 2_900, vatRateBp: VAT_BE }],
  }),
  invoice({
    id: 'inv-008', entityId: 'ent-fr', supplierId: 'sup-chartboard', number: 'CB-2026-11-0042',
    issueDate: '2026-11-03', dueDate: '2026-11-03', status: 'paid', categoryId: 'cat-software', provenance: 'recorded',
    lines: [{ description: 'Licences ChartBoard — novembre', quantity: 4, unitPriceCents: 2_500, vatRateBp: VAT_FR }],
  }),
  // Extraite par l'IA, pas encore relue.
  invoice({
    id: 'inv-009', entityId: 'ent-be', supplierId: 'sup-transport', number: 'TR-7741',
    issueDate: '2026-11-06', dueDate: '2026-12-06', status: 'to_review', categoryId: 'cat-logistics', provenance: 'ai_extracted',
    lines: [{ description: 'Livraison matériel salon', quantity: 1, unitPriceCents: 38_000, vatRateBp: VAT_BE }],
  }),
  // Doublon probable de inv-009 (signalé par l'analyse IA simulée ins-002).
  invoice({
    id: 'inv-010', entityId: 'ent-be', supplierId: 'sup-transport', number: 'TR-7741-B',
    issueDate: '2026-11-08', dueDate: '2026-12-08', status: 'to_review', categoryId: 'cat-logistics', provenance: 'ai_extracted',
    lines: [{ description: 'Livraison matériel salon', quantity: 1, unitPriceCents: 38_000, vatRateBp: VAT_BE }],
  }),
  // Fibre passée de 59,99 € à 69,99 € HT (hausse de prix signalée par ins-003).
  invoice({
    id: 'inv-011', entityId: 'ent-fr', supplierId: 'sup-telecom', number: 'TL-11-2026-8012',
    issueDate: '2026-11-02', dueDate: '2026-12-02', status: 'approved', categoryId: 'cat-telecom', provenance: 'recorded',
    lines: [
      { description: 'Forfaits mobiles', quantity: 6, unitPriceCents: 2_500, vatRateBp: VAT_FR },
      { description: 'Fibre bureau', quantity: 1, unitPriceCents: 6_999, vatRateBp: VAT_FR },
    ],
  }),
  // Annulée.
  invoice({
    id: 'inv-012', entityId: 'ent-fr', supplierId: 'sup-delta', number: 'DELTA-2026-298',
    issueDate: '2026-09-25', dueDate: '2026-10-25', status: 'cancelled', categoryId: 'cat-legal', provenance: 'recorded',
    lines: [{ description: 'Honoraires (facture annulée)', quantity: 1, unitPriceCents: 50_000, vatRateBp: VAT_FR }],
  }),
  // Fournisseur belge → société française : autoliquidation, TVA 0.
  invoice({
    id: 'inv-013', entityId: 'ent-fr', supplierId: 'sup-agence', number: 'BXL-2026-0450',
    issueDate: '2026-10-28', dueDate: '2026-11-27', status: 'disputed', categoryId: 'cat-marketing', provenance: 'user_corrected',
    lines: [{ description: 'Déclinaison des visuels pour le salon (autoliquidation)', quantity: 1, unitPriceCents: 80_000, vatRateBp: VAT_REVERSE_CHARGE }],
  }),
]
