import { withSoftDeleteFilter } from './soft-delete.helper';

describe('soft-delete helper', () => {
  it('adds deletedAt null when missing', () => {
    const result = withSoftDeleteFilter({ tenantId: 't1' });
    expect(result).toEqual({ tenantId: 't1', deletedAt: null });
  });

  it('keeps deletedAt filter when provided', () => {
    const result = withSoftDeleteFilter({ deletedAt: { not: null } });
    expect(result).toEqual({ deletedAt: { not: null } });
  });

  it('handles empty where', () => {
    const result = withSoftDeleteFilter();
    expect(result).toEqual({ deletedAt: null });
  });
});
