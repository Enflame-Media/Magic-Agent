<script setup lang="ts">
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-vue"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SectionCard {
  title: string
  value: string
  badgeLabel: string
  badgeDirection?: "up" | "down"
  summary: string
  detail: string
}

const props = defineProps<{
  cards: SectionCard[]
}>()
</script>

<template>
  <div class="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
    <Card
      v-for="card in props.cards"
      :key="card.title"
      class="@container/card"
    >
      <CardHeader>
        <CardDescription>{{ card.title }}</CardDescription>
        <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {{ card.value }}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <IconTrendingDown v-if="card.badgeDirection === 'down'" />
            <IconTrendingUp v-else />
            {{ card.badgeLabel }}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter class="flex-col items-start gap-1.5 text-sm">
        <div class="line-clamp-1 flex gap-2 font-medium">
          {{ card.summary }}
          <IconTrendingDown v-if="card.badgeDirection === 'down'" class="size-4" />
          <IconTrendingUp v-else class="size-4" />
        </div>
        <div class="text-muted-foreground">
          {{ card.detail }}
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
