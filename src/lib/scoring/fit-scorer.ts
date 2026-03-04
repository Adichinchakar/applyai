import { getGemini, MODELS } from '@/lib/claude';
import { getDb } from '@/lib/db';
import { FitScoreResult, ApplyRecommendation, SeniorityMatch } from '@/types';
import fs from 'fs';
import path from 'path';

async function getResumeContent(): Promise<string> {
  // 1. Try local file (dev)
  try {
    const resumePath = path.join(process.cwd(), 'data', 'resume.md');
    return fs.readFileSync(resumePath, 'utf-8');
  } catch {
    // 2. Fall back to DB (Vercel / serverless)
    const db = getDb();
    const rows = await db`SELECT value FROM settings WHERE key = 'resume'`;
    if (rows.length > 0) {
      return typeof rows[0].value === 'string' ? rows[0].value : JSON.stringify(rows[0].value);
    }
    return 'Resume not available.';
  }
}

export async function scoreJobFit(
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<FitScoreResult> {
  const resumeContent = await getResumeContent();

  const db = getDb();
  let preferences = {};
  const prefRows = await db`SELECT value FROM settings WHERE key = 'preferences'`;
  if (prefRows.length > 0) {
    preferences = typeof prefRows[0].value === 'string'
      ? JSON.parse(prefRows[0].value)
      : prefRows[0].value;
  }

  const genAI = await getGemini();
  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    systemInstruction: `You are an expert career coach and recruiter who evaluates job-candidate fit with precise, actionable assessments.

Candidate Resume:
${resumeContent}

Candidate Preferences:
${JSON.stringify(preferences, null, 2)}`,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object' as any,
        properties: {
          overall: {
            type: 'number' as any,
            description: 'Overall fit score from 1-10 (weighted average of all dimensions)',
          },
          skillsMatch: {
            type: 'number' as any,
            description: 'Percentage (0-100) of required skills the candidate has',
          },
          seniorityMatch: {
            type: 'string' as any,
            enum: ['perfect', 'stretch', 'overqualified'],
            description: 'How candidate seniority aligns with role requirements',
          },
          domainMatch: {
            type: 'number' as any,
            description: 'Percentage (0-100) of domain/industry overlap',
          },
          redFlags: {
            type: 'array' as any,
            items: { type: 'string' as any },
            description: 'Specific concerns or mismatches from the job description',
          },
          greenFlags: {
            type: 'array' as any,
            items: { type: 'string' as any },
            description: 'Specific strengths from resume that match the job',
          },
          talkingPoints: {
            type: 'array' as any,
            items: { type: 'string' as any },
            description: 'Top 3 things to emphasize in the cover letter',
          },
          applyRecommendation: {
            type: 'string' as any,
            enum: ['apply', 'skip', 'reach_out_first'],
            description: 'apply if overall >= 7, reach_out_first if 5-6, skip if < 5',
          },
          reasoning: {
            type: 'string' as any,
            description: '2-3 sentence explanation of the overall assessment',
          },
        },
        required: [
          'overall', 'skillsMatch', 'seniorityMatch', 'domainMatch',
          'redFlags', 'greenFlags', 'talkingPoints', 'applyRecommendation', 'reasoning',
        ],
      },
    },
  });

  const prompt = `Score the fit for this job:

**Company:** ${company}
**Title:** ${jobTitle}

**Job Description:**
${jobDescription}

Evaluate carefully:
- skillsMatch: What % of required skills does the candidate have?
- seniorityMatch: Is this role a perfect fit, stretch (1-2 levels up), or below candidate level?
- domainMatch: How well do the company's domain/industry match candidate's target domains?
- redFlags: Be specific (e.g., "Requires 5+ years Go, candidate has none")
- greenFlags: Be specific (e.g., "Built AI rubric engine matches role's ML product focus")
- talkingPoints: Top 3 things to highlight in cover letter
- applyRecommendation: apply (>=7), reach_out_first (5-6), skip (<5)
- overall: Weighted average considering all dimensions`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();

  if (!text) {
    throw new Error('No JSON response from scoring model');
  }

  const result = JSON.parse(text) as FitScoreResult;

  // Round numbers to prevent DB integer type errors
  result.overall = Math.round(result.overall);
  result.skillsMatch = Math.round(result.skillsMatch);
  result.domainMatch = Math.round(result.domainMatch);

  // Enforce recommendation logic based on overall score
  if (result.overall >= 7) result.applyRecommendation = 'apply' as ApplyRecommendation;
  else if (result.overall >= 5) result.applyRecommendation = 'reach_out_first' as ApplyRecommendation;
  else result.applyRecommendation = 'skip' as ApplyRecommendation;

  result.seniorityMatch = result.seniorityMatch as SeniorityMatch;

  return result;
}
