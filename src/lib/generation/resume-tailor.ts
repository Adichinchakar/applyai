import { getGemini, MODELS } from '@/lib/claude';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export interface ResumeTailorResult {
  tailoredContent: string;
  keywordsMatched: string[];
  bulletReordered: string;
  summary: string;
}

async function getResumeContent(): Promise<string> {
  try {
    const resumePath = path.join(process.cwd(), 'data', 'resume.md');
    return fs.readFileSync(resumePath, 'utf-8');
  } catch {
    const db = getDb();
    const rows = await db`SELECT value FROM settings WHERE key = 'resume'`;
    if (rows.length > 0) {
      return typeof rows[0].value === 'string' ? rows[0].value : JSON.stringify(rows[0].value);
    }
    return 'Resume not available.';
  }
}

export async function tailorResume(
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<ResumeTailorResult> {
  const resumeContent = await getResumeContent();

  const prompt = `Tailor this resume for the following job. Return a JSON object with:
- tailoredContent: The full tailored resume in markdown (same structure, reordered bullets + mirrored JD keywords — never invent experience)
- keywordsMatched: Array of JD keywords found or naturally present in the resume
- bulletReordered: The single most relevant bullet point you moved to top
- summary: 1-sentence summary of changes made

Job: ${jobTitle} at ${company}

Job Description (key requirements):
${jobDescription.slice(0, 2000)}

Original Resume:
${resumeContent}

Return ONLY valid JSON, no other text.`;

  const genAI = await getGemini();
  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    systemInstruction: 'You are an expert resume writer who tailors resumes to match job descriptions while keeping all content truthful. Never fabricate experience or metrics.',
  });

  const response = await model.generateContent(prompt);
  const text = response.response.text() || '';

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as ResumeTailorResult;
  } catch {
    return {
      tailoredContent: resumeContent,
      keywordsMatched: [],
      bulletReordered: '',
      summary: 'Could not parse tailoring result',
    };
  }
}
