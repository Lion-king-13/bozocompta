import { createRouter, createWebHistory } from 'vue-router'
import './meta'
import { installGuards } from './guards'
import { routes } from './routes'

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    // Ancre (#offres…) : défilement jusqu'à la section ; sinon retour en haut de page.
    scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 16 } : { top: 0 }),
  })
  installGuards(router)
  return router
}

export { RouteName } from './routeNames'
