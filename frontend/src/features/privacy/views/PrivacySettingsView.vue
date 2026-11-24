<script setup lang="ts">
/**
 * Confidentialité et données (authentifié) : export, suppression du compte, suppression des
 * données de l'organisation (admin), réinitialisation de la démonstration.
 * En mode démo, les effets sont réels sur les données en mémoire jusqu'au rechargement
 * de la page (arbitrage D13).
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import ErrorMessage from '@/components/ErrorMessage.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import DataTable from '@/components/ui/DataTable.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { DataTableColumn } from '@/components/ui/types'
import { useAsync } from '@/composables/useAsync'
import { useToasts } from '@/composables/useToasts'
import { toApiError, type ApiError } from '@/core/errors'
import type { DataExport, DeletionScope } from '@/domain'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'
import ConfirmDeletionDialog from '../components/ConfirmDeletionDialog.vue'

const services = useServices()
const auth = useAuthStore()
const router = useRouter()
const toast = useToasts()
const isMock = services.mode === 'mock'
const canDeleteOrganization = computed(() => auth.can('privacy:organization'))

const history = useAsync(() => services.privacy.listDeletionRequests())

// ---- Export
const exporting = ref(false)
const exportError = ref<ApiError | null>(null)
const lastExport = ref<DataExport | null>(null)
const downloadUrl = ref<string | null>(null)

async function exportData() {
  exporting.value = true
  exportError.value = null
  try {
    const result = await services.privacy.exportMyData()
    lastExport.value = result
    if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
    downloadUrl.value = URL.createObjectURL(
      new Blob([result.content], { type: 'application/json' }),
    )
    toast.success('Export prêt : vous pouvez télécharger le fichier.')
  } catch (e) {
    exportError.value = toApiError(e)
  } finally {
    exporting.value = false
  }
}

onBeforeUnmount(() => {
  if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
})

// ---- Suppressions
const dialog = ref<DeletionScope | null>(null)
const deleting = ref(false)
const deletionError = ref<ApiError | null>(null)
const accountDialogOpen = computed({
  get: () => dialog.value === 'my_account',
  set: (v: boolean) => (dialog.value = v ? 'my_account' : null),
})
const organizationDialogOpen = computed({
  get: () => dialog.value === 'organization',
  set: (v: boolean) => (dialog.value = v ? 'organization' : null),
})

function openDeletion(scope: DeletionScope) {
  deletionError.value = null
  dialog.value = scope
}

async function confirmDeletion() {
  const scope = dialog.value
  if (!scope) return
  deleting.value = true
  deletionError.value = null
  try {
    await services.privacy.requestDeletion(scope)
    dialog.value = null
    if (scope === 'my_account') {
      await auth.logout()
      toast.success('Votre compte de démonstration et vos données personnelles ont été supprimés.')
      await router.push({ name: RouteName.Landing })
    } else {
      toast.success('Les données financières de l’organisation ont été supprimées.')
      void history.run()
    }
  } catch (e) {
    deletionError.value = toApiError(e)
  } finally {
    deleting.value = false
  }
}

// ---- Réinitialisation de la démonstration
const resetOpen = ref(false)
const resetting = ref(false)
const resetError = ref<ApiError | null>(null)

async function resetDemo() {
  resetting.value = true
  resetError.value = null
  try {
    await services.privacy.resetDemoData()
    resetOpen.value = false
    toast.success('Les données de démonstration ont été réinitialisées.')
    void history.run()
  } catch (e) {
    resetError.value = toApiError(e)
  } finally {
    resetting.value = false
  }
}

const historyColumns: DataTableColumn[] = [
  { key: 'requestedAt', label: 'Date' },
  { key: 'scope', label: 'Portée' },
  { key: 'status', label: 'Statut' },
]
const dateTime = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'short', timeStyle: 'short' })
const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
</script>

<template>
  <div class="privacy-settings">
    <PageHeader
      title="Confidentialité et données"
      description="Exportez vos données, demandez leur suppression et consultez ce que CashLens fait de vos informations."
    />

    <BaseAlert v-if="isMock" tone="info" title="Effets simulés">
      En démonstration, export et suppression agissent sur les données fictives en mémoire. Un
      rechargement de la page restaure le jeu de données initial.
    </BaseAlert>

    <div class="grid">
      <BaseCard title="Vos données dans CashLens" class="span-2">
        <ul class="facts">
          <li>
            <BaseIcon name="user" :size="18" /> Profil : nom, e-mail, rôle et entités de
            rattachement.
          </li>
          <li>
            <BaseIcon name="card" :size="18" /> Cartes identifiées par leurs quatre derniers
            chiffres et transactions associées.
          </li>
          <li>
            <BaseIcon name="sparkle" :size="18" /> Utilisation de l’IA : fonctionnalité, tokens,
            coût estimé. La démonstration n’appelle aucun service d’IA réel.
          </li>
        </ul>
        <p class="muted">
          <RouterLink :to="{ name: RouteName.PublicPrivacy }"
            >Lire la politique de confidentialité et de transparence IA</RouterLink
          >
        </p>
      </BaseCard>

      <BaseCard
        title="Exporter mes données"
        description="Fichier JSON avec votre profil, vos cartes, leurs transactions et votre utilisation de l’IA."
      >
        <div class="stack">
          <BaseButton
            icon="download"
            :loading="exporting"
            data-testid="export-data"
            @click="exportData"
          >
            Préparer l’export
          </BaseButton>
          <p v-if="lastExport && downloadUrl" class="export-ready" data-testid="export-ready">
            <BaseIcon name="check-circle" :size="18" />
            <span>
              Export généré le {{ formatDateTime(lastExport.requestedAt) }}.
              <a :href="downloadUrl" :download="lastExport.fileName"
                >Télécharger {{ lastExport.fileName }}</a
              >
            </span>
          </p>
          <ErrorMessage :error="exportError" @retry="exportData" />
        </div>
      </BaseCard>

      <BaseCard
        title="Supprimer mon compte"
        description="Efface vos données personnelles (pseudonymisation), désactive le compte, puis vous déconnecte."
      >
        <BaseButton
          variant="danger"
          icon="trash"
          data-testid="delete-account"
          @click="openDeletion('my_account')"
        >
          Supprimer mon compte…
        </BaseButton>
      </BaseCard>

      <BaseCard
        v-if="canDeleteOrganization"
        title="Supprimer les données de l’organisation"
        description="Réservé aux administrateurs : factures, transactions, allocations, budgets et historique IA de toutes les entités."
      >
        <BaseButton
          variant="danger"
          icon="trash"
          data-testid="delete-organization"
          @click="openDeletion('organization')"
        >
          Supprimer les données…
        </BaseButton>
      </BaseCard>

      <BaseCard
        v-if="isMock"
        title="Réinitialiser la démonstration"
        description="Restaure toutes les données fictives d’origine (utile après une suppression ou des tests)."
      >
        <BaseButton
          variant="secondary"
          icon="refresh"
          data-testid="reset-demo"
          @click="resetOpen = true"
        >
          Réinitialiser les données…
        </BaseButton>
      </BaseCard>

      <BaseCard title="Historique de vos demandes" class="span-2" flush>
        <ErrorMessage :error="history.error.value" @retry="history.run" />
        <DataTable
          v-if="!history.error.value"
          :columns="historyColumns"
          :rows="history.data.value ?? []"
          row-key="id"
          caption="Historique des demandes de suppression"
        >
          <template #cell-requestedAt="{ row }">{{ formatDateTime(row.requestedAt) }}</template>
          <template #cell-scope="{ row }">{{
            row.scope === 'organization' ? 'Organisation' : 'Mon compte'
          }}</template>
          <template #cell-status="{ row }">
            <StatusBadge
              :tone="
                row.status === 'completed'
                  ? 'success'
                  : row.status === 'pending'
                    ? 'warning'
                    : 'neutral'
              "
              :label="
                row.status === 'completed'
                  ? 'Traitée'
                  : row.status === 'pending'
                    ? 'En cours'
                    : 'Annulée'
              "
              size="sm"
            />
          </template>
          <template #empty>Aucune demande de suppression pour l’instant.</template>
        </DataTable>
      </BaseCard>
    </div>

    <ConfirmDeletionDialog
      v-model:open="accountDialogOpen"
      title="Supprimer votre compte ?"
      confirm-label="Supprimer mon compte"
      :loading="deleting"
      :error="deletionError"
      @confirm="confirmDeletion"
    >
      <p>Ce qui se passe :</p>
      <ul>
        <li>
          votre nom, votre e-mail et votre fonction sont effacés et remplacés par « Utilisateur
          supprimé »&nbsp;;
        </li>
        <li>votre compte est désactivé et vos cartes sont bloquées&nbsp;;</li>
        <li>
          les pièces et la consommation IA liées à votre compte sont conservées, sans votre nom,
          pour que les comptes de l’organisation restent justes.
        </li>
      </ul>
      <p>
        Certaines pièces peuvent devoir être conservées pour des obligations légales&nbsp;; la durée
        sera précisée par le groupe.
      </p>
      <p>Vous serez déconnecté immédiatement.</p>
    </ConfirmDeletionDialog>

    <ConfirmDeletionDialog
      v-model:open="organizationDialogOpen"
      title="Supprimer les données de l’organisation ?"
      confirm-label="Supprimer les données"
      :loading="deleting"
      :error="deletionError"
      @confirm="confirmDeletion"
    >
      <p>
        Toutes les données financières de toutes les entités seront supprimées : factures,
        transactions, rapprochements, allocations, budgets, abonnements, analyses et consommation
        IA.
      </p>
      <p>
        Certaines pièces peuvent devoir être conservées pour des obligations légales&nbsp;; la durée
        sera précisée par le groupe.
      </p>
    </ConfirmDeletionDialog>

    <BaseDialog v-model:open="resetOpen" title="Réinitialiser la démonstration ?" size="sm">
      <p>
        Toutes les données fictives reviennent à leur état d’origine. Vos modifications de la
        session seront perdues.
      </p>
      <ErrorMessage :error="resetError" @retry="resetDemo" />
      <template #footer>
        <BaseButton variant="secondary" :disabled="resetting" @click="resetOpen = false"
          >Annuler</BaseButton
        >
        <BaseButton
          icon="refresh"
          :loading="resetting"
          data-testid="confirm-reset"
          @click="resetDemo"
          >Réinitialiser</BaseButton
        >
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.privacy-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.grid {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }

  .span-2 {
    grid-column: span 2;
  }
}

.facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0;
  list-style: none;
}

.facts li {
  display: flex;
  gap: var(--space-3);
}

.facts svg {
  margin-top: 2px;
  color: var(--color-primary);
}

.muted {
  margin-top: var(--space-4);
  font-size: var(--font-size-sm);
}

.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.export-ready {
  display: flex;
  gap: var(--space-2);
  color: var(--color-success-text);
  font-size: var(--font-size-sm);
}
</style>
