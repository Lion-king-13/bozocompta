import type { DashboardSummary, DateRange, Id } from '@/domain'

export interface DashboardQuery {
  /** Absent / null = vue consolidée organisation. */
  entityId?: Id | null
  /** Défaut : du 1er janvier à la date de démo. */
  period?: DateRange
}

export interface DashboardService {
  getSummary(query?: DashboardQuery): Promise<DashboardSummary>
}
