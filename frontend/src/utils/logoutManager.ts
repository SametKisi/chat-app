import { authClient, clearAuthToken } from "../lib/authClient";

class LogoutManager {
    public async performLogout(
        _reason?: string,
        _customMessage?: string,
        navigate?: (path: string) => void
    ) {
        try {
            clearAuthToken();
            await (authClient.signOut as any)();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            if (navigate) {
                navigate("/Login");
            } else {
                window.location.href = "/Login";
            }
        }
    }
}

export const logoutManager = new LogoutManager();