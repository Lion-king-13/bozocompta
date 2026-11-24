<script setup lang="ts">
/**
 * Suggestion de rapprochement : facture et transaction côte à côte, score INDICATIF et
 * raisons lisibles. La suggestion ne devient définitive qu'après une action humaine.
 */
import { AiProvenanceBadge, BaseAlert, BaseButton } from '@/components/ui'
import { formatIsoDate } from '@/core/dates/dates'
import { formatBasisPoints, formatCents } from '@/core/money'
import type { BankTransactionView, Invoice, Reconciliation } from '@/domain'

defineProps<{
  reconciliation: Reconciliation
  invoice: Invoice | undefined
  transaction: BankTransactionView | undefined
  supplierName: string
  cardText: string
  canDecide: boolean
  busy: boolean
}>()
defineEmits<{ confirm: []; reject: [] }>()
</script>

<template>
  <article class="rec" data-testid="suggestion-card" :data-id="reconciliation.id">
    <header class="rec__header">
      <AiProvenanceBadge provenance="suggested" />
      <span v-if="reconciliation.confidenceBp !== null" class="rec__score">
        Score indicatif : {{ formatBasisPoints(reconciliation.confidenceBp) }}
      </span>
      <ul class="rec__reasons" aria-label="Raisons de la suggestion">
        <li v-for="reason in reconciliation.matchReasons" :key="reason">{{ reason }}</li>
      </ul>
    </header>

    <div class="rec__pair">
      <section class="rec__side" aria-label="Facture">
        <h3 class="rec__title">Facture</h3>
        <template v-if="invoice">
          <p class="rec__main">{{ supplierName }}</p>
          <p class="text-secondary">
            N° {{ invoice.number }} · émise le {{ formatIsoDate(invoice.issueDate) }}
          </p>
          <p class="rec__amount tabular-nums">{{ formatCents(invoice.totalInclVatCents) }} TTC</p>
        </template>
        <p v-else class="text-secondary">Facture non visible.</p>
      </section>
      <span class="rec__link" aria-hidden="true">⇄</span>
      <section class="rec__side" aria-label="Transaction">
        <h3 class="rec__title">Transaction</h3>
        <template v-if="transaction">
          <p class="rec__main">{{ transaction.label }}</p>
          <p class="text-secondary">
            {{ formatIsoDate(transaction.bookingDate) }} · {{ cardText }}
          </p>
          <p class="rec__amount tabular-nums">{{ formatCents(transaction.amountCents) }}</p>
        </template>
        <p v-else class="text-secondary">Transaction non visible.</p>
      </section>
    </div>

    <!-- Écart de montant (QA-25) : dit clairement AVANT la confirmation. -->
    <BaseAlert
      v-if="reconciliation.amountDifferenceCents !== 0"
      tone="warning"
      :title="`Écart de ${formatCents(Math.abs(reconciliation.amountDifferenceCents))}`"
      data-testid="amount-gap"
    >
      Le paiement est {{ reconciliation.amountDifferenceCents < 0 ? 'inférieur' : 'supérieur' }} au
      total de la facture. Confirmez seulement si cet écart est justifié (remise, frais…).
    </BaseAlert>

    <footer v-if="canDecide" class="rec__actions">
      <BaseButton
        variant="secondary"
        :disabled="busy"
        data-testid="reject-suggestion"
        @click="$emit('reject')"
        >Ce n'est pas la bonne transaction</BaseButton
      >
      <BaseButton
        icon="check"
        :loading="busy"
        data-testid="confirm-suggestion"
        @click="$emit('confirm')"
        >{{
          reconciliation.amountDifferenceCents !== 0
            ? 'Confirmer malgré l’écart'
            : 'Confirmer le rapprochement'
        }}</BaseButton
      >
    </footer>
  </article>
</template>

<style scoped>
.rec {
  border: 1px dashed var(--color-ai-suggested-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.rec__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}
.rec__score {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.rec__reasons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.rec__reasons li::before {
  content: '✓ ';
}
.rec__pair {
  display: grid;
  gap: var(--space-3);
}
@media (min-width: 768px) {
  .rec__pair {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: stretch;
  }
}
.rec__side {
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
.rec__side p {
  margin: var(--space-1) 0;
}
.rec__title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-1);
}
.rec__main {
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.rec__amount {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
.rec__link {
  align-self: center;
  justify-self: center;
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
}

.rec__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}
@media (max-width: 479px) {
  .rec__actions {
    flex-direction: column-reverse;
  }
}
</style>
