import { authClient } from "../lib/authClient";

class LogoutManager {
    public async performLogout(
        _reason?: string,
        _customMessage?: string,
        navigate?: (path: string) => void
    ) {
        try {
            await authClient.signOut();
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