import { httpUrlSchema } from './url.schema';

describe('httpUrlSchema', () => {
  it.each(['https://cdn.example.com/a.jpg', 'http://localhost:3000/x', 'HTTPS://EXAMPLE.COM'])(
    'nhận %s',
    (url) => {
      expect(httpUrlSchema.safeParse(url).success).toBe(true);
    },
  );

  it.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'ftp://example.com/a.jpg',
    'không phải url',
  ])('từ chối %s', (url) => {
    expect(httpUrlSchema.safeParse(url).success).toBe(false);
  });
});
