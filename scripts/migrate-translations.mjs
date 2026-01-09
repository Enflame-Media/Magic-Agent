#!/usr/bin/env node

/**
 * Translation Migration Script v3
 *
 * Converts happy-app TypeScript translations to vue-i18n JSON format.
 * Uses esbuild to transpile and evaluate TypeScript files.
 *
 * Usage:
 *   node scripts/migrate-translations.mjs
 *
 * Output:
 *   apps/web/src/i18n/locales/{lang}.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Source and output paths
const SOURCE_PATH = path.resolve(__dirname, '../../react/sources/text/translations');
const OUTPUT_PATH = path.resolve(__dirname, '../apps/web/src/i18n/locales');

// Languages to migrate (excluding English which is handled separately)
const LANGUAGES = ['es', 'ru', 'pl', 'pt', 'ca', 'zh-Hans'];

/**
 * Convert arrow functions in TypeScript to vue-i18n format strings
 */
function convertToVueI18n(obj, path = '') {
  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj === 'function') {
    // Get function source and convert
    const funcStr = obj.toString();
    return convertFunctionToString(funcStr);
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertToVueI18n(value, `${path}.${key}`);
    }
    return result;
  }

  return String(obj);
}

/**
 * Convert a function to its vue-i18n string equivalent
 */
function convertFunctionToString(funcStr) {
  // Extract template literal content from arrow function
  // Pattern: ({ params }) => `template ${...}`
  let templateMatch = funcStr.match(/=>\s*`([\s\S]*?)`/);
  if (templateMatch) {
    let template = templateMatch[1];

    // Convert ${varName} to {varName}
    template = template.replace(/\$\{(\w+)\}/g, '{$1}');

    // Handle ternary for plurals: ${count !== 1 ? 's' : ''}
    template = template.replace(/\$\{(\w+)\s*!==\s*1\s*\?\s*(['"`])([^'"]*)\2\s*:\s*(['"`])([^'"]*)\4\}/g,
      (_, varName, q1, pluralSuffix, q2, singularSuffix) => {
        return `__PLURAL__${singularSuffix}|${pluralSuffix}__END__`;
      });

    template = template.replace(/\$\{(\w+)\s*===\s*1\s*\?\s*(['"`])([^'"]*)\2\s*:\s*(['"`])([^'"]*)\4\}/g,
      (_, varName, q1, singularVal, q2, pluralVal) => {
        return `__PLURAL__${singularVal}|${pluralVal}__END__`;
      });

    // Handle plural() helper
    template = template.replace(/\$\{plural\s*\(\s*\{[^}]*singular:\s*(['"`])([^'"]*)\1[^}]*plural:\s*(['"`])([^'"]*)\3[^}]*\}\s*\)\}/g,
      (_, q1, singular, q2, plural) => `__PLURAL_WORD__${singular}|${plural}__END__`);

    // Handle 3-form plurals (Russian/Polish) - use one|many for vue-i18n
    template = template.replace(/\$\{plural\s*\(\s*\{[^}]*one:\s*(['"`])([^'"]*)\1[^}]*(?:few:\s*(['"`])([^'"]*)\3[^}]*)?many:\s*(['"`])([^'"]*)\5[^}]*\}\s*\)\}/g,
      (_, q1, one, q2, few, q3, many) => `__PLURAL_WORD__${one}|${many}__END__`);

    // Handle remaining complex expressions - extract first variable
    template = template.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const varMatch = expr.match(/^(\w+)/);
      return varMatch ? `{${varMatch[1]}}` : '{value}';
    });

    // Convert plural markers to vue-i18n pipe syntax
    let pluralMatch = template.match(/__PLURAL__([^|]*)\|([^_]*)__END__/);
    if (pluralMatch) {
      const [fullMatch, sing, plur] = pluralMatch;
      const prefix = template.substring(0, template.indexOf(fullMatch));
      const suffix = template.substring(template.indexOf(fullMatch) + fullMatch.length);
      template = `${prefix}${sing}${suffix} | ${prefix}${plur}${suffix}`;
    }

    let wordPluralMatch = template.match(/__PLURAL_WORD__([^|]*)\|([^_]*)__END__/);
    if (wordPluralMatch) {
      const [fullMatch, sing, plur] = wordPluralMatch;
      const prefix = template.substring(0, template.indexOf(fullMatch));
      const suffix = template.substring(template.indexOf(fullMatch) + fullMatch.length);
      template = `${prefix}${sing}${suffix} | ${prefix}${plur}${suffix}`;
    }

    return template.trim();
  }

  // Handle regular string return: ({ param }) => 'string'
  let stringMatch = funcStr.match(/=>\s*(['"`])([^'"]*)\1/);
  if (stringMatch) {
    return stringMatch[2];
  }

  return '[Function]';
}

/**
 * Create English locale - the reference structure with all keys
 */
function createEnglishLocale() {
  return {
    tabs: {
      inbox: 'Inbox',
      sessions: 'Terminals',
      settings: 'Settings',
    },
    inbox: {
      emptyTitle: 'Empty Inbox',
      emptyDescription: 'Connect with friends to start sharing sessions',
      updates: 'Updates',
    },
    common: {
      cancel: 'Cancel',
      authenticate: 'Authenticate',
      save: 'Save',
      error: 'Error',
      success: 'Success',
      note: 'Note',
      ok: 'OK',
      continue: 'Continue',
      back: 'Back',
      create: 'Create',
      rename: 'Rename',
      reset: 'Reset',
      logout: 'Logout',
      yes: 'Yes',
      no: 'No',
      discard: 'Discard',
      version: 'Version',
      copied: 'Copied',
      copy: 'Copy',
      scanning: 'Scanning...',
      urlPlaceholder: 'https://example.com',
      home: 'Home',
      message: 'Message',
      files: 'Files',
      fileViewer: 'File Viewer',
      loading: 'Loading...',
      retry: 'Retry',
      on: 'on',
      undo: 'Undo',
    },
    markdown: {
      codeCopied: 'Code copied to clipboard',
      copyFailed: 'Failed to copy code',
      mermaidRenderFailed: 'Failed to render diagram',
    },
    profile: {
      userProfile: 'User Profile',
      details: 'Details',
      firstName: 'First Name',
      lastName: 'Last Name',
      username: 'Username',
      status: 'Status',
    },
    status: {
      connected: 'connected',
      connecting: 'connecting',
      disconnected: 'disconnected',
      error: 'error',
      online: 'online',
      offline: 'offline',
      lastSeen: 'last seen {time}',
      permissionRequired: 'permission required',
      activeNow: 'Active now',
      unknown: 'unknown',
    },
    time: {
      justNow: 'just now',
      minutesAgo: '{count} minute ago | {count} minutes ago',
      hoursAgo: '{count} hour ago | {count} hours ago',
    },
    connect: {
      restoreAccount: 'Restore Account',
      enterSecretKey: 'Please enter a secret key',
      invalidSecretKey: 'Invalid secret key. Please check and try again.',
      enterUrlManually: 'Enter URL manually',
    },
    settings: {
      title: 'Settings',
      connectedAccounts: 'Connected Accounts',
      connectAccount: 'Connect account',
      github: 'GitHub',
      machines: 'Machines',
      features: 'Features',
      social: 'Social',
      account: 'Account',
      accountSubtitle: 'Manage your account details',
      appearance: 'Appearance',
      appearanceSubtitle: 'Customize how the app looks',
      voiceAssistant: 'Voice Assistant',
      voiceAssistantSubtitle: 'Configure voice interaction preferences',
      featuresTitle: 'Features',
      featuresSubtitle: 'Enable or disable app features',
      developer: 'Developer',
      developerTools: 'Developer Tools',
      about: 'About',
      aboutFooter:
        "Happy Coder is a Codex and Claude Code mobile client. It's fully end-to-end encrypted and your account is stored only on your device. Not affiliated with Anthropic.",
      whatsNew: "What's New",
      whatsNewSubtitle: 'See the latest updates and improvements',
      reportIssue: 'Report an Issue',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      eula: 'EULA',
      supportUs: 'Support us',
      supportUsSubtitlePro: 'Thank you for your support!',
      supportUsSubtitle: 'Support project development',
      scanQrCodeToAuthenticate: 'Scan QR code to authenticate',
      githubConnected: 'Connected as @{login}',
      connectGithubAccount: 'Connect your GitHub account',
      claudeAuthSuccess: 'Successfully connected to Claude',
      exchangingTokens: 'Exchanging tokens...',
      usage: 'Usage',
      usageSubtitle: 'View your API usage and costs',
      mcp: 'MCP Servers',
      mcpSubtitle: 'View connected MCP servers',
      accountConnected: '{service} account connected',
      machineStatus: '{name} is {status}',
      featureToggled: '{feature} {state}',
      language: 'Language',
      languageSubtitle: 'Choose your preferred language',
    },
    settingsAppearance: {
      theme: 'Theme',
      themeDescription: 'Choose your preferred color scheme',
      themeOptions: {
        adaptive: 'Adaptive',
        light: 'Light',
        dark: 'Dark',
      },
      themeDescriptions: {
        adaptive: 'Match system settings',
        light: 'Always use light theme',
        dark: 'Always use dark theme',
      },
      display: 'Display',
      displayDescription: 'Control layout and spacing',
      inlineToolCalls: 'Inline Tool Calls',
      inlineToolCallsDescription: 'Display tool calls directly in chat messages',
      expandTodoLists: 'Expand Todo Lists',
      expandTodoListsDescription: 'Show all todos instead of just changes',
      showLineNumbersInDiffs: 'Show Line Numbers in Diffs',
      showLineNumbersInDiffsDescription: 'Display line numbers in code diffs',
      showLineNumbersInToolViews: 'Show Line Numbers in Tool Views',
      showLineNumbersInToolViewsDescription: 'Display line numbers in tool view diffs',
      wrapLinesInDiffs: 'Wrap Lines in Diffs',
      wrapLinesInDiffsDescription: 'Wrap long lines instead of horizontal scrolling in diff views',
      alwaysShowContextSize: 'Always Show Context Size',
      alwaysShowContextSizeDescription: 'Display context usage even when not near limit',
      avatarStyle: 'Avatar Style',
      avatarStyleDescription: 'Choose session avatar appearance',
      avatarOptions: {
        pixelated: 'Pixelated',
        gradient: 'Gradient',
        brutalist: 'Brutalist',
      },
      showFlavorIcons: 'Show AI Provider Icons',
      showFlavorIconsDescription: 'Display AI provider icons on session avatars',
      compactSessionView: 'Compact Session View',
      compactSessionViewDescription: 'Show active sessions in a more compact layout',
    },
    settingsFeatures: {
      experiments: 'Experiments',
      experimentsDescription:
        'Enable experimental features that are still in development. These features may be unstable or change without notice.',
      experimentalFeatures: 'Experimental Features',
      experimentalFeaturesEnabled: 'Experimental features enabled',
      experimentalFeaturesDisabled: 'Using stable features only',
      webFeatures: 'Web Features',
      webFeaturesDescription: 'Features available only in the web version of the app.',
      commandPalette: 'Command Palette',
      commandPaletteEnabled: 'Press Command+K to open',
      commandPaletteDisabled: 'Quick command access disabled',
      markdownCopyV2: 'Markdown Copy v2',
      markdownCopyV2Subtitle: 'Long press opens copy modal',
      hideInactiveSessions: 'Hide inactive sessions',
      hideInactiveSessionsSubtitle: 'Show only active chats in your list',
      groupSessionsByProject: 'Group sessions by project',
      groupSessionsByProjectSubtitle: 'Group past sessions by their working directory',
      notifications: 'Notifications',
      notificationsDescription: 'Configure how you receive alerts about your sessions.',
      contextNotifications: 'Context Usage Alerts',
      contextNotificationsEnabled: 'Get notified at 80% and 95%',
      contextNotificationsDisabled: 'No context usage alerts',
    },
    errors: {
      networkError: 'Network error occurred',
      serverError: 'Server error occurred',
      unknownError: 'An unknown error occurred',
      connectionTimeout: 'Connection timed out',
      authenticationFailed: 'Authentication failed',
      permissionDenied: 'Permission denied',
      fileNotFound: 'File not found',
      invalidFormat: 'Invalid format',
      operationFailed: 'Operation failed',
      tryAgain: 'Please try again',
      contactSupport: 'Contact support if the problem persists',
      sessionNotFound: 'Session not found',
      voiceSessionFailed: 'Failed to start voice session',
      voiceServiceUnavailable: 'Voice service is currently unavailable',
      oauthInitializationFailed: 'Failed to initialize OAuth flow',
      tokenStorageFailed: 'Failed to store authentication tokens',
      oauthStateMismatch: 'Security validation failed. Please try again',
      tokenExchangeFailed: 'Failed to exchange authorization code',
      oauthAuthorizationDenied: 'Authorization was denied',
      webViewLoadFailed: 'Failed to load authentication page',
      failedToLoadProfile: 'Failed to load user profile',
      userNotFound: 'User not found',
      sessionDeleted: 'Session has been deleted',
      sessionDeletedDescription: 'This session has been permanently removed',
      messagesLoadingTimeout: 'Messages are taking longer than usual to load',
      messagesLoadingTimeoutRetry: 'Tap to retry',
      notAuthenticated: 'Not authenticated',
      copySupportId: 'Copy ID',
      supportIdCopied: 'Support ID copied',
      fieldError: '{field}: {reason}',
      validationError: '{field} must be between {min} and {max}',
      retryIn: 'Retry in {seconds} second | Retry in {seconds} seconds',
      errorWithCode: '{message} (Error {code})',
      disconnectServiceFailed: 'Failed to disconnect {service}',
      connectServiceFailed: 'Failed to connect {service}. Please try again.',
      failedToLoadFriends: 'Failed to load friends list',
      failedToAcceptRequest: 'Failed to accept friend request',
      failedToRejectRequest: 'Failed to reject friend request',
      failedToRemoveFriend: 'Failed to remove friend',
      searchFailed: 'Search failed. Please try again.',
      failedToSendRequest: 'Failed to send friend request',
      claudeTokenExpired: 'Claude authentication expired. Please reconnect your account.',
      claudeNotConnected: 'Claude account not connected. Go to Settings to connect.',
      claudeTokenRefreshFailed: 'Failed to refresh Claude token. Please reconnect your account.',
      claudeApiError: 'Claude API request failed. Please try again.',
      claudeReconnect: 'Reconnect Claude',
    },
    newSession: {
      title: 'Start New Session',
      noMachinesFound: 'No machines found. Start a Happy session on your computer first.',
      allMachinesOffline: 'All machines appear offline',
      machineDetails: 'View machine details',
      directoryDoesNotExist: 'Directory Not Found',
      createDirectoryConfirm: 'The directory {directory} does not exist. Do you want to create it?',
      sessionStarted: 'Session Started',
      sessionStartedMessage: 'The session has been started successfully.',
      sessionSpawningFailed: 'Session spawning failed - no session ID returned.',
      startingSession: 'Starting session...',
      startNewSessionInFolder: 'New session here',
      failedToStart: 'Failed to start session. Make sure the daemon is running on the target machine.',
      sessionTimeout: 'Session startup timed out. The machine may be slow or the daemon may not be responding.',
      notConnectedToServer: 'Not connected to server. Check your internet connection.',
      noMachineSelected: 'Please select a machine to start the session',
      noPathSelected: 'Please select a directory to start the session in',
      sessionStartingSlow:
        'Session is starting slowly. It will appear in your sessions list once ready. You may need to send your prompt again.',
      sessionPolling: 'Session starting, please wait...',
      sessionPollingProgress: 'Waiting for session... ({attempt}/{maxAttempts})',
      sessionStartFailed:
        'Session failed to start. The daemon may not have responded in time. Please check CLI logs and try again.',
      sessionType: {
        title: 'Session Type',
        simple: 'Simple',
        worktree: 'Worktree',
        comingSoon: 'Coming soon',
      },
      worktree: {
        creating: "Creating worktree '{name}'...",
        notGitRepo: 'Worktrees require a git repository',
        failed: 'Failed to create worktree: {error}',
        success: 'Worktree created successfully',
      },
      fabAccessibilityLabel: 'Create new session',
      recentPaths: {
        header: 'Recent',
        browseAll: 'Browse all...',
      },
    },
    sessions: {
      quickStart: 'Quick Start',
    },
    sessionHistory: {
      title: 'Session History',
      empty: 'No sessions found',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: '{count} day ago | {count} days ago',
      projects: 'Projects',
      sessionsCount: '{count} session | {count} sessions',
      viewAll: 'View all sessions',
      resume: 'Resume',
      resumeSession: 'Resume Session',
      resumeConfirm: 'Resume this session?',
      resumeDescription:
        'This will create a new session with the full conversation history from the original. The original session will remain unchanged.',
      resumeStarting: 'Resuming session...',
      resumeSuccess: 'Session resumed successfully',
      resumeFailed: 'Failed to resume session',
      resumeNotAvailable: 'Resume not available',
      resumeRequiresMachine: 'Machine must be online to resume',
      resumeClaudeOnly: 'Resume is only available for Claude sessions',
    },
    session: {
      inputPlaceholder: 'Type a message ...',
      inputPlaceholderArchived: 'Session is archived',
      archivedBannerText: 'This session is archived',
      machineOffline: 'Machine offline',
      noMessagesYet: 'No messages yet',
      createdTime: 'Created {time}',
      loadingOlderMessages: 'Loading...',
      noMoreMessages: 'Beginning of conversation',
      expandableHeader: {
        model: 'Model',
        mode: 'Mode',
        context: 'Context',
        tapToExpand: 'Tap for details',
        connected: 'Connected',
        disconnected: 'Disconnected',
      },
      syncFailedBanner: {
        message: 'Showing cached messages - sync failed',
        retry: 'Retry',
      },
    },
    commandPalette: {
      placeholder: 'Type a command or search...',
    },
    server: {
      serverConfiguration: 'Server Configuration',
      enterServerUrl: 'Please enter a server URL',
      notValidHappyServer: 'Not a valid Happy Server',
      changeServer: 'Change Server',
      continueWithServer: 'Continue with this server?',
      resetToDefault: 'Reset to Default',
      resetServerDefault: 'Reset server to default?',
      validating: 'Validating...',
      validatingServer: 'Validating server...',
      serverReturnedError: 'Server returned an error',
      failedToConnectToServer: 'Failed to connect to server',
      currentlyUsingCustomServer: 'Currently using custom server',
      customServerUrlLabel: 'Custom Server URL',
      advancedFeatureFooter:
        "This is an advanced feature. Only change the server if you know what you're doing. You will need to log out and log in again after changing servers.",
      invalidJsonResponse:
        'Server response is not valid JSON. Make sure the URL points to a Happy Server API, not a web page.',
      missingRequiredFields: 'Server response is missing required fields: {fields}',
      incompatibleVersion:
        'Server version {serverVersion} is not compatible. Minimum required version is {requiredVersion}.',
      httpError: 'Server returned HTTP error {status}',
      emptyResponse: 'Server returned an empty response',
    },
    languageSelector: {
      title: 'Language',
      description: 'Select your preferred language',
      systemDefault: 'System default',
      currentLanguage: 'Current: {language}',
    },
    formatting: {
      dateTime: {
        today: 'Today',
        yesterday: 'Yesterday',
        tomorrow: 'Tomorrow',
      },
      numbers: {
        decimal: '.',
        thousands: ',',
      },
    },
  };
}

/**
 * Transpile and load TypeScript translation file using esbuild
 */
async function loadTypeScriptTranslations(langCode) {
  const sourcePath = path.join(SOURCE_PATH, `${langCode}.ts`);
  const tempDir = path.join(__dirname, '.temp');
  const tempFile = path.join(tempDir, `${langCode}.mjs`);

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Read and preprocess the TypeScript file
    let content = fs.readFileSync(sourcePath, 'utf-8');

    // Remove type imports and annotations
    content = content.replace(/import\s+type\s+.*?;/g, '');
    content = content.replace(/:\s*TranslationStructure/g, '');
    content = content.replace(/:\s*\{[^}]*\}/g, ''); // Remove inline type annotations
    content = content.replace(/as\s+const/g, '');

    // Fix the plural function to work without types
    content = content.replace(
      /function plural\([^)]+\):\s*string\s*\{/g,
      'function plural({ count, singular, plural, one, few, many }) {'
    );
    content = content.replace(
      /function plural\([^)]+\)\s*\{/g,
      'function plural({ count, singular, plural, one, few, many }) {'
    );

    // Convert export const to export default
    content = content.replace(/export const (\w+)(?:-\w+)?\s*=\s*/, 'export default ');

    // Write temp file
    fs.writeFileSync(tempFile, content);

    // Import the module
    const module = await import(`file://${tempFile}`);
    const translations = module.default;

    // Convert functions to strings
    return convertToVueI18n(translations);

  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (e) { /* ignore */ }
  }
}

/**
 * Merge parsed translations with English structure
 */
function mergeWithEnglish(parsed, english) {
  function deepMerge(eng, prs) {
    const result = {};
    for (const key of Object.keys(eng)) {
      if (typeof eng[key] === 'object' && eng[key] !== null) {
        result[key] = deepMerge(eng[key], prs?.[key] || {});
      } else {
        result[key] = prs?.[key] !== undefined ? prs[key] : eng[key];
      }
    }
    return result;
  }
  return deepMerge(english, parsed);
}

/**
 * Count keys in nested object
 */
function countKeys(obj) {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Translation Migration Script v3');
  console.log('===============================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
    console.log('Created output directory:', OUTPUT_PATH, '\n');
  }

  // Create English locale
  console.log('Generating English locale (en.json)...');
  const englishLocale = createEnglishLocale();
  const enPath = path.join(OUTPUT_PATH, 'en.json');
  fs.writeFileSync(enPath, JSON.stringify(englishLocale, null, 2) + '\n');
  console.log('  Created:', enPath, '\n');

  const englishKeyCount = countKeys(englishLocale);

  // Process each language
  for (const lang of LANGUAGES) {
    console.log(`Processing ${lang}...`);

    try {
      const parsed = await loadTypeScriptTranslations(lang);
      const merged = mergeWithEnglish(parsed, englishLocale);

      const outputPath = path.join(OUTPUT_PATH, `${lang}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2) + '\n');
      console.log(`  Created: ${outputPath}`);

      const keyCount = countKeys(merged);
      console.log(`  Keys: ${keyCount}/${englishKeyCount}`);
    } catch (error) {
      console.error(`  Error processing ${lang}:`, error.message);
      // Fall back to English structure
      const outputPath = path.join(OUTPUT_PATH, `${lang}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(englishLocale, null, 2) + '\n');
      console.log(`  Created (fallback): ${outputPath}`);
    }
  }

  // Cleanup temp directory
  const tempDir = path.join(__dirname, '.temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }

  console.log('\n===============================');
  console.log('Migration complete!');
  console.log(`\nGenerated ${LANGUAGES.length + 1} locale files`);
}

// Run migration
migrate().catch(console.error);
