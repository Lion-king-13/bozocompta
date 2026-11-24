/**
 * Jeu d'icônes maison (traits simples sur une grille 24 × 24).
 * Dessinées pour CashLens : aucune dépendance ni licence tierce.
 * Ajouter une icône = ajouter une entrée ; le type IconName suit automatiquement.
 */
export const ICONS = {
  // États et retours
  check: 'M5 12.5l4.5 4.5L19 7.5',
  'check-circle': 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M8 12.5l3 3 5-6',
  x: 'M6 6l12 12 M18 6L6 18',
  minus: 'M6 12h12',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 11v6 M12 7.5v.01',
  'alert-circle': 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7.5v5.5 M12 16.5v.01',
  'alert-triangle': 'M12 3.5L2.5 20h19L12 3.5z M12 10v4.5 M12 17.5v.01',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3.5 2',
  lock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',

  // Transparence IA
  sparkle:
    'M11 3l1.7 5.3L18 10l-5.3 1.7L11 17l-1.7-5.3L4 10l5.3-1.7z M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  lightbulb:
    'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z',
  pencil: 'M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19z M13 7.5l3.5 3.5',

  // Flèches et navigation
  'arrow-up': 'M12 19V5 M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14 M6 13l6 6 6-6',
  'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  'external-link': 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',

  // Actions
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4',
  refresh: 'M20 11A8 8 0 0 0 5.5 7.5L4 9 M4 4v5h5 M4 13a8 8 0 0 0 14.5 3.5L20 15 M20 20v-5h-5',
  upload: 'M12 15V4 M7 9l5-5 5 5 M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  download: 'M12 4v11 M7 10l5 5 5-5 M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M10 16l-4-4 4-4 M6 12h10',

  // Objets métier
  dashboard: 'M4 4h7v9H4z M13 4h7v5h-7z M13 11h7v9h-7z M4 15h7v5H4z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h3',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5',
  card: 'M3 6h18v12H3z M3 10h18 M7 15h3',
  transactions: 'M4 7h13 M14 4l3 3-3 3 M20 17H7 M10 14l-3 3 3 3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  paperclip: 'M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7',
  split: 'M12 3a9 9 0 1 0 9 9h-9z M15 3.5A9 9 0 0 1 20.5 9H15z',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.5c1.8.9 3 2.9 3 5.5',
  user: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8z M4 21c0-4 3.6-7 8-7s8 3 8 7',
  tag: 'M3 12V4h8l10 10-8 8z M7.5 8v.01',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 12v.01',
  wallet:
    'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3 M16 13.5v.01',
  repeat: 'M17 3l3 3-3 3 M4 11V10a4 4 0 0 1 4-4h12 M7 21l-3-3 3-3 M20 13v1a4 4 0 0 1-4 4H4',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  chart: 'M4 20V11 M10 20V5 M16 20v-6 M3 20h18',
  bolt: 'M13 2L4.5 13.5H11L10 22l8.5-11.5H12z',
  building:
    'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16 M15 9h4a1 1 0 0 1 1 1v11 M3 21h18 M8 8h3 M8 12h3 M8 16h3',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z',
  settings: 'M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1 M15 4v4 M9 10v4 M17 16v4',
  inbox: 'M3 13h5l1.5 3h5l1.5-3h5 M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z',
  'wifi-off':
    'M3 3l18 18 M8.5 16.5a5 5 0 0 1 7 0 M5 12.5a10 10 0 0 1 4-2.3 M19 12.5a10 10 0 0 0-2.6-1.8 M2 8.8a15 15 0 0 1 4.5-2.6 M22 8.8A15 15 0 0 0 11 5 M12 20v.01',
} as const

export type IconName = keyof typeof ICONS
