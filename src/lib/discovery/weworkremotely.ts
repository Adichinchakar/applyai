import { DiscoveredJob, ATSType, RemoteType } from '@/types';
import { XMLParser } from 'fast-xml-parser';

// We Work Remotely has a public RSS feed for design jobs — no auth needed, well-curated.
const WWR_FEEDS = [
  'https://weworkremotely.com/categories/remote-design-jobs.rss',
  'https://weworkremotely.com/categories/remote-product-jobs.rss',
];

const DESIGN_TITLE_KEYWORDS = ['designer', 'ux', 'ui ', 'product design', 'design lead', 'design director', 'head of design'];

function detectATS(url: string): ATSType {
  if (!url) return 'generic';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('myworkdayjobs.com')) return 'workday';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'generic';
}

function isDesignRole(title: string): boolean {
  const lower = title.toLowerCase();
  return DESIGN_TITLE_KEYWORDS.some(kw => lower.includes(kw));
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function discoverWeWorkRemotelyJobs(): Promise<DiscoveredJob[]> {
  const discovered: DiscoveredJob[] = [];
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  for (const feedUrl of WWR_FEEDS) {
    try {
      const response = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAI/1.0)' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      const xml = await response.text();
      const parsed = parser.parse(xml);
      const items: unknown[] = parsed?.rss?.channel?.item || [];
      const itemArray = Array.isArray(items) ? items : [items];

      for (const rawItem of itemArray) {
        const item = rawItem as Record<string, unknown>;
        try {
          const rawTitle = String(item.title || '');
          const link = String(item.link || item.url || item.guid || '');
          const description = String(item.description || item['content:encoded'] || '');
          const pubDate = String(item.pubDate || '');

          // WWR title format: "Company: Job Title at Company"  or  "Company: Role"
          let company = 'Unknown Company';
          let jobTitle = rawTitle;

          const colonIdx = rawTitle.indexOf(':');
          if (colonIdx > 0) {
            company = rawTitle.slice(0, colonIdx).trim();
            jobTitle = rawTitle.slice(colonIdx + 1).trim();
            // Remove trailing "at CompanyName" if present
            jobTitle = jobTitle.replace(/\s+at\s+.+$/i, '').trim();
          }

          // Only keep design-relevant roles
          if (!isDesignRole(jobTitle)) continue;

          // Extract a domain hint from the description links
          let companyDomain: string | undefined;
          const domainMatch = description.match(/https?:\/\/(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
          if (domainMatch) {
            const candidate = domainMatch[1];
            // Skip common platforms (weworkremotely, greenhouse, lever, etc.)
            const skip = ['weworkremotely.com', 'greenhouse.io', 'lever.co', 'linkedin.com', 'indeed.com'];
            if (!skip.some(s => candidate.includes(s))) {
              companyDomain = candidate;
            }
          }

          const jdRaw = stripHtml(description).slice(0, 5000);

          discovered.push({
            title: jobTitle,
            company,
            companyDomain,
            location: 'Remote',
            jobUrl: link,
            postedAt: pubDate,
            jdRaw: jdRaw.length > 50 ? jdRaw : undefined,
            atsType: detectATS(link),
            remoteType: 'remote' as RemoteType,
          });
        } catch {
          // Skip malformed item
        }
      }
    } catch {
      // Network failure for this feed — silently skip
    }
  }

  return discovered;
}
