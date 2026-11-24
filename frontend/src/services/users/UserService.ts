import type { Id, User } from '@/domain'

export interface UserQuery {
  entityId?: Id
}

/** Collaborateurs / membres de l'organisation. */
export interface UserService {
  listUsers(query?: UserQuery): Promise<User[]>
  getUser(id: Id): Promise<User>
}
