/**
 * Horloge de démonstration FIGÉE (arbitrage D10).
 * Tous les calculs d'échéances et de périodes utilisent cette date — jamais `new Date()`
 * directement dans un calcul — afin que la démo et les tests donnent toujours les mêmes chiffres.
 */
export const DEMO_TODAY = '2026-11-20'

/** Horodatage utilisé pour les actions faites en mode mock (confirmation, import…). */
export const DEMO_NOW = '2026-11-20T09:00:00Z'

/** Mois courant de la démo (`YYYY-MM`). */
export const DEMO_CURRENT_MONTH = DEMO_TODAY.slice(0, 7)
