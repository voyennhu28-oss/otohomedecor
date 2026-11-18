export const pickAvailableSlug = (
  base: string,
  taken: Iterable<string>,
  reserved: readonly string[] = [],
): string => {
  const unavailable = new Set([...taken, ...reserved]);
  if (!unavailable.has(base)) return base;
  let i = 2;
  while (unavailable.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
};
