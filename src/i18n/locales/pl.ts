/**
 * Polish translations for Happy Admin Dashboard
 */
import type { AdminTranslations } from './en';

const pl: AdminTranslations = {
    common: {
        cancel: 'Anuluj',
        save: 'Zapisz',
        delete: 'Usuń',
        loading: 'Ładowanie...',
        error: 'Błąd',
        success: 'Sukces',
        retry: 'Ponów',
        connected: 'Połączono',
        disconnected: 'Rozłączono',
        submit: 'Wyślij',
        confirm: 'Potwierdź',
        close: 'Zamknij',
        search: 'Szukaj',
        filter: 'Filtruj',
        export: 'Eksportuj',
        refresh: 'Odśwież',
        noData: 'Brak danych',
        back: 'Wstecz',
        next: 'Dalej',
        previous: 'Poprzedni',
    },

    auth: {
        login: 'Zaloguj się',
        logout: 'Wyloguj się',
        loggingIn: 'Logowanie...',
        loginWithGitHub: 'Zaloguj przez GitHub',
        loginFailed: 'Logowanie nie powiodło się',
        sessionExpired: 'Twoja sesja wygasła. Zaloguj się ponownie.',
        unauthorized: 'Nie masz uprawnień do tej strony.',
    },

    navigation: {
        dashboard: 'Panel',
        users: 'Użytkownicy',
        analytics: 'Analityka',
        settings: 'Ustawienia',
        adminUsers: 'Administratorzy',
    },

    dashboard: {
        title: 'Panel',
        welcome: 'Witaj w Happy Admin',
        overview: 'Przegląd',
        metrics: 'Metryki',
        recentActivity: 'Ostatnia Aktywność',
        quickActions: 'Szybkie Akcje',
    },

    users: {
        title: 'Użytkownicy',
        totalUsers: 'Łączna Liczba Użytkowników',
        activeUsers: 'Aktywni Użytkownicy',
        newUsers: 'Nowi Użytkownicy',
        userDetails: 'Szczegóły Użytkownika',
        noUsers: 'Nie znaleziono użytkowników',
        searchUsers: 'Szukaj użytkowników...',
        filterByStatus: 'Filtruj według statusu',
        allStatuses: 'Wszystkie Statusy',
        active: 'Aktywny',
        inactive: 'Nieaktywny',
        banned: 'Zablokowany',
    },

    analytics: {
        title: 'Analityka',
        syncMetrics: 'Metryki Synchronizacji',
        bundleSize: 'Rozmiar Pakietu',
        validationTrends: 'Trendy Walidacji',
        performanceTrends: 'Trendy Wydajności',
        modeDistribution: 'Rozkład Trybów',
        dateRange: 'Zakres Dat',
        last7Days: 'Ostatnie 7 Dni',
        last30Days: 'Ostatnie 30 Dni',
        last90Days: 'Ostatnie 90 Dni',
        customRange: 'Własny Zakres',
        platform: 'Platforma',
        allPlatforms: 'Wszystkie Platformy',
        ios: 'iOS',
        android: 'Android',
        web: 'Web',
    },

    settings: {
        title: 'Ustawienia',
        appearance: 'Wygląd',
        language: 'Język',
        theme: {
            title: 'Motyw',
            light: 'Jasny',
            dark: 'Ciemny',
            system: 'Systemowy',
        },
        account: 'Konto',
        preferences: 'Preferencje',
        notifications: 'Powiadomienia',
    },

    errors: {
        networkError: 'Błąd sieci. Sprawdź połączenie.',
        serverError: 'Błąd serwera. Spróbuj później.',
        notFound: 'Zasób nie znaleziony.',
        unauthorized: 'Brak autoryzacji. Zaloguj się.',
        forbidden: 'Dostęp zabroniony.',
        validationError: 'Sprawdź wprowadzone dane.',
        unknownError: 'Wystąpił nieznany błąd.',
    },

    time: {
        today: 'Dzisiaj',
        yesterday: 'Wczoraj',
        thisWeek: 'Ten Tydzień',
        lastWeek: 'Poprzedni Tydzień',
        thisMonth: 'Ten Miesiąc',
        lastMonth: 'Poprzedni Miesiąc',
    },

    metrics: {
        sessions: 'Sesje',
        messages: 'Wiadomości',
        tokens: 'Tokeny',
        cost: 'Koszt',
        avgResponseTime: 'Średni Czas Odpowiedzi',
        errorRate: 'Wskaźnik Błędów',
        successRate: 'Wskaźnik Sukcesu',
    },
};

export default pl;
