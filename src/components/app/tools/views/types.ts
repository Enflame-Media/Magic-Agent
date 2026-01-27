import type { NormalizedMessage, ToolCall } from '@/services/messages/types';

export type ToolViewProps = {
  tool: ToolCall;
  messages?: NormalizedMessage[];
};
