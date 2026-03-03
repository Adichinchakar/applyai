import { XMLParser } from 'fast-xml-parser';
import { DiscoveredJob, ATSType, RemoteType } from '@/types';

function detectATS(url: string): ATSType {
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('myworkdayjobs.com')) return 'workday';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'generic';
}

function detectRemoteType(title: string, description: string): RemoteType {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('remote') && !text.includes('hybrid')) return 'remote';
  if (text.includes('hybrid')) return 'hybrid';
  if (text.includes('onsite') || text.includes('on-site') || text.includes('in-office')) return 'onsite';
  if (text.includes('remote')) return 'remote';
  return 'unknown';
}

function extractSalary(text: string): { min?: number; max?: number } {
  // Match patterns like $120K-$160K or $120,000 - $160,000
  const match = text.match(/\$(\d+)[,k]?(\d*)?\s*[-–to]+\s*\$(\d+)[,k]?(\d*)?/i);
  if (!match) return {};

  const parseAmount = (whole: string, frac: string) => {
    const base = parseInt(whole + (frac || ''), 10);
    if (whole.length <= 3) return base * 1000; // e.g., 120 -> 120000
    return base;
  };

  return {
    min: parseAmount(match[1], match[2]),
    max: parseAmount(match[3], match[4]),
  };
}

export async function discoverLinkedInJobs(
  roles: string[],
  locations: string[]
): Promise<DiscoveredJob[]> {
  const parser = new XMLParser({ ignoreAttributes: false });
  const discovered: DiscoveredJob[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const role of roles.slice(0, 3)) { // Limit to avoid rate limiting
    for (const location of locations.slice(0, 2)) {
      try {
        const encodedRole = encodeURIComponent(role);
        const encodedLocation = encodeURIComponent(location);
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedRole}&location=${encodedLocation}&f_WT=2&f_E=4&f_JT=F&format=rss`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) continue;

        const xml = await response.text();
        const parsed = parser.parse(xml);
        const items = parsed?.rss?.channel?.item;
        if (!items) continue;

        const itemArray = Array.isArray(items) ? items : [items];

        for (const item of itemArray) {
          try {
            const postedAt = item.pubDate ? new Date(item.pubDate).toISOString() : undefined;

            // Filter to last 7 days
            if (postedAt && new Date(postedAt) < sevenDaysAgo) continue;

            const jobUrl = item.link || item.guid || '';
            if (!jobUrl) continue;

            const title = item.title?.replace(/<[^>]+>/g, '').trim() || '';
            const description = item.description?.replace(/<[^>]+>/g, '').trim() || '';
            const companyMatch = description.match(/at\s+([^<\n,]+)/i);
            const company = companyMatch?.[1]?.trim() || 'Unknown Company';

            const salary = extractSalary(`${title} ${description}`);

            discovered.push({
              title,
              company,
              location: item['location'] || location,
              jobUrl,
              postedAt,
              jdRaw: description,
              atsType: detectATS(jobUrl),
              remoteType: detectRemoteType(title, description),
              salaryMin: salary.min,
              salaryMax: salary.max,
            });
          } catch {
            // Skip malformed items
          }
        }
      } catch {
        // Skip failed requests
      }
    }
  }

  return discovered;
}
