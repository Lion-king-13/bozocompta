import { ref, shallowRef, type Ref } from 'vue'
import { toApiError, type ApiError } from '@/core/errors'

/**
 * Charge une donnée asynchrone (appel de service) avec états `loading` / `error` uniformes.
 * L'erreur est toujours une `ApiError` (afficher `error.message`, réagir à `error.code`).
 *
 *   const { data, error, loading, run } = useAsync(() => useServices().invoices.listInvoices())
 */
export function useAsync<T>(loader: () => Promise<T>, options: { immediate?: boolean } = {}) {
  const data = shallowRef<T | null>(null) as Ref<T | null>
  const error = shallowRef<ApiError | null>(null)
  const loading = ref(false)
  let callId = 0

  async function run(): Promise<T | null> {
    const id = ++callId
    loading.value = true
    error.value = null
    try {
      const result = await loader()
      if (id === callId) data.value = result
      return result
    } catch (e) {
      if (id === callId) error.value = toApiError(e)
      return null
    } finally {
      if (id === callId) loading.value = false
    }
  }

  if (options.immediate !== false) void run()
  return { data, error, loading, run }
}
