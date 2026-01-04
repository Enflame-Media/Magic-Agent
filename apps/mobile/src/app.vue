<script setup lang="ts">
/**
 * Root Application Component
 *
 * Sets up the main Frame with navigation to the home view.
 * Uses NativeScript's Frame for native navigation stack.
 *
 * Includes global PaywallModal overlay that can be triggered
 * from anywhere via usePurchases().showPaywall().
 */
import { storeToRefs } from 'pinia';
import HomeView from './views/HomeView.vue';
import PaywallModal from './components/PaywallModal.vue';
import { usePurchasesStore } from './stores/purchases';

// ─────────────────────────────────────────────────────────────────────────────
// Purchases Store
// ─────────────────────────────────────────────────────────────────────────────

const purchasesStore = usePurchasesStore();
const { isPaywallVisible } = storeToRefs(purchasesStore);

// ─────────────────────────────────────────────────────────────────────────────
// Paywall Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handlePaywallClose(): void {
  purchasesStore.setPaywallVisible(false);
}

function handlePurchased(): void {
  purchasesStore.setPaywallVisible(false);
}

function handleRestored(): void {
  purchasesStore.setPaywallVisible(false);
}

function handlePaywallError(_message: string): void {
  // Error is already handled by the PaywallModal component
  // and displayed to the user. Nothing additional needed here.
}
</script>

<template>
  <GridLayout rows="*">
    <!-- Main Navigation Frame -->
    <Frame row="0">
      <HomeView />
    </Frame>

    <!-- Global Paywall Modal Overlay -->
    <PaywallModal
      row="0"
      :visible="isPaywallVisible"
      @close="handlePaywallClose"
      @purchased="handlePurchased"
      @restored="handleRestored"
      @error="handlePaywallError"
    />
  </GridLayout>
</template>
