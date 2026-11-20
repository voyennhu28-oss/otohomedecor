export function getPageItems(page: number, totalPages: number) {
  const pages = new Set([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | 'ellipsis')[] = [];
  sorted.forEach((p, index) => {
    const prev = sorted[index - 1];
    if (prev !== undefined && p - prev > 1) {
      items.push(p - prev === 2 ? prev + 1 : 'ellipsis');
    }
    items.push(p);
  });
  return items;
}
