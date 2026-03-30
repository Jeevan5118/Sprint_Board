import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Sprint Board';
const DEFAULT_TITLE = `${SITE_NAME} | Team Workflow Platform`;
const DEFAULT_DESCRIPTION = 'Plan sprints, manage tasks, track projects, and collaborate with your team in one workspace.';
const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://sprint-board-frontend.vercel.app').replace(/\/+$/, '');
const DEFAULT_IMAGE = `${SITE_URL}/vite.svg`;

const ROUTE_META = [
    { test: /^\/dashboard$/, title: 'Dashboard', description: 'Track sprint progress, analytics, alerts, and recent uploads.' },
    { test: /^\/power-hour-dashboard$/, title: 'Power Hour Dashboard', description: 'Review focused Power Hour sprint metrics and team output.' },
    { test: /^\/teams/, title: 'Teams', description: 'Manage teams, members, sprint boards, and Kanban workflows.' },
    { test: /^\/projects/, title: 'Projects', description: 'Browse active projects, team ownership, and delivery progress.' },
    { test: /^\/power-hour-projects/, title: 'Power Hour Projects', description: 'Track isolated Power Hour projects and focused execution.' },
    { test: /^\/timeline$/, title: 'Timeline', description: 'View project and task activity timeline across your workspace.' },
    { test: /^\/notifications$/, title: 'Notifications', description: 'Review task, sprint, project, and report notifications.' },
    { test: /^\/settings$/, title: 'Settings', description: 'Manage your profile, security, reports, and workspace settings.' },
    { test: /^\/admin\/import$/, title: 'Admin Import', description: 'Bulk import users, teams, projects, and tasks into Sprint Board.' },
    { test: /^\/login$/, title: 'Login', description: 'Sign in to Sprint Board to access your team workspace.' },
];

const ensureMeta = (attr, key, content) => {
    const selector = attr === 'name' ? `meta[name="${key}"]` : `meta[property="${key}"]`;
    let element = document.head.querySelector(selector);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
};

const ensureCanonical = (href) => {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', href);
};

const SeoManager = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const routeMeta = ROUTE_META.find((r) => r.test.test(pathname));
        const pageTitle = routeMeta ? `${routeMeta.title} | ${SITE_NAME}` : DEFAULT_TITLE;
        const pageDescription = routeMeta?.description || DEFAULT_DESCRIPTION;
        const canonical = `${SITE_URL}${pathname === '/' ? '' : pathname}`;

        document.title = pageTitle;
        ensureMeta('name', 'description', pageDescription);
        ensureMeta('name', 'robots', 'index,follow');
        ensureMeta('property', 'og:type', 'website');
        ensureMeta('property', 'og:site_name', SITE_NAME);
        ensureMeta('property', 'og:title', pageTitle);
        ensureMeta('property', 'og:description', pageDescription);
        ensureMeta('property', 'og:url', canonical);
        ensureMeta('property', 'og:image', DEFAULT_IMAGE);
        ensureMeta('name', 'twitter:card', 'summary_large_image');
        ensureMeta('name', 'twitter:title', pageTitle);
        ensureMeta('name', 'twitter:description', pageDescription);
        ensureMeta('name', 'twitter:image', DEFAULT_IMAGE);
        ensureCanonical(canonical);

        let jsonLd = document.getElementById('seo-jsonld');
        if (!jsonLd) {
            jsonLd = document.createElement('script');
            jsonLd.id = 'seo-jsonld';
            jsonLd.type = 'application/ld+json';
            document.head.appendChild(jsonLd);
        }
        jsonLd.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: SITE_NAME,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: SITE_URL,
            description: DEFAULT_DESCRIPTION,
        });
    }, [pathname]);

    return null;
};

export default SeoManager;
