import type { HttpClient } from '@/core/http/httpClient'
import type { User } from '@/domain'
import type { UserService } from './UserService'

export function createHttpUserService(http: HttpClient): UserService {
  return {
    listUsers: (query = {}) =>
      http.get<User[]>('/users', { query: { ...query }, operation: 'users.list' }),
    getUser: (id) => http.get<User>(`/users/${encodeURIComponent(id)}`, { operation: 'users.get' }),
  }
}
