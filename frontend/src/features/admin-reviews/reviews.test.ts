import { describe, expect, it } from 'vitest';

import {
  REVIEW_FILTER_DEFAULTS,
  toReviewQuery,
} from '@/features/admin-reviews/filters';

describe('toReviewQuery', () => {
  it('mặc định không lọc', () => {
    expect(toReviewQuery(REVIEW_FILTER_DEFAULTS)).toEqual({
      page: 1,
      itemPerPage: 20,
    });
  });

  it('đọc trạng thái, số sao 1–5, sản phẩm là ObjectId', () => {
    expect(
      toReviewQuery({
        ...REVIEW_FILTER_DEFAULTS,
        status: 'hidden',
        rating: '2',
        product: '6738b2a0c2b4e9a1d0f00101',
      }),
    ).toEqual({
      status: 'hidden',
      rating: 2,
      productID: '6738b2a0c2b4e9a1d0f00101',
      page: 1,
      itemPerPage: 20,
    });
    expect(
      toReviewQuery({ ...REVIEW_FILTER_DEFAULTS, rating: '6', product: 'abc' }),
    ).toEqual({ page: 1, itemPerPage: 20 });
  });
});
