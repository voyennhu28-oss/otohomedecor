import { escapeHtml, safeHtml } from './html.util';

describe('html.util', () => {
  it('escapeHtml: thay & < > " \'', () => {
    expect(escapeHtml(`<a href="x" title='y'>A & B</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;A &amp; B&lt;/a&gt;',
    );
  });

  it('escapeHtml: null / undefined thành chuỗi rỗng, số thành chuỗi', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(15)).toBe('15');
  });

  it('safeHtml: escape mọi giá trị chèn vào, giữ nguyên phần template', () => {
    const name = '<script>alert(1)</script>';
    expect(safeHtml`<p>Chào ${name}, còn ${15} phút</p>`).toBe(
      '<p>Chào &lt;script&gt;alert(1)&lt;/script&gt;, còn 15 phút</p>',
    );
  });

  it('safeHtml: template không có giá trị nào', () => {
    expect(safeHtml`<p>Xin chào</p>`).toBe('<p>Xin chào</p>');
  });
});
