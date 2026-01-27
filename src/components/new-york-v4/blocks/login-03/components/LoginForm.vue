<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from '@/components/ui/field';
import { Keyboard, QrCode, Smartphone } from 'lucide-vue-next';

const props = defineProps<{
  class?: HTMLAttributes['class']
  isLoading?: boolean
}>();

const emit = defineEmits<{
  (event: 'mobile-auth'): void
  (event: 'scan'): void
  (event: 'manual'): void
}>();
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader class="text-center">
        <CardTitle class="text-xl">
          Welcome to Happy
        </CardTitle>
        <CardDescription>
          Pair your browser with Claude Code to sync sessions in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <Button
              type="button"
              class="w-full"
              :disabled="props.isLoading"
              @click="emit('mobile-auth')"
            >
              <Smartphone class="mr-2 h-4 w-4" />
              Continue with Mobile App
            </Button>
          </Field>
          <FieldSeparator class="*:data-[slot=field-separator-content]:bg-card">
            Or connect your CLI
          </FieldSeparator>
          <Field>
            <Button
              variant="outline"
              type="button"
              class="w-full"
              :disabled="props.isLoading"
              @click="emit('scan')"
            >
              <QrCode class="mr-2 h-4 w-4" />
              Scan Terminal QR
            </Button>
          </Field>
          <Field>
            <Button
              variant="ghost"
              type="button"
              class="w-full"
              :disabled="props.isLoading"
              @click="emit('manual')"
            >
              <Keyboard class="mr-2 h-4 w-4" />
              Enter Pairing Code
            </Button>
          </Field>
          <FieldDescription class="text-center">
            Need the mobile app?
            <a
              href="https://happy.engineering"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Happy
            </a>
          </FieldDescription>
        </FieldGroup>
      </CardContent>
    </Card>
    <FieldDescription class="px-6 text-center">
      By continuing, you agree to our <a href="#">Terms of Service</a>
      and <a href="#">Privacy Policy</a>.
    </FieldDescription>
  </div>
</template>
