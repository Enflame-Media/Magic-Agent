/**
 * App Components - Application-specific components
 *
 * These components are specific to the Happy application and not
 * part of the generic ShadCN-Vue UI library.
 */

export { default as ConnectionStatus } from "./ConnectionStatus.vue";
export { default as EmptyState } from "./EmptyState.vue";
export { default as SessionCard } from "./SessionCard.vue";
export { default as SessionMessage } from "./SessionMessage.vue";
export { default as CodeBlock } from "./CodeBlock.vue";
export { default as CommandView } from "./CommandView.vue";
export { default as PaywallDialog } from "./PaywallDialog.vue";
export { default as MarkdownView } from "./markdown/MarkdownView.vue";
export { default as ToolFullView } from "./tools/ToolFullView.vue";

// Artifact components
export { default as ArtifactViewer } from "./ArtifactViewer.vue";
export { default as AppFileTree } from "./AppFileTree.vue";
export { default as AppFileTreeNode } from "./AppFileTreeNode.vue";
export { default as ImagePreview } from "./ImagePreview.vue";
export { default as OfflineIndicator } from "./OfflineIndicator.vue";

// i18n components
export { default as LanguageSelector } from "./LanguageSelector.vue";

// Friends/Social components
export { default as FriendRequestCard } from "./FriendRequestCard.vue";
export { default as UserProfileCard } from "./UserProfileCard.vue";
export { default as UserSearch } from "./UserSearch.vue";

// Voice components
export { AppVoiceControls } from "./voice";

// Desktop enhancement components (HAP-918)
export { default as CommandPalette } from "./CommandPalette.vue";
export { default as AppBreadcrumbs } from "./AppBreadcrumbs.vue";

// Accessibility components (HAP-963)
export { default as SkipLink } from "./SkipLink.vue";

// Mobile enhancement components (HAP-919)
export { default as MobileBottomNav } from "./MobileBottomNav.vue";
export { default as PullToRefresh } from "./PullToRefresh.vue";

// Responsive design system components (HAP-962)
export { default as ResponsiveContainer } from "./ResponsiveContainer.vue";
export { default as DesktopNavigation } from "./DesktopNavigation.vue";
