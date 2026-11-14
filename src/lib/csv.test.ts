import { describe, it, expect } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('Home Depot, Inc')).toBe('"Home Depot, Inc"');
    expect(csvCell('5" trowel')).toBe('"5"" trowel"');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(12.5)).toBe('12.5');
  });
  it('builds header + rows', () => {
    expect(toCsv(['a', 'b'], [[1, 'x'], [2, null]])).toBe('a,b\r\n1,x\r\n2,\r\n');
  });
});
