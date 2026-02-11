export type MessageMeta = {
    sentFrom?: string;
    permissionMode?: string;
    model?: string | null;
    fallbackModel?: string | null;
    customSystemPrompt?: string | null;
    appendSystemPrompt?: string | null;
    allowedTools?: string[] | null;
    disallowedTools?: string[] | null;
    displayText?: string;
};

export type ToolPermission = {
    id?: string;
    status?: 'pending' | 'approved' | 'denied' | 'canceled';
    reason?: string;
    mode?: string;
    allowedTools?: string[];
    decision?: 'approved' | 'approved_for_session' | 'denied' | 'abort';
    date?: number;
};

export type ToolCall = {
    name: string;
    state: 'running' | 'completed' | 'error';
    input: unknown;
    createdAt: number;
    startedAt: number | null;
    completedAt: number | null;
    description: string | null;
    result?: unknown;
    permission?: ToolPermission;
};

export type AgentEvent =
    | { type: 'switch'; mode: string }
    | { type: 'message'; message: string }
    | { type: 'limit-reached'; endsAt: number }
    | { type: string; [key: string]: unknown };

export type UserTextMessage = {
    kind: 'user-text';
    id: string;
    sourceMessageId?: string;
    localId: string | null;
    createdAt: number;
    text: string;
    displayText?: string;
    meta?: MessageMeta;
};

export type AgentTextMessage = {
    kind: 'agent-text';
    id: string;
    sourceMessageId?: string;
    localId: string | null;
    createdAt: number;
    text: string;
    meta?: MessageMeta;
};

export type ToolCallMessage = {
    kind: 'tool-call';
    id: string;
    sourceMessageId?: string;
    localId: string | null;
    createdAt: number;
    tool: ToolCall;
    children?: NormalizedMessage[];
    meta?: MessageMeta;
};

export type ToolResultMessage = {
    kind: 'tool-result';
    id: string;
    sourceMessageId?: string;
    localId: string | null;
    createdAt: number;
    toolUseId: string;
    content: unknown;
    isError: boolean;
    permission?: ToolPermission;
    meta?: MessageMeta;
};

export type AgentEventMessage = {
    kind: 'agent-event';
    id: string;
    sourceMessageId?: string;
    localId: string | null;
    createdAt: number;
    event: AgentEvent;
    meta?: MessageMeta;
};

export type SystemMessage = {
    kind: 'system';
    id: string;
    sourceMessageId?: string;
    localId: string | null;
    createdAt: number;
    text: string;
    meta?: MessageMeta;
};

export type NormalizedMessage =
    | UserTextMessage
    | AgentTextMessage
    | ToolCallMessage
    | ToolResultMessage
    | AgentEventMessage
    | SystemMessage;
