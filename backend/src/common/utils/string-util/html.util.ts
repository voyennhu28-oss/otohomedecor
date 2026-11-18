const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export class RawHtml {
  constructor(readonly html: string) {}
}

export const raw = (html: string) => new RawHtml(html);

export const escapeHtml = (value: unknown): string => {
  if (value instanceof RawHtml) return value.html;
  if (Array.isArray(value)) return value.map(escapeHtml).join('');
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
};

export const safeHtml = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): string =>
  strings.reduce((html, part, i) => html + escapeHtml(values[i - 1]) + part);
