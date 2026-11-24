import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { formatBasisPoints, formatCents } from '@/core/money'
import HorizontalBarChart from './HorizontalBarChart.vue'
import StackedBar from './StackedBar.vue'
import TimeSeriesChart from './TimeSeriesChart.vue'
import {
  axisTicks,
  labelStep,
  niceMax,
  percentOf,
  seriesColor,
  type ChartDatum,
} from './chartUtils'

const ENTITIES: ChartDatum[] = [
  { key: 'ent-be', label: 'Lumen Belgium SRL', value: 180_000, colorSlot: 1 },
  { key: 'ent-fr', label: 'Lumen France SAS', value: 120_000, colorSlot: 2 },
]

describe('chartUtils', () => {
  it('arrondit le maximum de l’axe et produit des graduations entières', () => {
    expect(niceMax(300_000)).toBe(500_000)
    expect(niceMax(180_000)).toBe(200_000)
    expect(niceMax(0)).toBe(1)
    expect(axisTicks(500_000)).toEqual([0, 125_000, 250_000, 375_000, 500_000])
    expect(axisTicks(5).every(Number.isInteger)).toBe(true)
  })

  it('espace les étiquettes pour éviter les chevauchements', () => {
    expect(labelStep(12, 600, 48)).toBe(1)
    expect(labelStep(30, 300, 48)).toBe(5)
    expect(labelStep(0, 300)).toBe(1)
  })

  it('utilise la palette dans l’ordre fixe, puis « Autres »', () => {
    expect(seriesColor(1)).toBe('var(--chart-cat-1)')
    expect(seriesColor(8)).toBe('var(--chart-cat-8)')
    expect(seriesColor(9)).toBe('var(--chart-other)')
    expect(percentOf(50, 200)).toBe(25)
    expect(percentOf(5, 0)).toBe(0)
  })
})

describe('HorizontalBarChart', () => {
  it('écrit chaque valeur formatée et fournit un tableau de données équivalent', () => {
    const w = mount(HorizontalBarChart, {
      props: { title: 'Dépenses par entité', items: ENTITIES },
    })
    expect(w.findAll('[data-testid="hbar-row"]')).toHaveLength(2)
    expect(w.text()).toContain(formatCents(180_000))
    expect(w.text()).toContain(formatCents(120_000))
    const table = w.find('[data-testid="chart-data-table"] table')
    expect(table.find('caption').text()).toBe('Dépenses par entité')
    expect(table.findAll('tbody tr')).toHaveLength(2)
    expect(w.find('figure').attributes('aria-label')).toBe('Dépenses par entité')
  })

  it('affiche un message (et aucun tableau) pour un jeu de données vide', () => {
    const w = mount(HorizontalBarChart, {
      props: { title: 'Vide', items: [], emptyText: 'Rien à afficher.' },
    })
    expect(w.text()).toContain('Rien à afficher.')
    expect(w.find('table').exists()).toBe(false)
  })

  it('accepte un formatage non monétaire (tokens)', () => {
    const w = mount(HorizontalBarChart, {
      props: {
        title: 'Tokens',
        items: [{ key: 'a', label: 'Extraction', value: 12_480 }],
        format: (v: number) => `${v} tokens`,
      },
    })
    expect(w.text()).toContain('12480 tokens')
  })
})

describe('TimeSeriesChart', () => {
  const points: ChartDatum[] = [
    { key: '2026-09', label: 'sept.', fullLabel: 'Septembre 2026', value: 300_000 },
    { key: '2026-10', label: 'oct.', fullLabel: 'Octobre 2026', value: 85_699 },
  ]

  it('rend un point focusable par valeur avec une description textuelle', () => {
    const w = mount(TimeSeriesChart, { props: { title: 'Évolution', points } })
    const marks = w.findAll('[data-testid="timeseries-mark"]')
    expect(marks).toHaveLength(2)
    expect(marks[0]!.attributes('tabindex')).toBe('0')
    expect(marks[0]!.attributes('aria-label')).toBe(`Septembre 2026 : ${formatCents(300_000)}`)
    expect(w.find('svg').attributes('aria-label')).toBe('Évolution')
    expect(w.findAll('tbody tr')).toHaveLength(2)
  })

  it('affiche une infobulle au focus clavier', async () => {
    const w = mount(TimeSeriesChart, { props: { title: 'Évolution', points, variant: 'column' } })
    await w.findAll('[data-testid="timeseries-mark"]')[1]!.trigger('focus')
    expect(w.find('.ts__tooltip').text()).toBe(`Octobre 2026 : ${formatCents(85_699)}`)
  })

  it('gère un jeu de données vide', () => {
    const w = mount(TimeSeriesChart, { props: { title: 'Évolution', points: [] } })
    expect(w.text()).toContain('Aucune donnée')
    expect(w.find('svg').exists()).toBe(false)
  })
})

describe('StackedBar', () => {
  it('écrit la valeur et la part de chaque segment', () => {
    const w = mount(StackedBar, { props: { title: 'Répartition', items: ENTITIES } })
    expect(w.text()).toContain(`${formatCents(180_000)} · ${formatBasisPoints(6000)}`)
    expect(w.text()).toContain(`${formatCents(120_000)} · ${formatBasisPoints(4000)}`)
    expect(w.findAll('tbody tr')).toHaveLength(2)
  })

  it('gère un jeu de données vide ou nul', () => {
    const w = mount(StackedBar, {
      props: { title: 'Répartition', items: [{ key: 'x', label: 'X', value: 0 }] },
    })
    expect(w.text()).toContain('Aucune donnée')
  })
})
