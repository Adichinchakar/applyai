/**
 * Extracts a company domain from ATS job URLs or company name.
 *
 * ATS URL patterns:
 *   Greenhouse:  boards.greenhouse.io/{slug}/jobs/{id}
 *   Lever:       jobs.lever.co/{slug}/{id}
 *   Workday:     {slug}.myworkdayjobs.com/...
 *   LinkedIn:    linkedin.com/jobs/view/{id}  → no domain to extract
 *   Generic:     apply.workable.com/j/{slug}/{id}  → slug may be company
 */

// Known TLD overrides for common company names that don't use .com
const KNOWN_TLDS: Record<string, string> = {
  notion: 'notion.so',
  vercel: 'vercel.com',
  figma: 'figma.com',
  stripe: 'stripe.com',
  linear: 'linear.app',
  loom: 'loom.com',
  miro: 'miro.com',
  canva: 'canva.com',
  framer: 'framer.com',
  webflow: 'webflow.com',
  airtable: 'airtable.com',
  retool: 'retool.com',
  amplitude: 'amplitude.com',
  mixpanel: 'mixpanel.com',
  segment: 'segment.com',
  intercom: 'intercom.com',
  hubspot: 'hubspot.com',
  atlassian: 'atlassian.com',
  asana: 'asana.com',
  monday: 'monday.com',
  clickup: 'clickup.com',
  discord: 'discord.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  dropbox: 'dropbox.com',
  shopify: 'shopify.com',
  squarespace: 'squarespace.com',
  wix: 'wix.com',
  mailchimp: 'mailchimp.com',
  zendesk: 'zendesk.com',
  freshdesk: 'freshdesk.com',
};

/**
 * Tries to extract the company domain from a job URL.
 * Falls back to guessing `{companySlug}.com` from the company name.
 * Returns undefined if nothing can be determined reliably.
 */
export function extractCompanyDomain(jobUrl: string, companyName: string): string | undefined {
  if (!jobUrl) return guessDomainFromName(companyName);

  try {
    const url = new URL(jobUrl);
    const hostname = url.hostname.toLowerCase();
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Greenhouse: boards.greenhouse.io/{company-slug}/jobs/{id}
    if (hostname.includes('greenhouse.io')) {
      const slug = pathParts[0];
      if (slug && slug.length > 1) {
        return knownOrGuess(slug);
      }
    }

    // Lever: jobs.lever.co/{company-slug}/{job-id}
    if (hostname.includes('lever.co')) {
      const slug = pathParts[0];
      if (slug && slug.length > 1) {
        return knownOrGuess(slug);
      }
    }

    // Workday: {company}.myworkdayjobs.com/...
    if (hostname.includes('myworkdayjobs.com')) {
      const companySlug = hostname.split('.')[0];
      if (companySlug && companySlug !== 'www') {
        return knownOrGuess(companySlug);
      }
    }

    // Workable: apply.workable.com/j/{company}/{role}
    if (hostname.includes('workable.com')) {
      const jIdx = pathParts.indexOf('j');
      const slug = jIdx >= 0 ? pathParts[jIdx + 1] : pathParts[1];
      if (slug && slug.length > 1) {
        return knownOrGuess(slug);
      }
    }

    // SmartRecruiters: jobs.smartrecruiters.com/{Company}/{id}
    if (hostname.includes('smartrecruiters.com')) {
      const slug = pathParts[0];
      if (slug && slug.length > 1) {
        return knownOrGuess(slug.toLowerCase());
      }
    }

    // BambooHR: {company}.bamboohr.com/careers/{id}
    if (hostname.includes('bamboohr.com')) {
      const companySlug = hostname.split('.')[0];
      if (companySlug && companySlug !== 'www') {
        return knownOrGuess(companySlug);
      }
    }

    // Generic: if the URL itself is the company site (not an ATS), return the hostname
    const atsHosts = ['greenhouse', 'lever', 'workday', 'linkedin', 'indeed', 'wellfound',
      'weworkremotely', 'remoteok', 'smartrecruiters', 'workable', 'bamboohr',
      'icims', 'taleo', 'successfactors', 'jobvite', 'recruitee'];
    const isAts = atsHosts.some(ats => hostname.includes(ats));

    if (!isAts) {
      // Likely a direct company careers page — use the root domain
      const parts = hostname.replace(/^www\./, '').split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.'); // e.g. careers.stripe.com → stripe.com
      }
    }
  } catch {
    // URL parse failed
  }

  return guessDomainFromName(companyName);
}

/** Checks KNOWN_TLDS first, otherwise appends .com */
function knownOrGuess(slug: string): string {
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return KNOWN_TLDS[clean] || `${clean}.com`;
}

/** Last resort: slugify the company name and guess .com */
function guessDomainFromName(name: string): string | undefined {
  if (!name || name === 'Unknown Company') return undefined;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // strip punctuation
    .replace(/\s+/g, '')             // remove spaces ("Open AI" → "openai")
    .replace(/-+/g, '')              // remove hyphens
    .slice(0, 30);                   // cap length

  if (!slug || slug.length < 2) return undefined;
  return KNOWN_TLDS[slug] || `${slug}.com`;
}
