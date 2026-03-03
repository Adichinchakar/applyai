import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Converts resume.md → clean HTML suitable for PDF printing
function markdownToHtml(md: string): string {
  const body = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // Bullet points — collect into <ul> blocks
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> items in <ul>
    .replace(/(<li>[^]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Blank lines become paragraph breaks
    .replace(/\n{2,}/g, '</p><p>')
    // Single newlines become <br> only inside paragraphs
    .replace(/\n/g, ' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1a1a1a;
      padding: 18mm 20mm;
      max-width: 210mm;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      color: #111;
      margin-bottom: 2px;
      border-bottom: 2.5px solid #4F46E5;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    h2 {
      font-size: 11pt;
      font-weight: 700;
      color: #4F46E5;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 16px;
      margin-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    h3 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #111;
      margin-top: 10px;
      margin-bottom: 2px;
    }
    ul {
      margin: 3px 0 8px 0;
      padding-left: 16px;
    }
    li {
      margin-bottom: 3px;
      color: #222;
    }
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 10px 0;
    }
    p {
      margin: 5px 0;
      color: #333;
    }
    strong { font-weight: 700; color: #111; }
    em { font-style: italic; }
  </style>
</head>
<body>
  <p>${body}</p>
</body>
</html>`;
}

export async function POST(): Promise<NextResponse> {
  const resumePath = path.join(process.cwd(), 'data', 'resume.md');
  const outputPath = path.join(process.cwd(), 'data', 'resume.pdf');

  // Validate source file exists
  if (!fs.existsSync(resumePath)) {
    return NextResponse.json(
      { error: 'resume.md not found at data/resume.md' },
      { status: 404 }
    );
  }

  try {
    const resumeContent = fs.readFileSync(resumePath, 'utf-8');
    const html = markdownToHtml(resumeContent);

    // Use Playwright (already installed) to print to PDF headlessly
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }, // margins handled in CSS
    });

    await browser.close();

    // Return file size for confirmation
    const stats = fs.statSync(outputPath);
    const sizeKb = Math.round(stats.size / 1024);

    return NextResponse.json({
      success: true,
      path: 'data/resume.pdf',
      sizeKb,
      message: `resume.pdf generated (${sizeKb} KB)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    console.error('[resume-pdf]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
