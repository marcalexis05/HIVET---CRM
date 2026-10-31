const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function changeNotification(path: string, method: string, allowMissing = false): Promise<void> {
    let response: Response;
    try {
        response = await fetch(`${API}/api/notifications${path}`, {
            method, headers: { Authorization: `Bearer ${localStorage.getItem('hivet_token')}` }, signal: AbortSignal.timeout(15000)
        });
    } catch {
        throw new Error('Cannot reach the server. Please try again when your connection is available.');
    }
    if (!response.ok && !(allowMissing && response.status === 404)) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Could not update notifications. Please try again.');
    }
    window.dispatchEvent(new CustomEvent('hivet-notifications-changed'));
}
export const dismissNotification = (id: string | number) => changeNotification(`/${encodeURIComponent(String(id))}`, 'DELETE', true);
export const markNotificationRead = (id: string | number) => changeNotification(`/${encodeURIComponent(String(id))}/read`, 'PATCH');
export const markAllNotificationsRead = () => changeNotification('/read-all', 'POST');
export const removeAllNotifications = () => changeNotification('/all', 'DELETE');
