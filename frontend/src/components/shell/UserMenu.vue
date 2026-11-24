<script setup lang="ts">
/**
 * Menu utilisateur : nom, rôle, liens Paramètres / Confidentialité, déconnexion.
 * Bouton « disclosure » (aria-expanded) qui ouvre une liste de liens : plus simple et plus
 * robuste qu'un menu ARIA complet. Échap et clic extérieur ferment.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { useToasts } from '@/composables/useToasts'
import { ROLE_LABELS } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'

withDefaults(defineProps<{ variant?: 'dark' | 'light'; placement?: 'up' | 'down' }>(), {
  variant: 'light',
  placement: 'down',
})

const auth = useAuthStore()
const router = useRouter()
const toast = useToasts()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)
const menuId = useId()
const isMock = useServices().mode === 'mock'

const fullName = computed(() => (auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : ''))
const initials = computed(() =>
  auth.user ? `${auth.user.firstName[0] ?? ''}${auth.user.lastName[0] ?? ''}` : '',
)
const roleLabel = computed(() => (auth.user ? ROLE_LABELS[auth.user.role] : ''))

function close(returnFocus = false) {
  open.value = false
  if (returnFocus) button.value?.focus()
}

function onDocumentClick(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    close(true)
  }
}

async function logout(switchAccount = false) {
  close()
  await auth.logout()
  toast.info(
    switchAccount ? 'Choisissez un autre compte de démonstration.' : 'Vous êtes déconnecté.',
  )
  await router.push({ name: switchAccount ? RouteName.Login : RouteName.Landing })
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div
    v-if="auth.user"
    ref="root"
    class="user-menu"
    :class="[`user-menu--${variant}`, `user-menu--${placement}`]"
    @keydown="onKeydown"
  >
    <button
      ref="button"
      type="button"
      class="user-menu__button"
      :aria-expanded="open"
      :aria-controls="menuId"
      :aria-label="`Menu utilisateur : ${fullName}, ${roleLabel}`"
      data-testid="current-user"
      @click="open = !open"
    >
      <span class="user-menu__avatar" aria-hidden="true">{{ initials }}</span>
      <span class="user-menu__identity">
        <span class="user-menu__name">{{ fullName }}</span>
        <span class="user-menu__role">{{ roleLabel }}</span>
      </span>
      <BaseIcon
        class="user-menu__chevron"
        :name="placement === 'up' ? 'chevron-up' : 'chevron-down'"
        :size="16"
      />
    </button>

    <div v-show="open" :id="menuId" class="user-menu__panel">
      <p class="user-menu__panel-head">
        <strong>{{ fullName }}</strong>
        <span>{{ auth.user.email }}</span>
        <span>{{ roleLabel }}</span>
      </p>
      <ul class="user-menu__list">
        <li>
          <RouterLink :to="{ name: RouteName.Settings }" class="user-menu__item" @click="close()">
            <BaseIcon name="settings" :size="16" /> Paramètres
          </RouterLink>
        </li>
        <li>
          <RouterLink
            :to="{ name: RouteName.PrivacySettings }"
            class="user-menu__item"
            @click="close()"
          >
            <BaseIcon name="shield" :size="16" /> Confidentialité et données
          </RouterLink>
        </li>
        <li v-if="isMock">
          <button type="button" class="user-menu__item" @click="logout(true)">
            <BaseIcon name="users" :size="16" /> Changer de compte de démonstration
          </button>
        </li>
        <li>
          <button type="button" class="user-menu__item" data-testid="logout" @click="logout()">
            <BaseIcon name="logout" :size="16" /> Se déconnecter
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
  min-width: 0;
}

.user-menu__button {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--touch-target);
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  text-align: left;
}

.user-menu__button:hover {
  background: var(--color-surface-sunken);
}

.user-menu--dark .user-menu__button {
  color: var(--color-text-inverse);
}

.user-menu--dark .user-menu__button:hover {
  background: var(--color-sidebar-hover);
}

.user-menu__button:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 0;
}

.user-menu--dark .user-menu__button:focus-visible {
  outline-color: var(--color-focus-inverse);
}

.user-menu__avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-full);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.user-menu__identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: var(--line-height-snug);
}

.user-menu__name {
  overflow: hidden;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__role {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.user-menu--dark .user-menu__role {
  color: var(--color-sidebar-text-muted);
}

.user-menu__panel {
  position: absolute;
  z-index: var(--z-dropdown);
  right: 0;
  min-width: 16rem;
  max-width: calc(100vw - 2rem);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  color: var(--color-text);
}

.user-menu--down .user-menu__panel {
  top: calc(100% + var(--space-1));
}

.user-menu--up .user-menu__panel {
  bottom: calc(100% + var(--space-1));
  left: 0;
  right: auto;
}

.user-menu__panel-head {
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-3) var(--space-3);
  margin-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border-subtle);
  font-size: var(--font-size-sm);
}

.user-menu__panel-head span {
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.user-menu__list {
  padding: 0;
  list-style: none;
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 2.5rem;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text);
  font-size: var(--font-size-sm);
  text-align: left;
  text-decoration: none;
}

.user-menu__item:hover {
  background: var(--color-surface-sunken);
}

.user-menu__item:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}

/* Bouton compact (barre mobile) : seulement l'avatar */
@media (max-width: 1023.98px) {
  .user-menu--light .user-menu__identity,
  .user-menu--light .user-menu__chevron {
    display: none;
  }
}
</style>
