<script setup lang="ts">
/**
 * Login View - Entry point for authentication
 *
 * Provides two authentication methods:
 * 1. QR Code Scan - Scan CLI's QR code to connect (requires existing mobile auth)
 * 2. Mobile Auth - Show QR code for mobile app to scan (initial web auth)
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QrCode, Smartphone, Keyboard } from 'lucide-vue-next';

const router = useRouter();
const isLoading = ref(false);

/**
 * Navigate to QR scanner for CLI connection
 */
function goToScanner() {
  router.push('/auth/scan');
}

/**
 * Navigate to mobile auth (show QR for mobile to scan)
 */
function goToMobileAuth() {
  router.push('/auth/connect');
}

/**
 * Navigate to manual entry
 */
function goToManualEntry() {
  router.push('/auth/manual');
}
</script>

<template>
  <div class="login-view">
    <div class="login-container">
      <!-- Header -->
      <div class="header">
        <h1 class="title">Welcome to Happy</h1>
        <p class="subtitle">
          Connect to Claude Code CLI and manage your sessions from anywhere
        </p>
      </div>

      <!-- Auth Options -->
      <div class="auth-options">
        <!-- Mobile Auth - Primary for new users -->
        <Card class="auth-option primary">
          <CardHeader>
            <div class="option-icon primary-icon">
              <Smartphone class="icon" />
            </div>
            <CardTitle>Authenticate with Mobile App</CardTitle>
            <CardDescription>
              Scan a QR code with your Happy mobile app to log in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              class="w-full"
              size="lg"
              :disabled="isLoading"
              @click="goToMobileAuth"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>

        <div class="divider">
          <span>or</span>
        </div>

        <!-- CLI Connection - For connecting to existing CLI session -->
        <Card class="auth-option">
          <CardHeader>
            <div class="option-icon">
              <QrCode class="icon" />
            </div>
            <CardTitle>Connect to CLI</CardTitle>
            <CardDescription>
              Already logged in? Scan the QR code from your terminal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="button-group">
              <Button
                variant="outline"
                class="flex-1"
                :disabled="isLoading"
                @click="goToScanner"
              >
                <QrCode class="mr-2 h-4 w-4" />
                Scan QR
              </Button>
              <Button
                variant="ghost"
                class="flex-1"
                :disabled="isLoading"
                @click="goToManualEntry"
              >
                <Keyboard class="mr-2 h-4 w-4" />
                Manual Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Footer -->
      <p class="footer-text">
        Don't have the mobile app?
        <a
          href="https://happy.engineering"
          target="_blank"
          class="link"
        >
          Download Happy
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: hsl(var(--background));
}

.login-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header {
  text-align: center;
}

.title {
  font-size: 1.875rem;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
}

.subtitle {
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}

.auth-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-option {
  transition: box-shadow 0.2s ease;
}

.auth-option:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.auth-option.primary {
  border-color: hsl(var(--primary) / 0.3);
}

.option-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted));
  margin-bottom: 0.5rem;
}

.option-icon.primary-icon {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.icon {
  width: 1.5rem;
  height: 1.5rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: hsl(var(--border));
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.footer-text {
  text-align: center;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.link {
  color: hsl(var(--primary));
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>
