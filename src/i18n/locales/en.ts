/**
 * English translations for Happy Admin Dashboard
 *
 * This is the base/default locale. All other locales should match this structure.
 * Translation keys are organized by feature/section.
 */
export default {
    common: {
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        retry: 'Retry',
        connected: 'Connected',
        disconnected: 'Disconnected',
        submit: 'Submit',
        confirm: 'Confirm',
        close: 'Close',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        refresh: 'Refresh',
        noData: 'No data available',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
    },

    auth: {
        login: 'Login',
        logout: 'Logout',
        loggingIn: 'Logging in...',
        loginWithGitHub: 'Login with GitHub',
        loginFailed: 'Login failed',
        sessionExpired: 'Your session has expired. Please login again.',
        unauthorized: 'You are not authorized to access this page.',
        signIn: 'Sign In',
        signingIn: 'Signing in...',
        signOut: 'Sign Out',
        signInSubtitle: 'Sign in to access the dashboard',
        email: 'Email',
        password: 'Password',
        happyAdmin: 'Happy Admin',
    },

    navigation: {
        dashboard: 'Dashboard',
        users: 'Users',
        analytics: 'Analytics',
        settings: 'Settings',
        adminUsers: 'Admin Users',
    },

    dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome to Happy Admin',
        overview: 'Overview',
        metrics: 'Metrics',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',
        header: 'Happy Admin Dashboard',
        autoOn: 'Auto ✓',
        autoOff: 'Auto ✗',
        updated: 'Updated:',
        tryAgain: 'Try Again',
        syncActivity: 'Sync Activity Over Time',
        avgDuration: 'Average Duration Over Time',
        bundleSizeMetrics: 'Bundle Size Metrics',
        bundleTrends: 'Bundle Size Trends (30 days)',
        validationMetrics: 'Validation Metrics',
        validationTrends: 'Validation Failures Over Time (24h)',
        metricsByType: 'Metrics by Type & Mode',
        noMetrics: 'No metrics data available',
        tableHeaders: {
            type: 'Type',
            mode: 'Mode',
            count: 'Count',
            avgDuration: 'Avg Duration',
            p95Duration: 'P95 Duration',
            successRate: 'Success Rate',
        },
    },

    users: {
        title: 'Users',
        totalUsers: 'Total Users',
        activeUsers: 'Active Users',
        newUsers: 'New Users',
        userDetails: 'User Details',
        noUsers: 'No users found',
        searchUsers: 'Search users...',
        filterByStatus: 'Filter by status',
        allStatuses: 'All Statuses',
        active: 'Active',
        inactive: 'Inactive',
        banned: 'Banned',
        management: 'User Management',
        backToDashboard: 'Back to Dashboard',
        searchPlaceholder: 'Search by email or name...',
        allRoles: 'All Roles',
        admins: 'Admins',
        role: 'Role',
        status: 'Status',
        created: 'Created',
        actions: 'Actions',
        you: '(you)',
        user: 'User',
        edit: 'Edit',
        ban: 'Ban',
        unban: 'Unban',
        editRole: 'Edit User Role',
        changingRoleFor: 'Changing role for',
        banUser: 'Ban User',
        banConfirm: 'Are you sure you want to ban',
        banReason: 'Reason (optional)',
        banReasonPlaceholder: 'Enter reason for banning...',
        saving: 'Saving...',
        banning: 'Banning...',
        roleUpdated: 'Role updated to',
        userBanned: 'User banned successfully',
        userUnbanned: 'User unbanned successfully',
        failedUpdateRole: 'Failed to update role',
        failedBan: 'Failed to ban user',
        failedUnban: 'Failed to unban user',
        showing: 'Showing',
        of: 'of',
        users: 'users',
        page: 'Page',
    },

    analytics: {
        title: 'Analytics',
        syncMetrics: 'Sync Metrics',
        bundleSize: 'Bundle Size',
        validationTrends: 'Validation Trends',
        performanceTrends: 'Performance Trends',
        modeDistribution: 'Mode Distribution',
        dateRange: 'Date Range',
        last7Days: 'Last 7 Days',
        last30Days: 'Last 30 Days',
        last90Days: 'Last 90 Days',
        customRange: 'Custom Range',
        platform: 'Platform',
        allPlatforms: 'All Platforms',
        ios: 'iOS',
        android: 'Android',
        web: 'Web',
    },

    settings: {
        title: 'Settings',
        appearance: 'Appearance',
        language: 'Language',
        theme: {
            title: 'Theme',
            light: 'Light',
            dark: 'Dark',
            system: 'System',
        },
        account: 'Account',
        preferences: 'Preferences',
        notifications: 'Notifications',
    },

    errors: {
        networkError: 'Network error. Please check your connection.',
        serverError: 'Server error. Please try again later.',
        notFound: 'Resource not found.',
        unauthorized: 'Unauthorized. Please login.',
        forbidden: 'Access forbidden.',
        validationError: 'Please check your input.',
        unknownError: 'An unknown error occurred.',
    },

    time: {
        today: 'Today',
        yesterday: 'Yesterday',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
        lastHour: 'Last Hour',
        last6Hours: 'Last 6 Hours',
        last24Hours: 'Last 24 Hours',
        timeRange: 'Time Range',
    },

    metrics: {
        sessions: 'Sessions',
        messages: 'Messages',
        tokens: 'Tokens',
        cost: 'Cost',
        avgResponseTime: 'Avg Response Time',
        errorRate: 'Error Rate',
        successRate: 'Success Rate',
    },
};

/**
 * Type representing the structure of translation messages.
 * Uses string for all leaf values to allow different translations.
 */
export interface AdminTranslations {
    common: {
        cancel: string;
        save: string;
        delete: string;
        loading: string;
        error: string;
        success: string;
        retry: string;
        connected: string;
        disconnected: string;
        submit: string;
        confirm: string;
        close: string;
        search: string;
        filter: string;
        export: string;
        refresh: string;
        noData: string;
        back: string;
        next: string;
        previous: string;
    };
    auth: {
        login: string;
        logout: string;
        loggingIn: string;
        loginWithGitHub: string;
        loginFailed: string;
        sessionExpired: string;
        unauthorized: string;
        signIn: string;
        signingIn: string;
        signOut: string;
        signInSubtitle: string;
        email: string;
        password: string;
        happyAdmin: string;
    };
    navigation: {
        dashboard: string;
        users: string;
        analytics: string;
        settings: string;
        adminUsers: string;
    };
    dashboard: {
        title: string;
        welcome: string;
        overview: string;
        metrics: string;
        recentActivity: string;
        quickActions: string;
        header: string;
        autoOn: string;
        autoOff: string;
        updated: string;
        tryAgain: string;
        syncActivity: string;
        avgDuration: string;
        bundleSizeMetrics: string;
        bundleTrends: string;
        validationMetrics: string;
        validationTrends: string;
        metricsByType: string;
        noMetrics: string;
        tableHeaders: {
            type: string;
            mode: string;
            count: string;
            avgDuration: string;
            p95Duration: string;
            successRate: string;
        };
    };
    users: {
        title: string;
        totalUsers: string;
        activeUsers: string;
        newUsers: string;
        userDetails: string;
        noUsers: string;
        searchUsers: string;
        filterByStatus: string;
        allStatuses: string;
        active: string;
        inactive: string;
        banned: string;
        management: string;
        backToDashboard: string;
        searchPlaceholder: string;
        allRoles: string;
        admins: string;
        role: string;
        status: string;
        created: string;
        actions: string;
        you: string;
        user: string;
        edit: string;
        ban: string;
        unban: string;
        editRole: string;
        changingRoleFor: string;
        banUser: string;
        banConfirm: string;
        banReason: string;
        banReasonPlaceholder: string;
        saving: string;
        banning: string;
        roleUpdated: string;
        userBanned: string;
        userUnbanned: string;
        failedUpdateRole: string;
        failedBan: string;
        failedUnban: string;
        showing: string;
        of: string;
        users: string;
        page: string;
    };
    analytics: {
        title: string;
        syncMetrics: string;
        bundleSize: string;
        validationTrends: string;
        performanceTrends: string;
        modeDistribution: string;
        dateRange: string;
        last7Days: string;
        last30Days: string;
        last90Days: string;
        customRange: string;
        platform: string;
        allPlatforms: string;
        ios: string;
        android: string;
        web: string;
    };
    settings: {
        title: string;
        appearance: string;
        language: string;
        theme: {
            title: string;
            light: string;
            dark: string;
            system: string;
        };
        account: string;
        preferences: string;
        notifications: string;
    };
    errors: {
        networkError: string;
        serverError: string;
        notFound: string;
        unauthorized: string;
        forbidden: string;
        validationError: string;
        unknownError: string;
    };
    time: {
        today: string;
        yesterday: string;
        thisWeek: string;
        lastWeek: string;
        thisMonth: string;
        lastMonth: string;
        lastHour: string;
        last6Hours: string;
        last24Hours: string;
        timeRange: string;
    };
    metrics: {
        sessions: string;
        messages: string;
        tokens: string;
        cost: string;
        avgResponseTime: string;
        errorRate: string;
        successRate: string;
    };
}
