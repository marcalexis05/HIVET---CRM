const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkSavedSession(token: string, signal?: AbortSignal, timeoutMs = 10000): Promise<'valid' | 'invalid' | 'unavailable'> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
        const response = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (response.status === 401 || response.status === 403) return 'invalid';
        return response.ok ? 'valid' : 'unavailable';
    } catch { return 'unavailable'; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
