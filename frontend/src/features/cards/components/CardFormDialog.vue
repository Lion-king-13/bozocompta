<script setup lang="ts">
/**
 * Création / modification d'une carte. Une carte appartient à UNE entité et à UN titulaire
 * (membre de cette entité). On ne saisit JAMAIS le numéro complet : seulement 4 chiffres fictifs.
 */
import { computed, reactive, ref, watch } from 'vue'
import { BaseAlert, BaseButton, BaseDialog, BaseSelect, BaseTextField } from '@/components/ui'
import { toApiError, type ApiError } from '@/core/errors'
import { parseAmountToCents } from '@/core/money'
import type { Card, CardStatus, LegalEntity, User } from '@/domain'
import { useServices } from '@/services'
import type { CardInput } from '@/services/cards/CardService'
import { centsToInput } from '@/features/transactions/shared/percent'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  /** Carte à modifier ; null = création. */
  card: Card | null
  entities: LegalEntity[]
  users: User[]
  entityName: (id: string) => string
}>()
const emit = defineEmits<{ saved: [card: Card] }>()

const services = useServices()
const form = reactive({
  label: '',
  entityId: '',
  holderUserId: '',
  last4: '',
  network: 'visa' as Card['network'],
  limit: '',
  expiresAt: '',
  status: 'active' as CardStatus,
})
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const apiError = ref<ApiError | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  const c = props.card
  Object.assign(form, {
    label: c?.label ?? '',
    entityId: c?.entityId ?? props.entities[0]?.id ?? '',
    holderUserId: c?.holderUserId ?? '',
    last4: c?.last4 ?? '',
    network: c?.network ?? 'visa',
    limit: c ? centsToInput(c.monthlyLimitCents) : '',
    expiresAt: c?.expiresAt ?? '',
    status: c?.status ?? 'active',
  })
  errors.value = {}
  apiError.value = null
})

const entityOptions = computed(() =>
  props.entities.map((e) => ({ value: e.id, label: props.entityName(e.id) })),
)
/** Seuls les membres de l'entité choisie peuvent être titulaires. */
const holderOptions = computed(() =>
  props.users
    .filter((u) => u.entityIds.includes(form.entityId))
    .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
)
watch(
  () => form.entityId,
  () => {
    if (!holderOptions.value.some((o) => o.value === form.holderUserId)) form.holderUserId = ''
  },
)

function validate(): CardInput | null {
  const e: Record<string, string> = {}
  if (!form.label.trim()) e.label = 'Le libellé est requis.'
  if (!form.entityId) e.entityId = "Choisissez l'entité de la carte."
  if (!form.holderUserId) e.holderUserId = 'Choisissez le titulaire.'
  if (!/^\d{4}$/.test(form.last4)) e.last4 = 'Exactement 4 chiffres (jamais le numéro complet).'
  const limit = parseAmountToCents(form.limit)
  if (limit === null || limit < 0) e.limit = 'Plafond invalide (ex. 1500).'
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.expiresAt)) e.expiresAt = 'Format AAAA-MM (ex. 2028-06).'
  errors.value = e
  if (Object.keys(e).length > 0 || limit === null) return null
  return {
    label: form.label.trim(),
    entityId: form.entityId,
    holderUserId: form.holderUserId,
    last4: form.last4,
    network: form.network,
    monthlyLimitCents: limit,
    expiresAt: form.expiresAt,
    status: form.status,
  }
}

async function save() {
  const input = validate()
  if (!input) return
  saving.value = true
  apiError.value = null
  try {
    const saved = props.card
      ? await services.cards.updateCard(props.card.id, input)
      : await services.cards.createCard(input)
    emit('saved', saved)
    open.value = false
  } catch (e) {
    apiError.value = toApiError(e)
    for (const d of apiError.value.details)
      errors.value[d.field === 'monthlyLimitCents' ? 'limit' : d.field] = d.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="card ? 'Modifier la carte' : 'Ajouter une carte'"
    size="md"
    :persistent="saving"
  >
    <div class="grid">
      <BaseTextField
        v-model="form.label"
        label="Libellé"
        required
        :error="errors.label"
        class="wide"
      />
      <BaseSelect
        v-model="form.entityId"
        label="Entité de la carte"
        :options="entityOptions"
        required
        :error="errors.entityId"
      />
      <BaseSelect
        v-model="form.holderUserId"
        label="Titulaire"
        :options="holderOptions"
        placeholder="Choisir un collaborateur"
        required
        :error="errors.holderUserId"
        hint="Membre de l'entité choisie."
      />
      <BaseTextField
        v-model="form.last4"
        label="4 derniers chiffres"
        inputmode="numeric"
        required
        :error="errors.last4"
        hint="Données fictives : ne saisissez jamais un numéro complet ni un cryptogramme."
      />
      <BaseSelect
        v-model="form.network"
        label="Réseau"
        :options="[
          { value: 'visa', label: 'Visa' },
          { value: 'mastercard', label: 'Mastercard' },
        ]"
      />
      <BaseTextField
        v-model="form.limit"
        label="Plafond mensuel"
        inputmode="decimal"
        suffix="€"
        required
        :error="errors.limit"
      />
      <BaseTextField
        v-model="form.expiresAt"
        label="Expiration (AAAA-MM)"
        placeholder="2028-06"
        required
        :error="errors.expiresAt"
      />
      <BaseSelect
        v-if="card"
        v-model="form.status"
        label="Statut"
        :options="[
          { value: 'active', label: 'Active' },
          { value: 'blocked', label: 'Bloquée' },
          { value: 'expired', label: 'Expirée' },
        ]"
      />
    </div>
    <BaseAlert v-if="apiError" tone="danger" live :data-code="apiError.code"
      >{{ apiError.message }} Votre saisie est conservée.</BaseAlert
    >
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="open = false">Annuler</BaseButton>
      <BaseButton icon="check" :loading="saving" data-testid="save-card" @click="save"
        >Enregistrer</BaseButton
      >
    </template>
  </BaseDialog>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
  margin-bottom: var(--space-3);
}
.wide {
  grid-column: 1 / -1;
}
</style>
