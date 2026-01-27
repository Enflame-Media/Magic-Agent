<script setup lang="ts">
/**
 * PaywallDialog - Subscription purchase dialog
 *
 * Displays available subscription packages and allows users to purchase.
 * Uses ShadCN-Vue Dialog components with a clean, modern design.
 *
 * @example
 * ```vue
 * <PaywallDialog v-model:open="showPaywall" @purchased="handlePurchased" />
 * ```
 */

import { computed, ref } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { usePurchases } from '@/composables/usePurchases';
import type { Package } from '@/shared';
import { PaywallResult } from '@/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Control dialog visibility */
  open?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
});

const emit = defineEmits<{
  /** Dialog visibility changed */
  'update:open': [value: boolean];
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
  status,
  purchase,
  restorePurchases,
} = usePurchases();

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const selectedPackage = ref<Package | null>(null);
const isPurchasing = computed(() => status.value === 'purchasing');
const isRestoring = computed(() => status.value === 'restoring');
const isProcessing = computed(() => isPurchasing.value || isRestoring.value);

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

const dialogOpen = computed({
  get: () => props.open,
  set: (value) => { emit('update:open', value); },
});

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
// Methods
// ─────────────────────────────────────────────────────────────────────────────

function selectPackage(pkg: Package) {
  selectedPackage.value = pkg;
}

function isSelected(pkg: Package): boolean {
  return selectedPackage.value?.identifier === pkg.identifier;
}

function isAnnual(pkg: Package): boolean {
  return (
    pkg.packageType === 'annual' ||
    pkg.identifier.toLowerCase().includes('annual') ||
    pkg.identifier.toLowerCase().includes('year')
  );
}

async function handlePurchase() {
  if (!selectedPackage.value) return;

  const result = await purchase(selectedPackage.value);

  switch (result) {
    case PaywallResult.PURCHASED:
      emit('purchased');
      dialogOpen.value = false;
      break;
    case PaywallResult.CANCELLED:
      emit('cancelled');
      break;
    case PaywallResult.ERROR:
      emit('error', 'Purchase failed. Please try again.');
      break;
  }
}

async function handleRestore() {
  try {
    await restorePurchases();
    emit('restored');
    dialogOpen.value = false;
  } catch {
    emit('error', 'Failed to restore purchases. Please try again.');
  }
}

function closeDialog() {
  dialogOpen.value = false;
  emit('cancelled');
}
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="text-2xl font-bold text-center">
          Upgrade to Pro
        </DialogTitle>
        <DialogDescription class="text-center">
          Unlock all features and get the most out of Happy
        </DialogDescription>
      </DialogHeader>

      <!-- Features List -->
      <div class="py-4">
        <ul class="space-y-2 text-sm">
          <li class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Unlimited sessions</span>
          </li>
          <li class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Sync across all devices</span>
          </li>
          <li class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Voice assistant integration</span>
          </li>
          <li class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Priority support</span>
          </li>
        </ul>
      </div>

      <!-- Package Selection -->
      <div v-if="displayPackages.length > 0" class="space-y-3">
        <Card
          v-for="pkg in displayPackages"
          :key="pkg.identifier"
          :class="[
            'cursor-pointer transition-all duration-200',
            isSelected(pkg)
              ? 'ring-2 ring-primary border-primary'
              : 'hover:border-muted-foreground/50',
          ]"
          @click="selectPackage(pkg)"
        >
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg">
                {{ pkg.product.title }}
              </CardTitle>
              <div v-if="isAnnual(pkg) && annualSavings" class="text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400 px-2 py-1 rounded-full">
                Save {{ annualSavings.percentage }}%
              </div>
            </div>
            <CardDescription>
              {{ pkg.product.description }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-bold">{{ pkg.product.priceString }}</span>
              <span class="text-muted-foreground text-sm">
                / {{ isAnnual(pkg) ? 'year' : 'month' }}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- No Packages Available -->
      <div v-else class="text-center py-8 text-muted-foreground">
        No subscription options available at this time.
      </div>

      <DialogFooter class="flex-col gap-2 sm:flex-col">
        <Button
          class="w-full"
          size="lg"
          :disabled="!selectedPackage || isProcessing"
          @click="handlePurchase"
        >
          <span v-if="isPurchasing" class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Processing...
          </span>
          <span v-else>
            Subscribe Now
          </span>
        </Button>

        <div class="flex items-center justify-between w-full text-sm">
          <Button
            variant="link"
            size="sm"
            :disabled="isProcessing"
            @click="handleRestore"
          >
            <span v-if="isRestoring">Restoring...</span>
            <span v-else>Restore Purchases</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            :disabled="isProcessing"
            @click="closeDialog"
          >
            Cancel
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
