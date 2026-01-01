/**
 * Portuguese translations for Happy Admin Dashboard
 */
import type { AdminTranslations } from './en';

const pt: AdminTranslations = {
    common: {
        cancel: 'Cancelar',
        save: 'Salvar',
        delete: 'Excluir',
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        retry: 'Tentar Novamente',
        connected: 'Conectado',
        disconnected: 'Desconectado',
        submit: 'Enviar',
        confirm: 'Confirmar',
        close: 'Fechar',
        search: 'Buscar',
        filter: 'Filtrar',
        export: 'Exportar',
        refresh: 'Atualizar',
        noData: 'Nenhum dado disponível',
        back: 'Voltar',
        next: 'Próximo',
        previous: 'Anterior',
    },

    auth: {
        login: 'Entrar',
        logout: 'Sair',
        loggingIn: 'Entrando...',
        loginWithGitHub: 'Entrar com GitHub',
        loginFailed: 'Falha no login',
        sessionExpired: 'Sua sessão expirou. Por favor, entre novamente.',
        unauthorized: 'Você não está autorizado a acessar esta página.',
    },

    navigation: {
        dashboard: 'Painel',
        users: 'Usuários',
        analytics: 'Análises',
        settings: 'Configurações',
        adminUsers: 'Administradores',
    },

    dashboard: {
        title: 'Painel',
        welcome: 'Bem-vindo ao Happy Admin',
        overview: 'Visão Geral',
        metrics: 'Métricas',
        recentActivity: 'Atividade Recente',
        quickActions: 'Ações Rápidas',
    },

    users: {
        title: 'Usuários',
        totalUsers: 'Total de Usuários',
        activeUsers: 'Usuários Ativos',
        newUsers: 'Novos Usuários',
        userDetails: 'Detalhes do Usuário',
        noUsers: 'Nenhum usuário encontrado',
        searchUsers: 'Buscar usuários...',
        filterByStatus: 'Filtrar por status',
        allStatuses: 'Todos os Status',
        active: 'Ativo',
        inactive: 'Inativo',
        banned: 'Banido',
    },

    analytics: {
        title: 'Análises',
        syncMetrics: 'Métricas de Sincronização',
        bundleSize: 'Tamanho do Bundle',
        validationTrends: 'Tendências de Validação',
        performanceTrends: 'Tendências de Desempenho',
        modeDistribution: 'Distribuição de Modos',
        dateRange: 'Período',
        last7Days: 'Últimos 7 Dias',
        last30Days: 'Últimos 30 Dias',
        last90Days: 'Últimos 90 Dias',
        customRange: 'Período Personalizado',
        platform: 'Plataforma',
        allPlatforms: 'Todas as Plataformas',
        ios: 'iOS',
        android: 'Android',
        web: 'Web',
    },

    settings: {
        title: 'Configurações',
        appearance: 'Aparência',
        language: 'Idioma',
        theme: {
            title: 'Tema',
            light: 'Claro',
            dark: 'Escuro',
            system: 'Sistema',
        },
        account: 'Conta',
        preferences: 'Preferências',
        notifications: 'Notificações',
    },

    errors: {
        networkError: 'Erro de rede. Verifique sua conexão.',
        serverError: 'Erro do servidor. Tente novamente mais tarde.',
        notFound: 'Recurso não encontrado.',
        unauthorized: 'Não autorizado. Por favor, faça login.',
        forbidden: 'Acesso proibido.',
        validationError: 'Verifique sua entrada.',
        unknownError: 'Ocorreu um erro desconhecido.',
    },

    time: {
        today: 'Hoje',
        yesterday: 'Ontem',
        thisWeek: 'Esta Semana',
        lastWeek: 'Semana Passada',
        thisMonth: 'Este Mês',
        lastMonth: 'Mês Passado',
    },

    metrics: {
        sessions: 'Sessões',
        messages: 'Mensagens',
        tokens: 'Tokens',
        cost: 'Custo',
        avgResponseTime: 'Tempo de Resposta Médio',
        errorRate: 'Taxa de Erros',
        successRate: 'Taxa de Sucesso',
    },
};

export default pt;
