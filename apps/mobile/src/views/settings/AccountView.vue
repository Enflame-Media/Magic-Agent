<script setup lang="ts">
/**
 * Account Settings View
 *
 * Manages connected machines, authentication,
 * and account-related settings.
 */
import { computed } from 'vue';
import { Frame, Dialogs } from '@nativescript/core';
import { useAuth } from '../../composables/useAuth';

const { machines, disconnect, disconnectAll } = useAuth();

const connectedMachines = computed(() => machines.value);
const hasMachines = computed(() => connectedMachines.value.length > 0);

/**
 * Navigate back
 */
function navigateBack() {
  const frame = Frame.topmost();
  if (frame?.canGoBack()) {
    frame.goBack();
  }
}

/**
 * Confirm and disconnect from a specific machine
 */
async function confirmDisconnect(machineId: string) {
  const result = await Dialogs.confirm({
    title: 'Disconnect Machine',
    message: 'Are you sure you want to disconnect from this machine? You will need to scan the QR code again to reconnect.',
    okButtonText: 'Disconnect',
    cancelButtonText: 'Cancel',
  });

  if (result) {
    disconnect(machineId);
  }
}

/**
 * Confirm and disconnect from all machines
 */
async function confirmDisconnectAll() {
  const result = await Dialogs.confirm({
    title: 'Disconnect All',
    message: 'Are you sure you want to disconnect from all machines? You will need to scan QR codes again to reconnect.',
    okButtonText: 'Disconnect All',
    cancelButtonText: 'Cancel',
  });

  if (result) {
    disconnectAll();
  }
}

/**
 * Format connection date
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Account">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" @tap="navigateBack" />
    </ActionBar>

    <ScrollView>
      <StackLayout class="settings-container">
        <!-- Connected Machines Section -->
        <Label text="CONNECTED MACHINES" class="section-header" />

        <StackLayout v-if="hasMachines">
          <GridLayout
            v-for="machine in connectedMachines"
            :key="machine.id"
            columns="*, auto"
            class="machine-item"
          >
            <StackLayout col="0">
              <Label :text="machine.name" class="machine-name" />
              <Label :text="`Connected ${formatDate(machine.connectedAt)}`" class="machine-date" />
            </StackLayout>
            <Button
              col="1"
              text="Disconnect"
              @tap="confirmDisconnect(machine.id)"
              class="btn-disconnect"
            />
          </GridLayout>

          <StackLayout class="setting-item" v-if="connectedMachines.length > 1">
            <Button
              text="Disconnect All Machines"
              @tap="confirmDisconnectAll"
              class="btn-danger-outline"
            />
          </StackLayout>
        </StackLayout>

        <StackLayout v-else class="empty-machines">
          <Label text="No machines connected" class="empty-title" />
          <Label
            text="Scan a QR code from your CLI to connect a machine."
            class="empty-subtitle"
            textWrap="true"
          />
        </StackLayout>

        <!-- Account Actions Section -->
        <Label text="ACCOUNT" class="section-header" />

        <StackLayout class="setting-item">
          <Label text="Export Data" class="setting-title" />
          <Label text="Download a copy of your session history" class="setting-subtitle" />
        </StackLayout>

        <StackLayout class="setting-item">
          <Label text="Clear Local Data" class="setting-title text-warning" />
          <Label text="Remove all cached sessions and settings" class="setting-subtitle" />
        </StackLayout>

        <!-- Danger Zone -->
        <Label text="DANGER ZONE" class="section-header section-danger" />

        <StackLayout class="setting-item">
          <Label text="Sign Out" class="setting-title text-danger" />
          <Label text="Sign out and remove all local data" class="setting-subtitle" />
        </StackLayout>
      </StackLayout>
    </ScrollView>
  </Page>
</template>

<style scoped>
.settings-container {
  padding: 0;
}

.section-header {
  font-size: 13;
  font-weight: bold;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5;
  padding: 16;
  padding-bottom: 8;
  background-color: #f9fafb;
}

.section-danger {
  color: #dc2626;
}

.setting-item {
  padding: 16;
  background-color: #ffffff;
  border-bottom-width: 1;
  border-bottom-color: #e5e7eb;
}

.setting-title {
  font-size: 17;
  color: #1f2937;
  font-weight: 500;
}

.setting-subtitle {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.text-warning {
  color: #f59e0b;
}

.text-danger {
  color: #dc2626;
}

.machine-item {
  padding: 16;
  background-color: #ffffff;
  border-bottom-width: 1;
  border-bottom-color: #e5e7eb;
}

.machine-name {
  font-size: 16;
  font-weight: 600;
  color: #1f2937;
}

.machine-date {
  font-size: 13;
  color: #6b7280;
  margin-top: 2;
}

.btn-disconnect {
  background-color: #fef2f2;
  color: #dc2626;
  font-size: 13;
  padding: 8 12;
  border-radius: 6;
}

.btn-danger-outline {
  background-color: transparent;
  color: #dc2626;
  font-size: 15;
  padding: 12;
  border-width: 1;
  border-color: #dc2626;
  border-radius: 8;
  margin: 8;
}

.empty-machines {
  padding: 32 16;
  text-align: center;
  background-color: #ffffff;
}

.empty-title {
  font-size: 16;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8;
}

.empty-subtitle {
  font-size: 14;
  color: #9ca3af;
}
</style>
