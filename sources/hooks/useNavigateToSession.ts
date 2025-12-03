import { useRouter } from "expo-router"

export function useNavigateToSession() {
    const router = useRouter();
    return (sessionId: string) => {
        router.navigate(`/session/${sessionId}`, {
            dangerouslySingular(_name, _params) {
                return 'session'
            },
        });
    }
}