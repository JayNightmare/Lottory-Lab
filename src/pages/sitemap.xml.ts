import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const pages = ['', 'results', 'generator', 'odds', 'methodology', 'responsible'];
  const urls = pages.map((path) => {
    const loc = new URL(path, site ?? 'https://example.com');
    return `<url><loc>${loc.href}</loc></url>`;
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml'
      }
    }
  );
};
