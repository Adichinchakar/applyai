import { Page } from 'playwright';
import { FormField } from '@/types';

export async function findFormFields(page: Page): Promise<FormField[]> {
  // Generic field detection by common patterns
  const fields: FormField[] = [];

  try {
    const inputs = await page.$$('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select');

    for (const input of inputs.slice(0, 20)) {
      const type = await input.getAttribute('type') || 'text';
      const name = await input.getAttribute('name') || '';
      const placeholder = await input.getAttribute('placeholder') || '';
      const id = await input.getAttribute('id') || '';
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());

      let label = '';
      if (id) {
        const labelEl = await page.$(`label[for="${id}"]`);
        if (labelEl) label = await labelEl.textContent() || '';
      }

      if (!label) label = placeholder || name || id || 'Unknown field';

      fields.push({
        label: label.trim(),
        selectorHint: id ? `#${id}` : (name ? `[name="${name}"]` : tagName),
        fieldType: tagName === 'textarea' ? 'textarea' :
                   tagName === 'select' ? 'select' :
                   type === 'file' ? 'file' :
                   type === 'checkbox' ? 'checkbox' : 'text',
        value: '',
        required: await input.evaluate(el => (el as HTMLInputElement).required),
      });
    }
  } catch {
    // Return empty array on error
  }

  return fields;
}
