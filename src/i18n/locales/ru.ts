/**
 * Russian translations for Happy Admin Dashboard
 */
import type { AdminTranslations } from './en';

const ru: AdminTranslations = {
    common: {
        cancel: 'Отмена',
        save: 'Сохранить',
        delete: 'Удалить',
        loading: 'Загрузка...',
        error: 'Ошибка',
        success: 'Успешно',
        retry: 'Повторить',
        connected: 'Подключено',
        disconnected: 'Отключено',
        submit: 'Отправить',
        confirm: 'Подтвердить',
        close: 'Закрыть',
        search: 'Поиск',
        filter: 'Фильтр',
        export: 'Экспорт',
        refresh: 'Обновить',
        noData: 'Данные отсутствуют',
        back: 'Назад',
        next: 'Далее',
        previous: 'Предыдущий',
    },

    auth: {
        login: 'Войти',
        logout: 'Выйти',
        loggingIn: 'Вход...',
        loginWithGitHub: 'Войти через GitHub',
        loginFailed: 'Ошибка входа',
        sessionExpired: 'Ваша сессия истекла. Пожалуйста, войдите снова.',
        unauthorized: 'У вас нет доступа к этой странице.',
    },

    navigation: {
        dashboard: 'Панель',
        users: 'Пользователи',
        analytics: 'Аналитика',
        settings: 'Настройки',
        adminUsers: 'Администраторы',
    },

    dashboard: {
        title: 'Панель',
        welcome: 'Добро пожаловать в Happy Admin',
        overview: 'Обзор',
        metrics: 'Метрики',
        recentActivity: 'Последняя Активность',
        quickActions: 'Быстрые Действия',
    },

    users: {
        title: 'Пользователи',
        totalUsers: 'Всего Пользователей',
        activeUsers: 'Активных Пользователей',
        newUsers: 'Новых Пользователей',
        userDetails: 'Детали Пользователя',
        noUsers: 'Пользователи не найдены',
        searchUsers: 'Поиск пользователей...',
        filterByStatus: 'Фильтр по статусу',
        allStatuses: 'Все Статусы',
        active: 'Активный',
        inactive: 'Неактивный',
        banned: 'Заблокирован',
    },

    analytics: {
        title: 'Аналитика',
        syncMetrics: 'Метрики Синхронизации',
        bundleSize: 'Размер Бандла',
        validationTrends: 'Тренды Валидации',
        performanceTrends: 'Тренды Производительности',
        modeDistribution: 'Распределение Режимов',
        dateRange: 'Диапазон Дат',
        last7Days: 'Последние 7 Дней',
        last30Days: 'Последние 30 Дней',
        last90Days: 'Последние 90 Дней',
        customRange: 'Произвольный Период',
        platform: 'Платформа',
        allPlatforms: 'Все Платформы',
        ios: 'iOS',
        android: 'Android',
        web: 'Веб',
    },

    settings: {
        title: 'Настройки',
        appearance: 'Внешний Вид',
        language: 'Язык',
        theme: {
            title: 'Тема',
            light: 'Светлая',
            dark: 'Тёмная',
            system: 'Системная',
        },
        account: 'Аккаунт',
        preferences: 'Предпочтения',
        notifications: 'Уведомления',
    },

    errors: {
        networkError: 'Ошибка сети. Проверьте подключение.',
        serverError: 'Ошибка сервера. Попробуйте позже.',
        notFound: 'Ресурс не найден.',
        unauthorized: 'Требуется авторизация.',
        forbidden: 'Доступ запрещён.',
        validationError: 'Проверьте введённые данные.',
        unknownError: 'Произошла неизвестная ошибка.',
    },

    time: {
        today: 'Сегодня',
        yesterday: 'Вчера',
        thisWeek: 'Эта Неделя',
        lastWeek: 'Прошлая Неделя',
        thisMonth: 'Этот Месяц',
        lastMonth: 'Прошлый Месяц',
    },

    metrics: {
        sessions: 'Сессии',
        messages: 'Сообщения',
        tokens: 'Токены',
        cost: 'Стоимость',
        avgResponseTime: 'Среднее Время Ответа',
        errorRate: 'Процент Ошибок',
        successRate: 'Процент Успеха',
    },
};

export default ru;
