import type { CostCenter, CostCenterType, Id } from '@/domain'

export interface CostCenterQuery {
  entityId?: Id
  type?: CostCenterType
}

export type CostCenterInput = Pick<CostCenter, 'entityId' | 'type' | 'code' | 'name' | 'active'>

/** Centres de coûts (départements et projets). */
export interface CostCenterService {
  listCostCenters(query?: CostCenterQuery): Promise<CostCenter[]>
  createCostCenter(input: CostCenterInput): Promise<CostCenter>
  updateCostCenter(id: Id, input: CostCenterInput): Promise<CostCenter>
}
