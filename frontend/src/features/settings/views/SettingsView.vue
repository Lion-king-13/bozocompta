<script setup lang="ts">
/**
 * Paramètres : profil (lecture seule en démonstration), préférences d'affichage (conservées
 * dans ce navigateur), offre de l'organisation et quota IA, lien vers la confidentialité.
 */
import { computed, reactive, watch } from 'vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import AiProvenanceLegend from '@/components/ui/AiProvenanceLegend.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { useAsync } from '@/composables/useAsync'
import { usePreferences } from '@/composables/usePreferences'
import { useToasts } from '@/composables/useToasts'
import { getPlan } from '@/config/plans'
import { formatCents } from '@/core/money'
import { ROLE_LABELS } from '@/domain'
import { ROLE_DESCRIPTIONS } from '@/features/auth/roleDescriptions'
import { RouteName } from '@/router/routeNames'
import { useServices } from '@/services'
import { useAuthStore } from '@/stores/auth'

const services = useServices()
const auth = useAuthStore()
const toast = useToasts()
const preferences = usePreferences()

const organization = useAsync(() => services.organization.getCurrentOrganization())
const entities = useAsync(() => services.organization.listEntities())
const canSeeUsage = computed(() => auth.can('ai-usage:read'))
const usage = useAsync(() => services.aiUsage.getUsageSummary(), { immediate: false })
watch(canSeeUsage, (can) => can && void usage.run(), { immediate: true })

const plan = computed(() =>
  organization.data.value ? getPlan(organization.data.value.planId) : null,
)
const memberEntities = computed(() => {
  const list = entities.data.value ?? []
  return list.map((e) => e.name).join(', ') || '—'
})

// Préférences : copie locale, enregistrée au clic
const draft = reactive({
  defaultEntityId: preferences.value.defaultEntityId ?? '',
  showAiLegend: preferences.value.showAiLegend,
})
const entityOptions = computed(() => [
  {
    value: '',
    label:
      auth.role === 'admin' || auth.role === 'finance'
        ? 'Organisation consolidée'
        : 'Toutes mes entités',
  },
  ...(entities.data.value ?? []).map((e) => ({ value: e.id, label: e.name })),
])

function savePreferences() {
  preferences.value = {
    defaultEntityId: draft.defaultEntityId || null,
    showAiLegend: draft.showAiLegend,
  }
  toast.success('Préférences enregistrées sur cet appareil.')
}

const numberFormat = new Intl.NumberFormat('fr-BE')
</script>

<template>
  <div class="settings">
    <PageHeader
      title="Paramètres"
      description="Votre profil, vos préférences d’affichage et l’offre de votre organisation."
    />

    <div class="grid">
      <BaseCard
        title="Profil"
        description="Lecture seule en démonstration : la modification sera disponible avec le serveur."
      >
        <dl v-if="auth.user" class="details" data-testid="profile">
          <div>
            <dt>Nom</dt>
            <dd>{{ auth.user.firstName }} {{ auth.user.lastName }}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{{ auth.user.email }}</dd>
          </div>
          <div>
            <dt>Fonction</dt>
            <dd>{{ auth.user.jobTitle }}</dd>
          </div>
          <div>
            <dt>Rôle</dt>
            <dd>{{ ROLE_LABELS[auth.user.role] }}</dd>
          </div>
          <div>
            <dt>Entités</dt>
            <dd>{{ memberEntities }}</dd>
          </div>
        </dl>
        <p v-if="auth.user" class="note">{{ ROLE_DESCRIPTIONS[auth.user.role] }}</p>
      </BaseCard>

      <BaseCard title="Préférences" description="Conservées dans ce navigateur uniquement.">
        <form class="form" @submit.prevent="savePreferences">
          <BaseSelect
            v-model="draft.defaultEntityId"
            label="Périmètre par défaut"
            :options="entityOptions"
            hint="Appliqué à l’ouverture de l’application."
          />
          <BaseCheckbox
            v-model="draft.showAiLegend"
            label="Afficher la légende de provenance IA"
            description="Affiche, sur les écrans de facture, une légende des badges « Extrait par l’IA », « Corrigé », « Validé »…"
          />
          <AiProvenanceLegend v-if="draft.showAiLegend" compact title="Aperçu de la légende" />
          <p class="form__readonly">
            Langue et formats : français, montants et dates au format belge (3 000,00 € ·
            20/11/2026).
          </p>
          <div>
            <BaseButton type="submit" icon="check">Enregistrer les préférences</BaseButton>
          </div>
        </form>
      </BaseCard>

      <BaseCard title="Offre de l’organisation" class="span-2">
        <LoadingSkeleton
          v-if="organization.loading.value"
          variant="text"
          :rows="3"
          label="Chargement de l’offre"
        />
        <ErrorMessage :error="organization.error.value" @retry="organization.run" />
        <div v-if="plan && organization.data.value" class="plan" data-testid="current-plan">
          <div class="plan__summary">
            <p class="plan__org">{{ organization.data.value.name }}</p>
            <p class="plan__name">Offre {{ plan.name }}</p>
            <p class="plan__price">
              {{ formatCents(plan.monthlyPriceCents) }} HT / mois
              <span>· tarif indicatif, non contractuel</span>
            </p>
            <ul class="plan__limits">
              <li>
                {{ plan.maxEntities }} {{ plan.maxEntities > 1 ? 'entités' : 'entité' }} maximum
              </li>
              <li>Jusqu’à {{ plan.maxUsers }} utilisateurs</li>
              <li>
                {{ numberFormat.format(plan.includedAiTokensPerMonth) }} tokens IA inclus par mois
              </li>
            </ul>
          </div>
          <div class="plan__quota">
            <template v-if="canSeeUsage">
              <LoadingSkeleton
                v-if="usage.loading.value"
                variant="text"
                :rows="2"
                label="Chargement du quota IA"
              />
              <ErrorMessage :error="usage.error.value" @retry="usage.run" />
              <ProgressBar
                v-if="usage.data.value"
                label="Quota IA du mois"
                :value="usage.data.value.totalTokens"
                :max="usage.data.value.includedTokens"
                :value-text="`${numberFormat.format(usage.data.value.totalTokens)} tokens sur ${numberFormat.format(usage.data.value.includedTokens)}`"
              />
              <RouterLink :to="{ name: RouteName.AiUsage }" class="link"
                >Voir la consommation IA détaillée</RouterLink
              >
            </template>
            <p v-else class="note">
              La consommation détaillée de l’IA est visible par les administrateurs et la finance.
            </p>
            <p v-if="plan.aiHardLimit" class="note">
              À 100 %, les fonctions IA sont suspendues jusqu’au mois suivant ; la saisie des
              factures et les rapprochements manuels restent disponibles.
            </p>
          </div>
        </div>
      </BaseCard>

      <BaseCard title="Confidentialité" class="span-2">
        <p>
          Export de vos données, suppression de votre compte et transparence sur l’utilisation de
          l’IA.
        </p>
        <p class="links">
          <RouterLink
            v-if="auth.can('privacy:self')"
            :to="{ name: RouteName.PrivacySettings }"
            class="link"
            >Gérer mes données</RouterLink
          >
          <RouterLink :to="{ name: RouteName.PublicPrivacy }" class="link"
            >Politique de confidentialité et transparence IA</RouterLink
          >
        </p>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
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

.details {
  display: flex;
  flex-direction: column;
}

.details div {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border-subtle);
  font-size: var(--font-size-sm);
}

.details dt {
  color: var(--color-text-secondary);
}

.details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.note {
  margin-top: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__readonly {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.plan {
  display: grid;
  gap: var(--space-6);
}

@media (min-width: 768px) {
  .plan {
    grid-template-columns: 1fr 1fr;
  }
}

.plan__org {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.plan__name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.plan__price {
  margin-top: var(--space-1);
  font-variant-numeric: tabular-nums;
}

.plan__price span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.plan__limits {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-3);
  padding-left: var(--space-5);
  font-size: var(--font-size-sm);
}

.plan__quota {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  margin-top: var(--space-3);
}

.link {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
