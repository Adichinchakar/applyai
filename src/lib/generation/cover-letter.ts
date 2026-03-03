import { genAI, MODELS, withRetry } from '@/lib/claude';
import { Job } from '@/types';
import fs from 'fs';
import path from 'path';

async function tryFetchCompanyContent(domain: string): Promise<string | null> {
  if (!domain) return null;

  const urls = [
    `https://${domain}/blog`,
    `https://${domain}/news`,
    `https://${domain}/about`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ApplyAI/1.0)' }
      });
      if (response.ok) {
        const html = await response.text();
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);
        if (text.length > 200) return text;
      }
    } catch {
      // Continue to next URL
    }
  }
  return null;
}

export async function generateCoverLetter(
  job: Job,
  talkingPoints: string[] = []
): Promise<string> {
  const resumePath = path.join(process.cwd(), 'data', 'resume.md');
  const resumeContent = fs.readFileSync(resumePath, 'utf-8');

  let companyContext = '';
  if (job.companyDomain) {
    const fetched = await tryFetchCompanyContent(job.companyDomain);
    if (fetched) {
      companyContext = `\nRecent company content from their website:\n${fetched}\n`;
    }
  }

  if (job.companySummary) {
    companyContext += `\nCompany summary: ${job.companySummary}`;
  }

  const recentNews = job.recentNews?.slice(0, 2).map(n => `- ${n.title}`).join('\n') || '';
  if (recentNews) {
    companyContext += `\nRecent news:\n${recentNews}`;
  }

  const systemInstruction = `You are a professional cover letter writer who crafts direct, confident letters for senior candidates.

STRICT RULES:
- Maximum 3 paragraphs, no more than 200 words total
- NEVER start with "I am excited to apply" or "I am writing to express"
- Lead paragraph: one specific observation about the company/role, then your fit
- Middle paragraph: candidate's single most relevant quantified achievement
- Close: specific ask (a conversation), not "I hope to hear from you"
- Tone: direct and confident, written like a senior professional, not a job seeker
- First person, past tense for achievements, present for current state
- Reference company's recent news/product naturally if relevant
- No fluff, no filler phrases, no generic statements

Candidate resume:
${resumeContent}`;

  const prompt = `Write a cover letter for this role:

**Company:** ${job.company}
**Role:** ${job.title}
**Location:** ${job.location || 'Remote'}

**Job Description:**
${job.jdRaw?.slice(0, 3000) || 'No JD available'}

**Key talking points to weave in:**
${talkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${companyContext}

Write the letter now. Address it "Dear Hiring Team," and sign off with candidate's name.`;

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    systemInstruction,
  });

  const result = await withRetry(() => model.generateContent(prompt));
  return result.response.text();
}
