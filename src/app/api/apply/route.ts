import { NextRequest } from 'next/server';
import { getDb, rowToJob, logEvent } from '@/lib/db';
import { getBrowserContext } from '@/lib/playwright/browser';
import { fillApplicationForm } from '@/lib/playwright/fill-form';
import { ApplicationData } from '@/types';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { jobId } = await request.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const chunk = `data: ${JSON.stringify({ event, data })}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        const db = getDb();
        const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
        if (!row) {
          send('error', { message: 'Job not found' });
          controller.close();
          return;
        }

        const job = rowToJob(row as Record<string, unknown>);
        if (!job) {
          send('error', { message: 'Invalid job data' });
          controller.close();
          return;
        }

        // Update status to applying
        db.prepare('UPDATE jobs SET status = \'applying\', updated_at = datetime(\'now\') WHERE id = ?').run(jobId);
        logEvent(jobId, 'applying_started', `Navigating to ${job.jobUrl}`);

        // Load preferences for application data
        const prefsPath = path.join(process.cwd(), 'data', 'preferences.json');
        const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

        const requiredPrefs = ['fullName', 'email', 'phone', 'linkedinUrl'];
        const missingPrefs = requiredPrefs.filter(key => !prefs[key]);

        if (missingPrefs.length > 0) {
          send('error', { message: `Missing required personal info in Settings: ${missingPrefs.join(', ')}` });
          controller.close();
          return;
        }

        const applicationData: ApplicationData = {
          fullName: prefs.fullName,
          email: prefs.email,
          phone: prefs.phone,
          linkedinUrl: prefs.linkedinUrl,
          portfolioUrl: prefs.portfolioUrl || '',
          workAuthorization: prefs.workAuthorization || 'Yes',
          yearsOfExperience: prefs.yearsOfExperience || 0,
          currentCompany: prefs.currentCompany || '',
          currentTitle: prefs.currentTitle || '',
          resumeFilePath: path.join(process.cwd(), 'data', 'resume.pdf'),
          coverLetterText: job.coverLetter || '',
          salaryExpectation: prefs.targetSalaryMin ? `$${prefs.targetSalaryMin.toLocaleString()}` : '',
          startDate: prefs.startDate || '',
        };

        // Get browser context and navigate
        const ctx = await getBrowserContext();
        const page = await ctx.newPage();

        send('navigated', { message: `Opening ${job.jobUrl}` });

        await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const result = await fillApplicationForm(page, applicationData, send);

        if (result.success) {
          send('filled', {
            message: 'Form filled. Review and click Submit when ready.',
            screenshot: result.screenshot,
          });
          // Don't auto-submit - human must confirm
        } else {
          db.prepare('UPDATE jobs SET status = \'discovered\', updated_at = datetime(\'now\') WHERE id = ?').run(jobId);
          logEvent(jobId, 'apply_failed', result.error);
        }

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Apply failed';
        send('error', { message });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
