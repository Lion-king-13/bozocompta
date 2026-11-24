import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { onApiError } from './core/errors'
import { createAppRouter } from './router'
import { RouteName } from './router/routeNames'
import { useAuthStore } from './stores/auth'
import './styles/tokens.css'
import './styles/base.css'

const app = createApp(App)
app.use(createPinia())
const router = createAppRouter()
app.use(router)

// Traitement transverse : une erreur 401 (session expirée) déconnecte et renvoie à la connexion.
onApiError((error) => {
  if (error.code !== 'UNAUTHENTICATED' || error.operation === 'auth.login') return
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return
  auth.expireSession()
  void router.push({
    name: RouteName.Login,
    query: { redirect: router.currentRoute.value.fullPath },
  })
})

app.mount('#app')
