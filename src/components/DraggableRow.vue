<script setup lang="ts">
import type { Row } from "@tanstack/vue-table"
import type { z } from "zod"
import type { schema } from "./DataTable.vue"
import { FlexRender } from "@tanstack/vue-table"
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'

defineProps<{ row: Row<z.infer<typeof schema>>, index: number }>()
</script>

<template>
  <TableRow
    :data-state="row.getIsSelected() && 'selected'"
    class="relative z-0"
  >
    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
      <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
    </TableCell>
  </TableRow>
</template>
