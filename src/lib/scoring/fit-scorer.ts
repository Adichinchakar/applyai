import { anthropic, MODELS } from '@/lib/claude';
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

  const response = await anthropic.messages.create({
    model: MODELS.smart,
    max_tokens: 1024,
    system: `You are an expert career coach and recruiter who evaluates job-candidate fit with precise, actionable assessments.

Candidate Resume:
${resumeContent}

Candidate Preferences:
${JSON.stringify(preferences, null, 2)}`,
    tools: [
      {
        name: 'score_job_fit',
        description: 'Score how well a candidate fits a job posting across multiple dimensions',
        input_schema: {
          type: 'object' as const,
          properties: {
            overall: {
              type: 'number',
              description: 'Overall fit score from 1-10 (weighted average of all dimensions)',
            },
            skillsMatch: {
              type: 'number',
              description: 'Percentage (0-100) of required skills the candidate has',
            },
            seniorityMatch: {
              type: 'string',
              enum: ['perfect', 'stretch', 'overqualified'],
              description: 'How candidate seniority aligns with role requirements',
            },
            domainMatch: {
              type: 'number',
              description: 'Percentage (0-100) of domain/industry overlap',
            },
            redFlags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific concerns or mismatches from the job description',
            },
            greenFlags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific strengths from resume that match the job',
            },
            talkingPoints: {
              type: 'array',
              items: { type: 'string' },
              description: 'Top 3 things to emphasize in the cover letter',
            },
            applyRecommendation: {
              type: 'string',
              enum: ['apply', 'skip', 'reach_out_first'],
              description: 'apply if overall >= 7, reach_out_first if 5-6, skip if < 5',
            },
            reasoning: {
              type: 'string',
              description: '2-3 sentence explanation of the overall assessment',
            },
          },
          required: [
            'overall', 'skillsMatch', 'seniorityMatch', 'domainMatch',
            'redFlags', 'greenFlags', 'talkingPoints', 'applyRecommendation', 'reasoning',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'score_job_fit' },
    messages: [
      {
        role: 'user',
        content: `Score the fit for this job:

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
- overall: Weighted average considering all dimensions`,
      },
    ],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool_use response from scoring model');
  }

  const result = toolUse.input as FitScoreResult;

  // Enforce recommendation logic based on overall score
  if (result.overall >= 7) result.applyRecommendation = 'apply' as ApplyRecommendation;
  else if (result.overall >= 5) result.applyRecommendation = 'reach_out_first' as ApplyRecommendation;
  else result.applyRecommendation = 'skip' as ApplyRecommendation;

  result.seniorityMatch = result.seniorityMatch as SeniorityMatch;

  return result;
}
