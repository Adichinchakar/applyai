import { Page } from 'playwright';

export async function isWorkdayForm(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('myworkdayjobs.com');
}
