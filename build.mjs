// Собирает RSS блога focus-uz.com в public/rss.xml (для GitHub Pages, feed.focus-uz.com).
// Источник: sitemap → /blog/* → og:title / og:description / og:image + datePublished.
import { mkdirSync, writeFileSync } from 'node:fs';
const SITE = 'https://www.focus-uz.com';
const SELF = 'https://feed.focus-uz.com/rss.xml';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = s => String(s ?? '').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (h, k) => { const m = h.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`)); return m ? unesc(m[1]) : ''; };

const sm = await (await fetch(SITE + '/sitemap.xml')).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => /\/blog\/[^/]+$/.test(u));
const items = [];
for (const url of urls) {
  const h = await (await fetch(url)).text();
  const date = (h.match(/"datePublished":"([^"]+)"/) || [])[1];
  const title = meta(h, 'og:title').replace(/\s*\|\s*FOCUS\s*$/, '');
  if (title && date) items.push({ url, title, date: new Date(date), desc: meta(h, 'og:description'), image: meta(h, 'og:image').split('?')[0] });
}
if (items.length < 5) throw new Error(`Слишком мало статей: ${items.length}`); // не затираем фид при сбое сайта
items.sort((a, b) => b.date - a.date);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>FOCUS – блог об executive search</title>
  <link>${SITE}/blog</link>
  <atom:link href="${SELF}" rel="self" type="application/rss+xml"/>
  <description>Статьи FOCUS о подборе руководителей в Узбекистане и СНГ</description>
  <language>ru</language>
  <lastBuildDate>${items[0].date.toUTCString()}</lastBuildDate>
${items.map(i => `  <item>
    <title>${esc(i.title)}</title>
    <link>${esc(i.url)}</link>
    <guid isPermaLink="true">${esc(i.url)}</guid>
    <pubDate>${i.date.toUTCString()}</pubDate>
    <description>${esc(i.desc)}</description>${i.image ? `
    <media:content url="${esc(i.image)}" medium="image"/>` : ''}
  </item>`).join('\n')}
</channel>
</rss>
`;
mkdirSync('public', { recursive: true });
writeFileSync('public/rss.xml', xml);
writeFileSync('public/CNAME', 'feed.focus-uz.com\n');
writeFileSync('public/index.html', `<!doctype html><meta charset="utf-8"><title>FOCUS RSS</title><link rel="alternate" type="application/rss+xml" title="FOCUS" href="${SELF}"><meta http-equiv="refresh" content="0;url=${SITE}/blog"><a href="/rss.xml">RSS</a>`);
console.log(`OK: ${items.length} статей`);
