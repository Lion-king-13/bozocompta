import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Largeur en pixels d'un élément, mise à jour quand il change de taille.
 * Les graphiques dessinent en pixels réels : le texte garde sa taille sur mobile
 * (un viewBox mis à l'échelle rendrait les étiquettes minuscules à 360 px).
 */
export function useElementWidth(target: Ref<HTMLElement | null>, fallback = 600): Ref<number> {
  const width = ref(fallback)
  let observer: ResizeObserver | undefined

  onMounted(() => {
    const el = target.value
    if (!el) return
    width.value = el.clientWidth || fallback
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0)
      if (w > 0) width.value = w
    })
    observer.observe(el)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return width
}
