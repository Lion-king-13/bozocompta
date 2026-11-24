import type { LegalEntity, Organization, User } from '@/domain'

/** Toutes les données sont FICTIVES (noms, numéros, e-mails en domaine réservé `.test`). */

export const ORGANIZATION: Organization = {
  id: 'org-lumen',
  name: 'Groupe Lumen (démo)',
  planId: 'plan-pro',
  createdAt: '2025-01-10T08:00:00Z',
}

export const ENTITIES: LegalEntity[] = [
  {
    id: 'ent-be',
    organizationId: 'org-lumen',
    name: 'Lumen Belgium SRL',
    country: 'BE',
    vatNumber: 'BE0000.000.001',
    registrationNumber: '0000.000.001',
    currency: 'EUR',
  },
  {
    id: 'ent-fr',
    organizationId: 'org-lumen',
    name: 'Lumen France SAS',
    country: 'FR',
    vatNumber: 'FR00000000001',
    registrationNumber: '000 000 001',
    currency: 'EUR',
  },
]

export const USERS: User[] = [
  {
    id: 'usr-alice',
    organizationId: 'org-lumen',
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice.admin@cashlens-demo.test',
    role: 'admin',
    entityIds: ['ent-be', 'ent-fr'],
    jobTitle: 'Directrice financière',
    active: true,
  },
  {
    id: 'usr-bruno',
    organizationId: 'org-lumen',
    firstName: 'Bruno',
    lastName: 'Lefèvre',
    email: 'bruno.comptable@cashlens-demo.test',
    role: 'finance',
    entityIds: ['ent-be', 'ent-fr'],
    jobTitle: 'Comptable',
    active: true,
  },
  {
    id: 'usr-chloe',
    organizationId: 'org-lumen',
    firstName: 'Chloé',
    lastName: 'Dubois',
    email: 'chloe.manager@cashlens-demo.test',
    role: 'manager',
    entityIds: ['ent-be'],
    jobTitle: 'Responsable Belgique',
    active: true,
  },
  {
    id: 'usr-david',
    organizationId: 'org-lumen',
    firstName: 'David',
    lastName: 'Moreau',
    email: 'david.manager@cashlens-demo.test',
    role: 'manager',
    entityIds: ['ent-fr'],
    jobTitle: 'Responsable France',
    active: true,
  },
  {
    id: 'usr-emma',
    organizationId: 'org-lumen',
    firstName: 'Emma',
    lastName: 'Janssens',
    email: 'emma.collab@cashlens-demo.test',
    role: 'member',
    // Collaboratrice membre de DEUX entités (§3 : un collaborateur peut appartenir à plusieurs entités).
    entityIds: ['ent-be', 'ent-fr'],
    jobTitle: 'Chargée de marketing',
    active: true,
  },
  {
    id: 'usr-farid',
    organizationId: 'org-lumen',
    firstName: 'Farid',
    lastName: 'Benali',
    email: 'farid.collab@cashlens-demo.test',
    role: 'member',
    entityIds: ['ent-fr'],
    jobTitle: 'Chef de projet',
    active: true,
  },
]

/** Mot de passe unique accepté par le login SIMULÉ (mode mock uniquement). */
export const DEMO_PASSWORD = 'demo'
