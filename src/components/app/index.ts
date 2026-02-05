/**
 * App Components - Application-specific components
 *
 * These components are specific to the Happy application and not
 * part of the generic ShadCN-Vue UI library.
 */

export { default as ConnectionStatus } from './ConnectionStatus.vue';
export { default as EmptyState } from './EmptyState.vue';
export { default as SessionCard } from './SessionCard.vue';
export { default as MessageView } from './MessageView.vue';
export { default as ChatList } from './ChatList.vue';
export { default as CodeBlock } from './CodeBlock.vue';
export { default as CommandView } from './CommandView.vue';
export { default as MultiTextInput } from './MultiTextInput.vue';
export { default as ToolResult } from './ToolResult.vue';
export { default as PaywallDialog } from './PaywallDialog.vue';
export { default as MarkdownView } from './markdown/MarkdownView.vue';
export { default as ToolView } from './tools/ToolView.vue';
export { default as PermissionFooter } from './tools/PermissionFooter.vue';
export { default as ToolHeader } from './tools/ToolHeader.vue';
export { default as ToolStatusIndicator } from './tools/ToolStatusIndicator.vue';
export { default as ToolFullView } from './tools/ToolFullView.vue';
export { default as AgentInput } from './AgentInput/AgentInput.vue';

// Artifact components
export { default as ArtifactViewer } from './ArtifactViewer.vue';
export { default as FileTree } from './FileTree.vue';
export { default as ImagePreview } from './ImagePreview.vue';
export { default as OfflineIndicator } from './OfflineIndicator.vue';

// i18n components
export { default as LanguageSelector } from './LanguageSelector.vue';

// Friends/Social components
export { default as FriendRequestCard } from './FriendRequestCard.vue';
export { default as UserProfileCard } from './UserProfileCard.vue';
export { default as UserSearch } from './UserSearch.vue';

// Voice components
export { VoiceBars, VoiceStatusBar, VoiceButton } from './voice';

// Desktop enhancement components (HAP-918)
export { default as CommandPalette } from './CommandPalette.vue';
export { default as AppBreadcrumbs } from './AppBreadcrumbs.vue';

// Accessibility components (HAP-963)
export { default as SkipLink } from './SkipLink.vue';

// Mobile enhancement components (HAP-919)
export { default as MobileBottomNav } from './MobileBottomNav.vue';
export { default as PullToRefresh } from './PullToRefresh.vue';

// Responsive design system components (HAP-962)
export { default as ResponsiveContainer } from './ResponsiveContainer.vue';
export { default as DesktopNavigation } from './DesktopNavigation.vue';
