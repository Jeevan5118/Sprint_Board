export const getAbsoluteFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiBase = import.meta.env.VITE_API_URL || '';
    if (apiBase.startsWith('http')) {
        const root = apiBase.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
        return `${root}${url}`;
    }
    return url;
};

export const isWordDoc = (mimetype) => {
    return mimetype?.includes('word') ||
        mimetype?.includes('officedocument.wordprocessingml') ||
        mimetype?.includes('msword');
};

export const isTextFile = (mimetype) => {
    return mimetype?.includes('text/plain') || mimetype?.includes('application/json');
};
