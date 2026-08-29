import { authClient, clearAuthToken } from '../lib/authClient';

const LAST_ACTIVITY_KEY = 'last_activity_at';

class LogoutManager {
    private loggingOut = false;

    public async performLogout(reason: string, customMessage?: string, navigate?: (path: string) => void) {
        if (this.loggingOut) return;
        this.loggingOut = true;

        try {
            await authClient.signOut({});
        } catch (err) {
            console.error('[LogoutManager] signOut başarısız (devam ediliyor):', err);
        }

        clearAuthToken();
        localStorage.removeItem(LAST_ACTIVITY_KEY);

        const messages: Record<string, string> = {
            'idle-timeout': 'Uzun süre işlem yapılmadığı için oturumunuz kapatıldı.',
            'session-invalid-on-server': 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
            'token-missing': 'Oturum bilgisi bulunamadı, lütfen tekrar giriş yapın.',
            'api-unauthorized': 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.',
            'user-initiated': 'Çıkış yapıldı.',
        };


        if (navigate) navigate('/login');
        else window.location.href = '/login';

        this.loggingOut = false;
    }

    public isLoggingOut(): boolean {
        return this.loggingOut;
    }
}

export const logoutManager = new LogoutManager();