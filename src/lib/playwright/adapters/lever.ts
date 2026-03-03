import { Page } from 'playwright';

export async function isLeverForm(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('lever.co') || url.includes('jobs.lever.co');
}
