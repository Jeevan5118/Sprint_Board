import axios from 'axios';

const normalizeBaseUrl = (value) => (value || '').replace(/\/+$/, '');

const inferVercelCandidates = () => {
    if (typeof window === 'undefined') return [];
    const { hostname } = window.location;

    if (!hostname.endsWith('.vercel.app')) return [];

    const candidates = [];
    if (hostname.includes('-frontend.vercel.app')) {
        candidates.push(`https://${hostname.replace('-frontend.vercel.app', '-backend.vercel.app')}/api/v1`);
        candidates.push(`https://${hostname.replace('-frontend.vercel.app', '-web-service.vercel.app')}/api/v1`);
        candidates.push(`https://${hostname.replace('-frontend.vercel.app', '-api.vercel.app')}/api/v1`);
    }

    return candidates;
};

const defaultBaseUrl = () => {
    const configured = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    if (configured) return configured;

    if (import.meta.env.PROD) {
        const inferred = inferVercelCandidates()[0];
        if (inferred) return inferred;
        return '/api/v1';
    }

    return 'http://localhost:5000/api/v1';
};

const api = axios.create({
    baseURL: defaultBaseUrl(),
});

let resolvedBaseUrl = '';
let resolvePromise = null;

const buildCandidateList = () => {
    const configured = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    const candidates = [configured, ...inferVercelCandidates(), '/api/v1'];
    return [...new Set(candidates.filter(Boolean).map(normalizeBaseUrl))];
};

const isHealthyApi = async (base) => {
    try {
        const res = await fetch(`${base}/health`, { method: 'GET' });
        if (!res.ok) return false;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return false;

        const body = await res.json();
        return body?.status === 'ok';
    } catch {
        return false;
    }
};

const resolveApiBaseUrl = async () => {
    if (resolvedBaseUrl) return resolvedBaseUrl;

    const candidates = buildCandidateList();
    for (const candidate of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await isHealthyApi(candidate)) {
            resolvedBaseUrl = candidate;
            return candidate;
        }
    }

    resolvedBaseUrl = defaultBaseUrl();
    return resolvedBaseUrl;
};

api.interceptors.request.use(
    async (config) => {
        if (!resolvePromise) {
            resolvePromise = resolveApiBaseUrl();
        }
        config.baseURL = await resolvePromise;

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        const contentType = response?.headers?.['content-type'] || '';
        if (typeof response.data === 'string' && contentType.includes('text/html')) {
            return Promise.reject(new Error('API returned HTML instead of JSON. Check frontend/backend URL configuration.'));
        }
        return response;
    },
    (error) => Promise.reject(error)
);

export default api;
