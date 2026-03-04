import { Page } from 'playwright';
import { getGemini, MODELS } from '@/lib/claude';
import { FormField, ApplicationData } from '@/types';
import fs from 'fs';
import path from 'path';

type SSECallback = (event: string, data: unknown) => void;

async function analyzeFormWithVision(
  page: Page,
  applicationData: ApplicationData
): Promise<FormField[]> {
  const screenshot = await page.screenshot({ fullPage: false });
  const screenshotBase64 = screenshot.toString('base64');

  const prompt = `Analyze this job application form screenshot. Return a JSON array of form fields to fill.

For each visible field, return:
{
  "label": "field label text",
  "selectorHint": "CSS selector or descriptive hint (e.g., 'input[name=email]', 'textarea[placeholder*=cover]')",
  "fieldType": "text|textarea|select|file|checkbox",
  "value": "what to fill based on the application data below",
  "required": true/false
}

Application data to use:
- Full Name: ${applicationData.fullName}
- Email: ${applicationData.email}
- Phone: ${applicationData.phone}
- LinkedIn: ${applicationData.linkedinUrl}
- Portfolio: ${applicationData.portfolioUrl}
- Work Authorization: ${applicationData.workAuthorization}
- Years of Experience: ${applicationData.yearsOfExperience}
- Current Company: ${applicationData.currentCompany}
- Current Title: ${applicationData.currentTitle}
- Salary Expectation: ${applicationData.salaryExpectation}
- Start Date: ${applicationData.startDate}

For file upload fields (resume), use value: "${applicationData.resumeFilePath}"
For cover letter fields, use value: "[COVER_LETTER]" as placeholder.

Return ONLY a valid JSON array, no other text. If you detect a CAPTCHA, return: [{"label":"CAPTCHA","selectorHint":"captcha","fieldType":"checkbox","value":"CAPTCHA_REQUIRED","required":true}]`;

  const genAI = await getGemini();
  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
  });

  const response = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: screenshotBase64,
        mimeType: 'image/png'
      }
    }
  ]);

  const text = response.response.text() || '';

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as FormField[];
  } catch {
    return [];
  }
}

export async function fillApplicationForm(
  page: Page,
  applicationData: ApplicationData,
  onEvent: SSECallback
): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  try {
    onEvent('form_detected', { message: 'Analyzing form with vision AI...' });

    const fields = await analyzeFormWithVision(page, applicationData);

    if (!fields.length) {
      return { success: false, error: 'Could not detect form fields' };
    }

    // Check for CAPTCHA
    const captchaField = fields.find(f => f.value === 'CAPTCHA_REQUIRED');
    if (captchaField) {
      onEvent('captcha_required', { message: 'CAPTCHA detected - human intervention required' });
      return { success: false, error: 'CAPTCHA detected' };
    }

    onEvent('filling', { message: `Filling ${fields.length} fields...`, fields });

    for (const field of fields) {
      try {
        if (!field.selectorHint) continue;

        let value = field.value;
        if (value === '[COVER_LETTER]') {
          value = applicationData.coverLetterText;
        }

        switch (field.fieldType) {
          case 'text':
          case 'textarea': {
            const element = await page.$(field.selectorHint);
            if (element) {
              await element.fill(value);
              await page.waitForTimeout(200);
            } else {
              const byLabel = page.getByLabel(field.label, { exact: false });
              if (await byLabel.count() > 0) {
                await byLabel.first().fill(value);
              }
            }
            break;
          }
          case 'select': {
            const element = await page.$(field.selectorHint);
            if (element) {
              await page.selectOption(field.selectorHint, value);
            }
            break;
          }
          case 'file': {
            const resumePath = path.resolve(value);
            if (fs.existsSync(resumePath)) {
              const fileInput = await page.$(field.selectorHint);
              if (fileInput) {
                await fileInput.setInputFiles(resumePath);
              }
            }
            break;
          }
          case 'checkbox': {
            if (value === 'true') {
              const element = await page.$(field.selectorHint);
              if (element) await page.check(field.selectorHint);
            }
            break;
          }
        }
      } catch {
        // Continue filling other fields
      }
    }

    // Take verification screenshot and ask Claude to verify
    await page.waitForTimeout(1000);
    const verifyScreenshot = await page.screenshot({ fullPage: false });
    const verifyBase64 = verifyScreenshot.toString('base64');

    const genAI = await getGemini();
    const model = genAI.getGenerativeModel({
      model: MODELS.smart,
    });

    const verifyResponse = await model.generateContent([
      'Are the form fields filled in? Return JSON: {"filled": true/false, "issues": ["any issues found"], "readyToSubmit": true/false}',
      {
        inlineData: {
          data: verifyBase64,
          mimeType: 'image/png'
        }
      }
    ]);

    const verifyText = verifyResponse.response.text() || '';
    let verifyData = { filled: true, issues: [] as string[], readyToSubmit: true };

    try {
      const cleaned = verifyText.replace(/```json\n?|\n?```/g, '').trim();
      verifyData = JSON.parse(cleaned);
    } catch {
      // Use defaults
    }

    onEvent('filled', {
      message: 'Form filled successfully',
      screenshot: `data:image/png;base64,${verifyBase64}`,
      ...verifyData,
    });

    return {
      success: true,
      screenshot: `data:image/png;base64,${verifyBase64}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onEvent('error', { message });
    return { success: false, error: message };
  }
}
