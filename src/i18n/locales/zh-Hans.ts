/**
 * Chinese (Simplified) translations for Happy Admin Dashboard
 */
import type { AdminTranslations } from './en';

const zhHans: AdminTranslations = {
    common: {
        cancel: '取消',
        save: '保存',
        delete: '删除',
        loading: '加载中...',
        error: '错误',
        success: '成功',
        retry: '重试',
        connected: '已连接',
        disconnected: '已断开',
        submit: '提交',
        confirm: '确认',
        close: '关闭',
        search: '搜索',
        filter: '筛选',
        export: '导出',
        refresh: '刷新',
        noData: '暂无数据',
        back: '返回',
        next: '下一步',
        previous: '上一步',
    },

    auth: {
        login: '登录',
        logout: '登出',
        loggingIn: '登录中...',
        loginWithGitHub: '使用 GitHub 登录',
        loginFailed: '登录失败',
        sessionExpired: '会话已过期，请重新登录。',
        unauthorized: '您无权访问此页面。',
    },

    navigation: {
        dashboard: '仪表板',
        users: '用户',
        analytics: '分析',
        settings: '设置',
        adminUsers: '管理员',
    },

    dashboard: {
        title: '仪表板',
        welcome: '欢迎来到 Happy Admin',
        overview: '概览',
        metrics: '指标',
        recentActivity: '最近活动',
        quickActions: '快速操作',
    },

    users: {
        title: '用户',
        totalUsers: '用户总数',
        activeUsers: '活跃用户',
        newUsers: '新用户',
        userDetails: '用户详情',
        noUsers: '未找到用户',
        searchUsers: '搜索用户...',
        filterByStatus: '按状态筛选',
        allStatuses: '所有状态',
        active: '活跃',
        inactive: '不活跃',
        banned: '已封禁',
    },

    analytics: {
        title: '分析',
        syncMetrics: '同步指标',
        bundleSize: '包大小',
        validationTrends: '验证趋势',
        performanceTrends: '性能趋势',
        modeDistribution: '模式分布',
        dateRange: '日期范围',
        last7Days: '最近 7 天',
        last30Days: '最近 30 天',
        last90Days: '最近 90 天',
        customRange: '自定义范围',
        platform: '平台',
        allPlatforms: '所有平台',
        ios: 'iOS',
        android: 'Android',
        web: 'Web',
    },

    settings: {
        title: '设置',
        appearance: '外观',
        language: '语言',
        theme: {
            title: '主题',
            light: '浅色',
            dark: '深色',
            system: '跟随系统',
        },
        account: '账户',
        preferences: '偏好设置',
        notifications: '通知',
    },

    errors: {
        networkError: '网络错误，请检查您的连接。',
        serverError: '服务器错误，请稍后重试。',
        notFound: '资源未找到。',
        unauthorized: '未授权，请登录。',
        forbidden: '禁止访问。',
        validationError: '请检查您的输入。',
        unknownError: '发生未知错误。',
    },

    time: {
        today: '今天',
        yesterday: '昨天',
        thisWeek: '本周',
        lastWeek: '上周',
        thisMonth: '本月',
        lastMonth: '上月',
    },

    metrics: {
        sessions: '会话',
        messages: '消息',
        tokens: '令牌',
        cost: '费用',
        avgResponseTime: '平均响应时间',
        errorRate: '错误率',
        successRate: '成功率',
    },
};

export default zhHans;
