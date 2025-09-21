import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = process.env.SITE_URL || 'https://your-user.github.io/lottery-lab';

const derivedBase = (() => {
  if (!SITE) return undefined;
  try {
    const pathname = new URL(SITE).pathname.replace(/\/$/, '');
    return pathname.length ? pathname : '/';
  } catch (error) {
    console.warn('Unable to derive base from SITE_URL:', error);
    return undefined;
  }
})();

const BASE = process.env.BASE_PATH ?? derivedBase ?? (process.env.GITHUB_PAGES === 'true' ? '/lottery-lab' : '/');

export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [react(), sitemap()],
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'file'
  }
});
