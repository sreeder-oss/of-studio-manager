import { describe, it, expect } from 'vitest';
import { formatDbError } from '@/lib/formatDbError';

describe('formatDbError', () => {
  it('returns generic for null', () => {
    expect(formatDbError(null)).toMatch(/something went wrong/i);
  });

  it('passes through plain strings', () => {
    expect(formatDbError('Custom message')).toBe('Custom message');
  });

  it('maps known Postgres codes', () => {
    expect(formatDbError({ code: '23505', message: 'duplicate key' })).toMatch(/already exists/i);
    expect(formatDbError({ code: '42501', message: 'denied' })).toMatch(/permission/i);
    expect(formatDbError({ code: '23502', message: 'null' })).toMatch(/required/i);
  });

  it('detects RLS messages', () => {
    expect(formatDbError({ message: 'new row violates row-level security policy' }))
      .toMatch(/permission/i);
  });

  it('detects expired session messages', () => {
    expect(formatDbError({ message: 'JWT expired' })).toMatch(/session/i);
  });

  it('falls back to message when no code matches', () => {
    expect(formatDbError({ message: 'Some unknown failure' })).toBe('Some unknown failure');
  });
});
