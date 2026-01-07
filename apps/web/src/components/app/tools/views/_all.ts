import type { Component } from 'vue';
import BashView from './BashView.vue';
import CodexBashView from './CodexBashView.vue';
import CodexDiffView from './CodexDiffView.vue';
import CodexPatchView from './CodexPatchView.vue';
import EditView from './EditView.vue';
import ExitPlanToolView from './ExitPlanToolView.vue';
import MCPToolView from './MCPToolView.vue';
import MultiEditView from './MultiEditView.vue';
import TaskView from './TaskView.vue';
import TodoView from './TodoView.vue';
import WriteView from './WriteView.vue';
export type ToolViewComponent = Component;

export const toolViewRegistry: Record<string, ToolViewComponent> = {
  Bash: BashView,
  bash: BashView,
  CodexBash: CodexBashView,
  codex_bash: CodexBashView,
  BashCommand: BashView,
  CodexDiff: CodexDiffView,
  codex_diff: CodexDiffView,
  CodexPatch: CodexPatchView,
  codex_patch: CodexPatchView,
  Edit: EditView,
  edit: EditView,
  MultiEdit: MultiEditView,
  multi_edit: MultiEditView,
  Write: WriteView,
  write: WriteView,
  TodoWrite: TodoView,
  todo_write: TodoView,
  Task: TaskView,
  task: TaskView,
  ExitPlanMode: ExitPlanToolView,
  exit_plan_mode: ExitPlanToolView,
};

export function getToolViewComponent(toolName: string): ToolViewComponent | null {
  if (toolName.startsWith('mcp__')) {
    return MCPToolView;
  }
  return toolViewRegistry[toolName] ?? null;
}
