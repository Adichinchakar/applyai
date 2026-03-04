import { getGemini, MODELS } from '@/lib/claude';
import { getDb } from '@/lib/db';
import { Job } from '@/types';
import fs from 'fs';
import path from 'path';

async function getResumeContent(): Promise<string> {
  try {
    const resumePath = path.join(process.cwd(), 'data', 'resume.md');
    return fs.readFileSync(resumePath, 'utf-8');
  } catch {
    // Fallback to DB (Vercel serverless — no local filesystem write)
    const db = getDb();
    const rows = await db`SELECT value FROM settings WHERE key = 'resume'`;
    if (rows.length > 0) {
      return typeof rows[0].value === 'string' ? rows[0].value : JSON.stringify(rows[0].value);
    }
    return 'Resume not available.';
  }
}

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
      // continue to next URL
    }
  }
  return null;
}

export async function generateCoverLetter(
  job: Job,
  talkingPoints: string[] = []
): Promise<string> {
  const resumeContent = await getResumeContent();

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

  const systemPrompt = `You are a professional cover letter writer who crafts direct, confident letters for senior candidates.

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

  const userPrompt = `Write a cover letter for this role:

**Company:** ${job.company}
**Role:** ${job.title}
**Location:** ${job.location || 'Remote'}

**Job Description:**
${job.jdRaw?.slice(0, 3000) || 'No JD available'}

**Key talking points to weave in:**
${talkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${companyContext}

Write the letter now. Address it "Dear Hiring Team," and sign off with the candidate's name.`;

  const genAI = await getGemini();
  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
    }
  });

  const response = await model.generateContent(userPrompt);
  return response.response.text() || '';
}
