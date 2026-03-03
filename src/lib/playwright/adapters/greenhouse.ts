import { Page } from 'playwright';

export async function isGreenhouseForm(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('greenhouse.io') || url.includes('boards.greenhouse.io');
}

export async function getGreenhouseJobId(url: string): Promise<string | null> {
  const match = url.match(/\/jobs\/(\d+)/);
  return match ? match[1] : null;
}
