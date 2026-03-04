import { anthropic, MODELS } from '@/lib/claude';
import { CompanyResearch } from '@/types';

async function fetchUrl(url: string, timeout = 5000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAI/1.0)' }
    });
    if (!response.ok) return null;
    const html = await response.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
  } catch {
    return null;
  }
}

export async function researchCompany(
  company: string,
  domain?: string
): Promise<CompanyResearch> {
  let companyContext = `Company name: ${company}\n`;

  if (domain) {
    const aboutContent = await fetchUrl(`https://${domain}/about`);
    if (aboutContent) companyContext += `\nAbout page content:\n${aboutContent}\n`;

    const blogContent = await fetchUrl(`https://${domain}/blog`);
    if (blogContent) companyContext += `\nBlog content:\n${blogContent.slice(0, 1500)}\n`;
  }

  // Try Google News RSS for recent news
  const newsQuery = encodeURIComponent(company);
  const newsContent = await fetchUrl(
    `https://news.google.com/rss/search?q=${newsQuery}&hl=en-US&gl=US&ceid=US:en`,
    8000
  );
  if (newsContent) companyContext += `\nNews RSS:\n${newsContent.slice(0, 2000)}\n`;

  const prompt = `Research this company and return a JSON object with:
- companySummary: 2-3 sentence description of what the company does
- companySize: one of "startup (<50)", "scaleup (50-500)", "enterprise (500+)"
- fundingStage: one of "bootstrapped", "seed", "series-a", "series-b+", "public"
- recentNews: array of up to 3 recent news items, each with {title, url, date}

Company information:
${companyContext}

Return ONLY valid JSON, no other text.`;

  const response = await anthropic.messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    system: 'You are a company research analyst. Extract structured information about companies from web content. Return only valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as CompanyResearch;
  } catch {
    return getDefaultResearch(company);
  }
}

function getDefaultResearch(company: string): CompanyResearch {
  return {
    companySummary: `${company} is a technology company. Research data unavailable.`,
    companySize: 'scaleup (50-500)',
    fundingStage: 'series-a',
    recentNews: [],
  };
}
