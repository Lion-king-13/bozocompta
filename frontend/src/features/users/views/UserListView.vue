<script setup lang="ts">
/**
 * Collaborateurs : rôle, entités (un collaborateur peut appartenir à plusieurs entités),
 * cartes et dépenses (cumul annuel, calcul unique SpendReport).
 * L'invitation est SIMULÉE : aucun e-mail n'est envoyé et aucun compte n'est créé.
 */
import { reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  BaseAlert,
  BaseButton,
  BaseCard,
  BaseCheckbox,
  BaseDialog,
  BaseSelect,
  BaseTextField,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { formatCents } from '@/core/money'
import { useAsync } from '@/composables/useAsync'
import { ROLES, ROLE_LABELS, type Role } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import { useEntityScopeStore } from '@/stores/entityScope'
import AsyncContent from '@/features/transactions/shared/AsyncContent.vue'
import { useReferenceData } from '@/features/transactions/shared/useReferenceData'

const services = useServices()
const auth = useAuthStore()
const scope = useEntityScopeStore()
const refData = useReferenceData()
void refData.load()

const users = useAsync(() =>
  services.users.listUsers({ entityId: scope.selectedEntityId ?? undefined }),
)
const summary = useAsync(() => services.dashboard.getSummary({ entityId: null }))
watch(
  () => scope.selectedEntityId,
  () => void users.run(),
)

function cardCount(userId: string): number {
  return refData.cards.value.filter((c) => c.holderUserId === userId).length
}
function spendOf(userId: string): number {
  return summary.data.value?.spend.byUser.find((b) => b.key === userId)?.amountCents ?? 0
}

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Collaborateur' },
  { key: 'email', label: 'E-mail', hideOnMobile: true },
  { key: 'role', label: 'Rôle' },
  { key: 'entities', label: 'Entités' },
  { key: 'cards', label: 'Cartes', numeric: true },
  { key: 'spend', label: 'Dépenses carte (année)', numeric: true },
]

/* ---- Invitation simulée ---- */
const inviteOpen = ref(false)
const invite = reactive({
  firstName: '',
  lastName: '',
  email: '',
  role: 'member' as Role,
  entityIds: [] as string[],
})
const inviteErrors = ref<Record<string, string>>({})
const invited = ref('')

function openInvite() {
  Object.assign(invite, { firstName: '', lastName: '', email: '', role: 'member', entityIds: [] })
  inviteErrors.value = {}
  inviteOpen.value = true
}
function toggleEntity(id: string, checked: boolean) {
  invite.entityIds = checked ? [...invite.entityIds, id] : invite.entityIds.filter((e) => e !== id)
}
function sendInvite() {
  const e: Record<string, string> = {}
  if (!invite.firstName.trim()) e.firstName = 'Prénom requis.'
  if (!invite.lastName.trim()) e.lastName = 'Nom requis.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(invite.email.trim())) e.email = 'Adresse e-mail invalide.'
  if (invite.entityIds.length === 0) e.entityIds = 'Choisissez au moins une entité.'
  inviteErrors.value = e
  if (Object.keys(e).length > 0) return
  invited.value = `Invitation simulée pour ${invite.firstName} ${invite.lastName} (${ROLE_LABELS[invite.role]}) : aucun e-mail n'a été envoyé et aucun compte n'a été créé.`
  inviteOpen.value = false
}

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))

function retry() {
  void refData.load()
  void users.run()
  void summary.run()
}
</script>

<template>
  <div class="stack" style="--stack-gap: var(--space-5)">
    <PageHeader
      title="Collaborateurs"
      description="Membres de l'organisation, leurs rôles (simulés), entités et cartes."
    >
      <template #actions>
        <BaseButton v-if="auth.can('users:manage')" icon="plus" @click="openInvite"
          >Inviter un collaborateur</BaseButton
        >
      </template>
    </PageHeader>

    <BaseAlert
      v-if="invited"
      tone="info"
      title="Invitation simulée"
      live
      dismissible
      data-testid="invite-feedback"
      @dismiss="invited = ''"
    >
      {{ invited }}
    </BaseAlert>
    <p class="text-secondary small">
      Rôles et droits provisoires : ils adaptent l'affichage. Le contrôle réel des accès est fait
      par le serveur.
    </p>

    <AsyncContent
      :loading="users.loading.value && !users.data.value"
      :error="users.error.value ?? refData.error.value"
      error-title="Impossible de charger les collaborateurs"
      @retry="retry"
    >
      <BaseCard flush>
        <DataTable
          :columns="columns"
          :rows="users.data.value ?? []"
          row-key="id"
          caption="Collaborateurs de l'organisation"
        >
          <template #cell-name="{ row }">
            <RouterLink :to="{ name: RouteName.UserDetail, params: { userId: row.id } }"
              >{{ row.firstName }} {{ row.lastName }}</RouterLink
            >
            <span class="text-secondary"> · {{ row.jobTitle }}</span>
            <StatusBadge v-if="!row.active" status="inactive" size="sm" />
          </template>
          <template #cell-role="{ row }">{{ ROLE_LABELS[row.role] }}</template>
          <template #cell-entities="{ row }">
            <span class="badges">
              <StatusBadge
                v-for="id in row.entityIds"
                :key="id"
                tone="neutral"
                :label="refData.entityName(id)"
                icon="building"
                size="sm"
              />
            </span>
          </template>
          <template #cell-cards="{ row }">{{ cardCount(row.id) }}</template>
          <template #cell-spend="{ row }">{{ formatCents(spendOf(row.id)) }}</template>
          <template #empty
            ><EmptyState compact icon="users" title="Aucun collaborateur"
          /></template>
        </DataTable>
      </BaseCard>
    </AsyncContent>

    <BaseDialog
      v-model:open="inviteOpen"
      title="Inviter un collaborateur"
      description="Simulation : aucun e-mail ne sera envoyé."
      size="md"
    >
      <div class="grid">
        <BaseTextField
          v-model="invite.firstName"
          label="Prénom"
          required
          :error="inviteErrors.firstName"
        />
        <BaseTextField
          v-model="invite.lastName"
          label="Nom"
          required
          :error="inviteErrors.lastName"
        />
        <BaseTextField
          v-model="invite.email"
          type="email"
          label="E-mail"
          required
          :error="inviteErrors.email"
          class="wide"
        />
        <BaseSelect v-model="invite.role" label="Rôle" :options="roleOptions" />
        <fieldset class="entities">
          <legend>Entités</legend>
          <BaseCheckbox
            v-for="e in refData.entities.value"
            :key="e.id"
            :model-value="invite.entityIds.includes(e.id)"
            :label="refData.entityName(e.id)"
            @update:model-value="toggleEntity(e.id, $event)"
          />
          <p v-if="inviteErrors.entityIds" class="error" role="alert">
            {{ inviteErrors.entityIds }}
          </p>
        </fieldset>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="inviteOpen = false">Annuler</BaseButton>
        <BaseButton icon="check" @click="sendInvite">Envoyer l'invitation (simulée)</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.small {
  font-size: var(--font-size-sm);
  margin: 0;
}
.badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
}
.wide {
  grid-column: 1 / -1;
}
.entities {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.entities legend {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-2);
}
.error {
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
