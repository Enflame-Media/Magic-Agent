/**
 * Catalan translations for Happy Admin Dashboard
 */
import type { AdminTranslations } from './en';

const ca: AdminTranslations = {
    common: {
        cancel: 'Cancel·lar',
        save: 'Desar',
        delete: 'Eliminar',
        loading: 'Carregant...',
        error: 'Error',
        success: 'Èxit',
        retry: 'Reintentar',
        connected: 'Connectat',
        disconnected: 'Desconnectat',
        submit: 'Enviar',
        confirm: 'Confirmar',
        close: 'Tancar',
        search: 'Cercar',
        filter: 'Filtrar',
        export: 'Exportar',
        refresh: 'Actualitzar',
        noData: 'No hi ha dades disponibles',
        back: 'Enrere',
        next: 'Següent',
        previous: 'Anterior',
    },

    auth: {
        login: 'Iniciar sessió',
        logout: 'Tancar sessió',
        loggingIn: 'Iniciant sessió...',
        loginWithGitHub: 'Iniciar sessió amb GitHub',
        loginFailed: "Error en l'inici de sessió",
        sessionExpired: 'La teva sessió ha caducat. Si us plau, inicia sessió de nou.',
        unauthorized: "No estàs autoritzat per accedir a aquesta pàgina.",
    },

    navigation: {
        dashboard: 'Panell',
        users: 'Usuaris',
        analytics: 'Analítiques',
        settings: 'Configuració',
        adminUsers: 'Administradors',
    },

    dashboard: {
        title: 'Panell',
        welcome: 'Benvingut a Happy Admin',
        overview: 'Resum',
        metrics: 'Mètriques',
        recentActivity: 'Activitat Recent',
        quickActions: 'Accions Ràpides',
    },

    users: {
        title: 'Usuaris',
        totalUsers: 'Usuaris Totals',
        activeUsers: 'Usuaris Actius',
        newUsers: 'Nous Usuaris',
        userDetails: "Detalls de l'Usuari",
        noUsers: "No s'han trobat usuaris",
        searchUsers: 'Cercar usuaris...',
        filterByStatus: 'Filtrar per estat',
        allStatuses: 'Tots els Estats',
        active: 'Actiu',
        inactive: 'Inactiu',
        banned: 'Bloquejat',
    },

    analytics: {
        title: 'Analítiques',
        syncMetrics: 'Mètriques de Sincronització',
        bundleSize: 'Mida del Paquet',
        validationTrends: 'Tendències de Validació',
        performanceTrends: 'Tendències de Rendiment',
        modeDistribution: 'Distribució de Modes',
        dateRange: 'Rang de Dates',
        last7Days: 'Últims 7 Dies',
        last30Days: 'Últims 30 Dies',
        last90Days: 'Últims 90 Dies',
        customRange: 'Rang Personalitzat',
        platform: 'Plataforma',
        allPlatforms: 'Totes les Plataformes',
        ios: 'iOS',
        android: 'Android',
        web: 'Web',
    },

    settings: {
        title: 'Configuració',
        appearance: 'Aparença',
        language: 'Idioma',
        theme: {
            title: 'Tema',
            light: 'Clar',
            dark: 'Fosc',
            system: 'Sistema',
        },
        account: 'Compte',
        preferences: 'Preferències',
        notifications: 'Notificacions',
    },

    errors: {
        networkError: 'Error de xarxa. Si us plau, comprova la connexió.',
        serverError: 'Error del servidor. Torna-ho a provar més tard.',
        notFound: 'Recurs no trobat.',
        unauthorized: 'No autoritzat. Si us plau, inicia sessió.',
        forbidden: 'Accés prohibit.',
        validationError: "Si us plau, comprova l'entrada.",
        unknownError: "S'ha produït un error desconegut.",
    },

    time: {
        today: 'Avui',
        yesterday: 'Ahir',
        thisWeek: 'Aquesta Setmana',
        lastWeek: 'La Setmana Passada',
        thisMonth: 'Aquest Mes',
        lastMonth: 'El Mes Passat',
    },

    metrics: {
        sessions: 'Sessions',
        messages: 'Missatges',
        tokens: 'Tokens',
        cost: 'Cost',
        avgResponseTime: 'Temps de Resposta Mitjà',
        errorRate: "Taxa d'Errors",
        successRate: "Taxa d'Èxit",
    },
};

export default ca;
