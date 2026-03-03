import { genAI, MODELS, withRetry } from '@/lib/claude';
import { SchemaType, FunctionCallingMode } from '@google/generative-ai';
import { FitScoreResult, ApplyRecommendation, SeniorityMatch } from '@/types';
import fs from 'fs';
import path from 'path';

export async function scoreJobFit(
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<FitScoreResult> {
  const resumePath = path.join(process.cwd(), 'data', 'resume.md');
  const prefsPath = path.join(process.cwd(), 'data', 'preferences.json');

  const resumeContent = fs.readFileSync(resumePath, 'utf-8');
  const prefsContent = fs.readFileSync(prefsPath, 'utf-8');
  const preferences = JSON.parse(prefsContent);

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    systemInstruction: `You are an expert career coach and recruiter who evaluates job-candidate fit with precise, actionable assessments.

Candidate Resume:
${resumeContent}

Candidate Preferences:
${JSON.stringify(preferences, null, 2)}`,
    tools: [
      {
        functionDeclarations: [
          {
            name: 'score_job_fit',
            description: 'Score how well a candidate fits a job posting across multiple dimensions',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                overall: {
                  type: SchemaType.NUMBER,
                  description: 'Overall fit score from 1-10 (weighted average of all dimensions)',
                },
                skillsMatch: {
                  type: SchemaType.NUMBER,
                  description: 'Percentage (0-100) of required skills the candidate has',
                },
                seniorityMatch: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: ['perfect', 'stretch', 'overqualified'],
                  description: 'How candidate seniority aligns with role requirements',
                },
                domainMatch: {
                  type: SchemaType.NUMBER,
                  description: 'Percentage (0-100) of domain/industry overlap',
                },
                redFlags: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: 'Specific concerns or mismatches from the job description',
                },
                greenFlags: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: 'Specific strengths from resume that match the job',
                },
                talkingPoints: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: 'Top 3 things to emphasize in the cover letter',
                },
                applyRecommendation: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: ['apply', 'skip', 'reach_out_first'],
                  description: 'apply if overall >= 7, reach_out_first if 5-6, skip if < 5',
                },
                reasoning: {
                  type: SchemaType.STRING,
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
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingMode.ANY,
        allowedFunctionNames: ['score_job_fit'],
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

  const response = await withRetry(() => model.generateContent(prompt));
  const functionCalls = response.response.functionCalls();

  if (!functionCalls || functionCalls.length === 0) {
    throw new Error('No function call response from scoring model');
  }

  const result = functionCalls[0].args as FitScoreResult;

  // Enforce recommendation logic
  if (result.overall >= 7) result.applyRecommendation = 'apply' as ApplyRecommendation;
  else if (result.overall >= 5) result.applyRecommendation = 'reach_out_first' as ApplyRecommendation;
  else result.applyRecommendation = 'skip' as ApplyRecommendation;

  result.seniorityMatch = result.seniorityMatch as SeniorityMatch;

  return result;
}
