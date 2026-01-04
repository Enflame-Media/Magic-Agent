<script setup lang="ts">
/**
 * PaywallModal - Subscription purchase modal for mobile
 *
 * Full-screen modal overlay for displaying subscription packages
 * and handling purchases. Uses NativeScript native UI components.
 *
 * Since the @mleleux/nativescript-revenuecat plugin does not support
 * native paywall UI, this component provides a custom implementation.
 *
 * @example
 * ```vue
 * <PaywallModal
 *   :visible="isPaywallVisible"
 *   @close="hidePaywall"
 *   @purchased="handlePurchased"
 * />
 * ```
 */
import { computed, ref, watch } from 'vue';
import { usePurchases } from '@/composables/usePurchases';
import type { Package } from '@happy-vue/shared';
import { PaywallResult } from '@happy-vue/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Control modal visibility */
  visible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
});

const emit = defineEmits<{
  /** Modal close requested */
  close: [];
  /** Purchase completed successfully */
  purchased: [];
  /** Purchase was cancelled */
  cancelled: [];
  /** Restore completed */
  restored: [];
  /** An error occurred */
  error: [message: string];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const {
  availablePackages,
  monthlyPackage,
  annualPackage,
  isLoading,
  isPurchasing,
  isRestoring,
  purchase,
  restorePurchases,
} = usePurchases();

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const selectedPackageId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

const isProcessing = computed(() => isPurchasing.value || isRestoring.value);

/** Packages to display, prioritizing annual then monthly */
const displayPackages = computed(() => {
  const packages: Package[] = [];

  // Add annual first (usually best value)
  if (annualPackage.value) {
    packages.push(annualPackage.value);
  }

  // Add monthly
  if (monthlyPackage.value) {
    packages.push(monthlyPackage.value);
  }

  // Add any other packages
  for (const pkg of availablePackages.value) {
    if (pkg !== annualPackage.value && pkg !== monthlyPackage.value) {
      packages.push(pkg);
    }
  }

  return packages;
});

/** Currently selected package */
const selectedPackage = computed(() => {
  if (!selectedPackageId.value) return null;
  return displayPackages.value.find((p) => p.identifier === selectedPackageId.value) ?? null;
});

/** Calculate savings for annual vs monthly */
const annualSavings = computed(() => {
  if (!monthlyPackage.value || !annualPackage.value) return null;

  const monthlyYearly = monthlyPackage.value.product.price * 12;
  const annualPrice = annualPackage.value.product.price;
  const savings = monthlyYearly - annualPrice;
  const percentage = Math.round((savings / monthlyYearly) * 100);

  return {
    amount: savings.toFixed(2),
    percentage,
    currency: monthlyPackage.value.product.currencyCode,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────────────────

// Auto-select annual package when packages load
watch(
  displayPackages,
  (packages) => {
    if (packages.length > 0 && !selectedPackageId.value) {
      // Select annual by default (first in list)
      selectedPackageId.value = packages[0].identifier;
    }
  },
  { immediate: true }
);

// Clear state when modal closes
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      errorMessage.value = null;
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Methods
// ─────────────────────────────────────────────────────────────────────────────

function selectPackage(pkg: Package): void {
  if (!isProcessing.value) {
    selectedPackageId.value = pkg.identifier;
  }
}

function isSelected(pkg: Package): boolean {
  return selectedPackageId.value === pkg.identifier;
}

function isAnnual(pkg: Package): boolean {
  return (
    pkg.packageType === 'annual' ||
    pkg.identifier.toLowerCase().includes('annual') ||
    pkg.identifier.toLowerCase().includes('year')
  );
}

async function handlePurchase(): Promise<void> {
  if (!selectedPackage.value || isProcessing.value) return;

  errorMessage.value = null;

  const result = await purchase(selectedPackage.value);

  switch (result) {
    case PaywallResult.PURCHASED:
      emit('purchased');
      emit('close');
      break;
    case PaywallResult.CANCELLED:
      emit('cancelled');
      break;
    case PaywallResult.ERROR:
      errorMessage.value = 'Purchase failed. Please try again.';
      emit('error', errorMessage.value);
      break;
  }
}

async function handleRestore(): Promise<void> {
  if (isProcessing.value) return;

  errorMessage.value = null;

  try {
    await restorePurchases();
    emit('restored');
    emit('close');
  } catch {
    errorMessage.value = 'Failed to restore purchases. Please try again.';
    emit('error', errorMessage.value);
  }
}

function handleClose(): void {
  if (!isProcessing.value) {
    emit('cancelled');
    emit('close');
  }
}
</script>

<template>
  <GridLayout
    v-if="visible"
    rows="auto, *, auto"
    class="modal-overlay"
  >
    <!-- Backdrop (tap to dismiss) -->
    <AbsoluteLayout
      row-span="3"
      class="backdrop"
      @tap="handleClose"
    />

    <!-- Modal Content -->
    <GridLayout
      row="1"
      rows="auto, auto, *, auto, auto"
      class="modal-container"
    >
      <!-- Header -->
      <StackLayout row="0" class="modal-header">
        <Label text="Upgrade to Pro" class="modal-title" />
        <Label text="Unlock all features and get the most out of Happy" class="modal-subtitle" />
      </StackLayout>

      <!-- Features List -->
      <StackLayout row="1" class="features-list">
        <GridLayout columns="auto, *" class="feature-item">
          <Label col="0" text="✓" class="check-icon" />
          <Label col="1" text="Unlimited sessions" class="feature-text" />
        </GridLayout>
        <GridLayout columns="auto, *" class="feature-item">
          <Label col="0" text="✓" class="check-icon" />
          <Label col="1" text="Sync across all devices" class="feature-text" />
        </GridLayout>
        <GridLayout columns="auto, *" class="feature-item">
          <Label col="0" text="✓" class="check-icon" />
          <Label col="1" text="Voice assistant integration" class="feature-text" />
        </GridLayout>
        <GridLayout columns="auto, *" class="feature-item">
          <Label col="0" text="✓" class="check-icon" />
          <Label col="1" text="Priority support" class="feature-text" />
        </GridLayout>
      </StackLayout>

      <!-- Package Selection -->
      <ScrollView row="2" class="packages-scroll">
        <StackLayout class="packages-container">
          <!-- Loading State -->
          <ActivityIndicator
            v-if="isLoading"
            busy="true"
            class="loading-indicator"
          />

          <!-- No Packages -->
          <Label
            v-else-if="displayPackages.length === 0"
            text="No subscription options available at this time."
            class="no-packages-text"
          />

          <!-- Package Cards -->
          <GridLayout
            v-for="pkg in displayPackages"
            :key="pkg.identifier"
            rows="auto, auto"
            columns="*, auto"
            :class="['package-card', { 'package-selected': isSelected(pkg) }]"
            @tap="selectPackage(pkg)"
          >
            <!-- Title and Description -->
            <StackLayout col="0" row="0" class="package-info">
              <StackLayout orientation="horizontal">
                <Label :text="pkg.product.title" class="package-title" />
                <Label
                  v-if="isAnnual(pkg) && annualSavings"
                  :text="`Save ${annualSavings.percentage}%`"
                  class="savings-badge"
                />
              </StackLayout>
              <Label :text="pkg.product.description" class="package-description" />
            </StackLayout>

            <!-- Selection Indicator -->
            <Label
              col="1"
              row="0"
              row-span="2"
              :text="isSelected(pkg) ? '●' : '○'"
              :class="['selection-indicator', { 'selected': isSelected(pkg) }]"
              vertical-alignment="center"
            />

            <!-- Price -->
            <StackLayout col="0" row="1" orientation="horizontal" class="price-container">
              <Label :text="pkg.product.priceString" class="price-text" />
              <Label
                :text="isAnnual(pkg) ? ' / year' : ' / month'"
                class="price-period"
              />
            </StackLayout>
          </GridLayout>
        </StackLayout>
      </ScrollView>

      <!-- Error Message -->
      <Label
        v-if="errorMessage"
        row="3"
        :text="errorMessage"
        class="error-message"
      />

      <!-- Action Buttons -->
      <StackLayout row="4" class="action-buttons">
        <!-- Subscribe Button -->
        <GridLayout
          :class="['subscribe-button', { 'button-disabled': !selectedPackage || isProcessing }]"
          @tap="handlePurchase"
        >
          <ActivityIndicator
            v-if="isPurchasing"
            busy="true"
            color="#ffffff"
            class="button-loader"
          />
          <Label
            v-else
            text="Subscribe Now"
            class="subscribe-button-text"
          />
        </GridLayout>

        <!-- Secondary Actions -->
        <GridLayout columns="*, *" class="secondary-actions">
          <Label
            col="0"
            :text="isRestoring ? 'Restoring...' : 'Restore Purchases'"
            :class="['link-button', { 'link-disabled': isProcessing }]"
            @tap="handleRestore"
          />
          <Label
            col="1"
            text="Cancel"
            :class="['link-button', { 'link-disabled': isProcessing }]"
            @tap="handleClose"
          />
        </GridLayout>
      </StackLayout>
    </GridLayout>
  </GridLayout>
</template>

<style scoped>
.modal-overlay {
  width: 100%;
  height: 100%;
}

.backdrop {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-container {
  margin: 24;
  margin-top: 48;
  margin-bottom: 48;
  padding: 24;
  background-color: #ffffff;
  border-radius: 16;
}

.modal-header {
  margin-bottom: 16;
}

.modal-title {
  font-size: 24;
  font-weight: bold;
  color: #1f2937;
  text-align: center;
  margin-bottom: 8;
}

.modal-subtitle {
  font-size: 15;
  color: #6b7280;
  text-align: center;
}

.features-list {
  margin-bottom: 16;
  padding: 16;
  background-color: #f9fafb;
  border-radius: 12;
}

.feature-item {
  margin-bottom: 8;
}

.check-icon {
  font-size: 16;
  color: #10b981;
  width: 24;
}

.feature-text {
  font-size: 15;
  color: #374151;
}

.packages-scroll {
  margin-bottom: 8;
}

.packages-container {
  padding: 0;
}

.loading-indicator {
  margin: 24;
}

.no-packages-text {
  font-size: 15;
  color: #6b7280;
  text-align: center;
  padding: 24;
}

.package-card {
  padding: 16;
  margin-bottom: 12;
  background-color: #ffffff;
  border-width: 2;
  border-color: #e5e7eb;
  border-radius: 12;
}

.package-selected {
  border-color: #6366f1;
  background-color: #f5f3ff;
}

.package-info {
  padding-right: 12;
}

.package-title {
  font-size: 17;
  font-weight: 600;
  color: #1f2937;
}

.package-description {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.savings-badge {
  font-size: 11;
  font-weight: 600;
  color: #10b981;
  background-color: #d1fae5;
  padding: 2 8;
  border-radius: 8;
  margin-left: 8;
  vertical-align: center;
}

.selection-indicator {
  font-size: 20;
  color: #d1d5db;
  width: 32;
  text-align: center;
}

.selection-indicator.selected {
  color: #6366f1;
}

.price-container {
  margin-top: 8;
}

.price-text {
  font-size: 22;
  font-weight: bold;
  color: #1f2937;
}

.price-period {
  font-size: 14;
  color: #6b7280;
  vertical-align: bottom;
  padding-bottom: 2;
}

.error-message {
  font-size: 14;
  color: #ef4444;
  text-align: center;
  padding: 8 16;
  margin-bottom: 8;
  background-color: #fef2f2;
  border-radius: 8;
}

.action-buttons {
  padding-top: 8;
}

.subscribe-button {
  background-color: #6366f1;
  border-radius: 12;
  padding: 16;
  margin-bottom: 12;
}

.subscribe-button.button-disabled {
  background-color: #9ca3af;
}

.button-loader {
  width: 24;
  height: 24;
}

.subscribe-button-text {
  font-size: 17;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
}

.secondary-actions {
  padding: 8 0;
}

.link-button {
  font-size: 15;
  color: #6366f1;
  text-align: center;
}

.link-button.link-disabled {
  color: #9ca3af;
}
</style>
