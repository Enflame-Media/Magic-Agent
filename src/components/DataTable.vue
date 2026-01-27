<script lang="ts">
import { z } from 'zod';

export const schema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['Active', 'Archived']),
  path: z.string(),
  lastActive: z.string(),
});
</script>

<script setup lang="ts">
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconLoader,
  IconPlus,
} from '@tabler/icons-vue';
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table';
import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import DragHandle from './DragHandle.vue';
import DraggableRow from './DraggableRow.vue';

export interface TableData {
  id: string
  name: string
  status: 'Active' | 'Archived'
  path: string
  lastActive: string
}

const props = defineProps<{
  data: TableData[]
}>();

const emit = defineEmits<{
  (event: 'new-session'): void
}>();

const router = useRouter();
const sorting = ref<SortingState>([]);
const columnFilters = ref<ColumnFiltersState>([]);
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref({});
const activeTab = ref<'all' | 'active' | 'archived'>('all');

const counts = computed(() => ({
  all: props.data.length,
  active: props.data.filter((row) => row.status === 'Active').length,
  archived: props.data.filter((row) => row.status === 'Archived').length,
}));

const filteredData = computed(() => {
  if (activeTab.value === 'active') {
    return props.data.filter((row) => row.status === 'Active');
  }
  if (activeTab.value === 'archived') {
    return props.data.filter((row) => row.status === 'Archived');
  }
  return props.data;
});

function setActiveTab(value: string) {
  if (value === 'active' || value === 'archived' || value === 'all') {
    activeTab.value = value;
  }
}

const columns: ColumnDef<TableData>[] = [
  {
    id: 'drag',
    header: () => null,
    cell: () => h(DragHandle),
  },
  {
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': (value) => { table.toggleAllPageRowsSelected(!!value); },
      'aria-label': 'Select all',
    }),
    cell: ({ row }) => h(Checkbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value) => { row.toggleSelected(!!value); },
      'aria-label': 'Select row',
    }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Session',
    cell: ({ row }) => {
      const name = row.getValue<string>('name');
      const path = row.original.path;

      return h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: 'text-sm font-medium' }, String(name ?? '')),
        h('span', { class: 'text-xs text-muted-foreground' }, path || 'No project path'),
      ]);
    },
    enableHiding: false,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status');
      const isActive = status === 'Active';

      return h(Badge, {
        variant: isActive ? 'default' : 'secondary',
        class: 'gap-1',
      }, () => [
        isActive
          ? h(IconCircleCheckFilled, { class: 'h-3 w-3' })
          : h(IconLoader, { class: 'h-3 w-3' }),
        status,
      ]);
    },
  },
  {
    accessorKey: 'lastActive',
    header: 'Last Active',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground tabular-nums' }, String(row.getValue('lastActive'))),
  },
  {
    id: 'actions',
    cell: ({ row }) => h(DropdownMenu, {}, {
      default: () => [
        h(DropdownMenuTrigger, { asChild: true }, {
          default: () => h(Button, {
            variant: 'ghost',
            class: 'h-8 w-8 p-0',
          }, {
            default: () => [
              h('span', { class: 'sr-only' }, 'Open menu'),
              h(IconDotsVertical, { class: 'h-4 w-4' }),
            ],
          }),
        }),
        h(DropdownMenuContent, { align: 'end' }, {
          default: () => [
            h(DropdownMenuItem, {
              onClick: () => router.push(`/session/${row.original.id}`),
            }, () => 'Open session'),
            h(DropdownMenuItem, {
              onClick: () => router.push(`/session/${row.original.id}/artifacts`),
            }, () => 'View artifacts'),
            h(DropdownMenuSeparator, {}),
            h(DropdownMenuItem, {}, () => 'Archive'),
          ],
        }),
      ],
    }),
  },
];

const table = useVueTable({
  get data() {
    return filteredData.value;
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onSortingChange: (updaterOrValue) => {
    sorting.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(sorting.value)
      : updaterOrValue;
  },
  onColumnFiltersChange: (updaterOrValue) => {
    columnFilters.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(columnFilters.value)
      : updaterOrValue;
  },
  onColumnVisibilityChange: (updaterOrValue) => {
    columnVisibility.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(columnVisibility.value)
      : updaterOrValue;
  },
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(rowSelection.value)
      : updaterOrValue;
  },
  state: {
    get sorting() { return sorting.value; },
    get columnFilters() { return columnFilters.value; },
    get columnVisibility() { return columnVisibility.value; },
    get rowSelection() { return rowSelection.value; },
  },
});

const tabItems = [
  { value: 'all', label: 'All Sessions', count: () => counts.value.all },
  { value: 'active', label: 'Active', count: () => counts.value.active },
  { value: 'archived', label: 'Archived', count: () => counts.value.archived },
];
</script>

<template>
  <Tabs
    v-model="activeTab"
    default-value="all"
    class="w-full flex-col justify-start gap-6"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
      <Label for="view-selector" class="sr-only">
        View
      </Label>
      <Select
        id="view-selector"
        :model-value="activeTab"
        @update:model-value="(value) => {
          setActiveTab(String(value));
        }"
      >
        <SelectTrigger class="flex w-fit @4xl/main:hidden" size="sm">
          <SelectValue placeholder="Select a view" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            All Sessions
          </SelectItem>
          <SelectItem value="active">
            Active
          </SelectItem>
          <SelectItem value="archived">
            Archived
          </SelectItem>
        </SelectContent>
      </Select>
      <TabsList class="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
        <TabsTrigger v-for="tab in tabItems" :key="tab.value" :value="tab.value">
          {{ tab.label }}
          <Badge v-if="tab.count()" variant="secondary">
            {{ tab.count() }}
          </Badge>
        </TabsTrigger>
      </TabsList>
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm">
              <IconChevronDown />
              <span class="hidden lg:inline">Customize Columns</span>
              <span class="lg:hidden">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <template
              v-for="column in table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())"
              :key="column.id"
            >
              <DropdownMenuItem
                class="capitalize"
                @click="column.toggleVisibility(!column.getIsVisible())"
              >
                {{ column.id }}
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" @click="emit('new-session')">
          <IconPlus />
          <span class="hidden lg:inline">New Session</span>
        </Button>
      </div>
    </div>

    <TabsContent
      v-for="tab in tabItems"
      :key="tab.value"
      :value="tab.value"
      class="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
    >
      <div class="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader class="bg-muted sticky top-0 z-10">
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id" :col-span="header.colSpan">
                <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody class="**:data-[slot=table-cell]:first:w-8">
            <template v-if="table.getRowModel().rows.length">
              <DraggableRow v-for="row in table.getRowModel().rows" :key="row.id" :row="row" :index="row.index" />
            </template>
            <TableRow v-else>
              <TableCell
                :col-span="columns.length"
                class="h-24 text-center"
              >
                No sessions yet.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div class="flex items-center justify-between px-4">
        <div class="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {{ table.getFilteredSelectedRowModel().rows.length }} of
          {{ table.getFilteredRowModel().rows.length }} row(s) selected.
        </div>
        <div class="flex w-full items-center gap-8 lg:w-fit">
          <div class="hidden items-center gap-2 lg:flex">
            <Label for="rows-per-page" class="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              :model-value="table.getState().pagination.pageSize"
              @update:model-value="(value) => {
                table.setPageSize(Number(value))
              }"
            >
              <SelectTrigger id="rows-per-page" size="sm" class="w-20">
                <SelectValue :placeholder="`${table.getState().pagination.pageSize}`" />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem v-for="pageSize in [10, 20, 30, 40, 50]" :key="pageSize" :value="`${pageSize}`">
                  {{ pageSize }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex w-fit items-center justify-center text-sm font-medium">
            Page {{ table.getState().pagination.pageIndex + 1 }} of
            {{ table.getPageCount() }}
          </div>
          <div class="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              class="hidden h-8 w-8 p-0 lg:flex"
              :disabled="!table.getCanPreviousPage()"
              @click="table.setPageIndex(0)"
            >
              <span class="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              class="size-8"
              size="icon"
              :disabled="!table.getCanPreviousPage()"
              @click="table.previousPage()"
            >
              <span class="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              class="size-8"
              size="icon"
              :disabled="!table.getCanNextPage()"
              @click="table.nextPage()"
            >
              <span class="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              class="hidden size-8 lg:flex"
              size="icon"
              :disabled="!table.getCanNextPage()"
              @click="table.setPageIndex(table.getPageCount() - 1)"
            >
              <span class="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>
</template>
