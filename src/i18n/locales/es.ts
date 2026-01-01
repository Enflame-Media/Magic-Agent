/**
 * Spanish translations for Happy Admin Dashboard
 */
import type { AdminTranslations } from './en';

const es: AdminTranslations = {
    common: {
        cancel: 'Cancelar',
        save: 'Guardar',
        delete: 'Eliminar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        retry: 'Reintentar',
        connected: 'Conectado',
        disconnected: 'Desconectado',
        submit: 'Enviar',
        confirm: 'Confirmar',
        close: 'Cerrar',
        search: 'Buscar',
        filter: 'Filtrar',
        export: 'Exportar',
        refresh: 'Actualizar',
        noData: 'No hay datos disponibles',
        back: 'Atrás',
        next: 'Siguiente',
        previous: 'Anterior',
    },

    auth: {
        login: 'Iniciar sesión',
        logout: 'Cerrar sesión',
        loggingIn: 'Iniciando sesión...',
        loginWithGitHub: 'Iniciar sesión con GitHub',
        loginFailed: 'Error al iniciar sesión',
        sessionExpired: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
        unauthorized: 'No estás autorizado para acceder a esta página.',
    },

    navigation: {
        dashboard: 'Panel',
        users: 'Usuarios',
        analytics: 'Analíticas',
        settings: 'Configuración',
        adminUsers: 'Usuarios Admin',
    },

    dashboard: {
        title: 'Panel',
        welcome: 'Bienvenido a Happy Admin',
        overview: 'Resumen',
        metrics: 'Métricas',
        recentActivity: 'Actividad Reciente',
        quickActions: 'Acciones Rápidas',
    },

    users: {
        title: 'Usuarios',
        totalUsers: 'Usuarios Totales',
        activeUsers: 'Usuarios Activos',
        newUsers: 'Nuevos Usuarios',
        userDetails: 'Detalles del Usuario',
        noUsers: 'No se encontraron usuarios',
        searchUsers: 'Buscar usuarios...',
        filterByStatus: 'Filtrar por estado',
        allStatuses: 'Todos los Estados',
        active: 'Activo',
        inactive: 'Inactivo',
        banned: 'Baneado',
    },

    analytics: {
        title: 'Analíticas',
        syncMetrics: 'Métricas de Sincronización',
        bundleSize: 'Tamaño del Bundle',
        validationTrends: 'Tendencias de Validación',
        performanceTrends: 'Tendencias de Rendimiento',
        modeDistribution: 'Distribución de Modos',
        dateRange: 'Rango de Fechas',
        last7Days: 'Últimos 7 Días',
        last30Days: 'Últimos 30 Días',
        last90Days: 'Últimos 90 Días',
        customRange: 'Rango Personalizado',
        platform: 'Plataforma',
        allPlatforms: 'Todas las Plataformas',
        ios: 'iOS',
        android: 'Android',
        web: 'Web',
    },

    settings: {
        title: 'Configuración',
        appearance: 'Apariencia',
        language: 'Idioma',
        theme: {
            title: 'Tema',
            light: 'Claro',
            dark: 'Oscuro',
            system: 'Sistema',
        },
        account: 'Cuenta',
        preferences: 'Preferencias',
        notifications: 'Notificaciones',
    },

    errors: {
        networkError: 'Error de red. Por favor, verifica tu conexión.',
        serverError: 'Error del servidor. Inténtalo más tarde.',
        notFound: 'Recurso no encontrado.',
        unauthorized: 'No autorizado. Por favor, inicia sesión.',
        forbidden: 'Acceso denegado.',
        validationError: 'Por favor, verifica tu entrada.',
        unknownError: 'Ocurrió un error desconocido.',
    },

    time: {
        today: 'Hoy',
        yesterday: 'Ayer',
        thisWeek: 'Esta Semana',
        lastWeek: 'La Semana Pasada',
        thisMonth: 'Este Mes',
        lastMonth: 'El Mes Pasado',
    },

    metrics: {
        sessions: 'Sesiones',
        messages: 'Mensajes',
        tokens: 'Tokens',
        cost: 'Costo',
        avgResponseTime: 'Tiempo de Respuesta Promedio',
        errorRate: 'Tasa de Error',
        successRate: 'Tasa de Éxito',
    },
};

export default es;
