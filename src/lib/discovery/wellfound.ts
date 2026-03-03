import { DiscoveredJob, ATSType } from '@/types';

// Wellfound scraping using fetch (headless-free approach)
// Falls back gracefully if scraping fails
export async function discoverWellfoundJobs(
  roles: string[]
): Promise<DiscoveredJob[]> {
  const discovered: DiscoveredJob[] = [];

  for (const role of roles.slice(0, 2)) {
    try {
      const encodedRole = encodeURIComponent(role);
      const url = `https://wellfound.com/jobs?role=${encodedRole}&remote=true`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Basic pattern matching for job data in HTML
      const titleMatches = html.match(/class="[^"]*job-title[^"]*"[^>]*>([^<]+)</gi) || [];
      const companyMatches = html.match(/class="[^"]*company-name[^"]*"[^>]*>([^<]+)</gi) || [];

      // Extract structured data if available (JSON-LD)
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];

      for (const match of jsonLdMatches) {
        try {
          const json = JSON.parse(match.replace(/<script[^>]*>|<\/script>/g, ''));
          if (json['@type'] === 'JobPosting') {
            discovered.push({
              title: json.title || 'Unknown Role',
              company: json.hiringOrganization?.name || 'Unknown Company',
              location: json.jobLocation?.address?.addressLocality || 'Remote',
              jobUrl: json.url || url,
              postedAt: json.datePosted,
              jdRaw: json.description?.replace(/<[^>]+>/g, ' ').slice(0, 3000),
              atsType: 'generic' as ATSType,
              remoteType: json.jobLocationType === 'TELECOMMUTE' ? 'remote' : 'unknown',
              salaryMin: json.baseSalary?.value?.minValue,
              salaryMax: json.baseSalary?.value?.maxValue,
            });
          }
        } catch {
          // Skip invalid JSON
        }
      }

      // If no structured data, create a placeholder entry for manual review
      if (discovered.length === 0 && titleMatches.length > 0) {
        discovered.push({
          title: role,
          company: 'Wellfound Discovery',
          location: 'Remote',
          jobUrl: url,
          atsType: 'generic' as ATSType,
          remoteType: 'remote',
        });
      }
    } catch {
      // Skip failed requests
    }
  }

  return discovered;
}
