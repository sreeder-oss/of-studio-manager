import { describe, it, expect } from 'vitest';
import { parseLocalDate, todayLocal, daysFromTodayLocal } from './utils';

describe('date-only helpers', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseLocalDate('2026-03-15');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 15, 0]);
  });
  it('January 1 stays January 1 (not Dec 31)', () => {
    const d = parseLocalDate('2026-01-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 1]);
  });
  it('todayLocal uses local calendar date, late evening', () => {
    expect(todayLocal(new Date(2026, 10, 14, 23, 30))).toBe('2026-11-14');
    expect(todayLocal(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
  it('daysFromTodayLocal crosses month and year boundaries', () => {
    expect(daysFromTodayLocal(30, new Date(2026, 11, 15, 20))).toBe('2027-01-14');
    expect(daysFromTodayLocal(1, new Date(2026, 11, 31, 22))).toBe('2027-01-01');
    expect(daysFromTodayLocal(0, new Date(2026, 0, 1, 23))).toBe('2026-01-01');
  });
});
