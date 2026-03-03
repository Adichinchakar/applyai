import { genAI, MODELS, withRetry } from '@/lib/claude';
import fs from 'fs';
import path from 'path';

export interface ResumeTailorResult {
  tailoredContent: string;
  keywordsMatched: string[];
  bulletReordered: string;
  summary: string;
}

export async function tailorResume(
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<ResumeTailorResult> {
  const resumePath = path.join(process.cwd(), 'data', 'resume.md');
  const resumeContent = fs.readFileSync(resumePath, 'utf-8');

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    systemInstruction: `You are an expert resume writer who tailors resumes to match job descriptions while keeping all content truthful.`,
  });

  const prompt = `Tailor this resume for the following job. Return a JSON object with:
- tailoredContent: The full tailored resume in markdown
- keywordsMatched: Array of JD keywords found/added in resume
- bulletReordered: The single most relevant bullet point you moved to top
- summary: 1-sentence summary of changes made

Job: ${jobTitle} at ${company}

Job Description (key requirements):
${jobDescription.slice(0, 2000)}

Original Resume:
${resumeContent}

Return ONLY valid JSON, no other text.`;

  const result = await withRetry(() => model.generateContent(prompt));
  const text = result.response.text();

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as ResumeTailorResult;
  } catch {
    return {
      tailoredContent: resumeContent,
      keywordsMatched: [],
      bulletReordered: '',
      summary: 'Could not parse tailoring result'
    };
  }
}
