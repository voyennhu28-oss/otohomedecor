export interface RatingStats {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export const roundRating = (value: number | null | undefined) =>
  Math.round((value ?? 0) * 10) / 10;

export const buildRatingStats = (
  groups: { rating: number; count: number }[],
): RatingStats => {
  const distribution: RatingStats['distribution'] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let count = 0;
  let sum = 0;
  for (const { rating, count: n } of groups) {
    if (rating < 1 || rating > 5) continue;
    distribution[rating as keyof RatingStats['distribution']] += n;
    count += n;
    sum += rating * n;
  }
  return { average: count ? roundRating(sum / count) : 0, count, distribution };
};
