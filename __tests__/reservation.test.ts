import { getDurationHours, formatTimeRange, formatDate } from '../src/lib/utils';

// Core conflict overlap algorithm: A_start < B_end && A_end > B_start
function hasOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

describe('Resource Reservation Core Scheduling & Conflict Detection', () => {
  describe('hasOverlap() interval mathematics', () => {
    const slot10to12Start = new Date('2026-10-15T10:00:00Z');
    const slot10to12End = new Date('2026-10-15T12:00:00Z');

    it('detects conflict when requested time is completely within an existing slot (10:30 - 11:30)', () => {
      const reqStart = new Date('2026-10-15T10:30:00Z');
      const reqEnd = new Date('2026-10-15T11:30:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(true);
    });

    it('detects conflict when requested time overlaps the start of existing slot (09:30 - 10:30)', () => {
      const reqStart = new Date('2026-10-15T09:30:00Z');
      const reqEnd = new Date('2026-10-15T10:30:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(true);
    });

    it('detects conflict when requested time overlaps the end of existing slot (11:30 - 12:30)', () => {
      const reqStart = new Date('2026-10-15T11:30:00Z');
      const reqEnd = new Date('2026-10-15T12:30:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(true);
    });

    it('detects conflict when requested time completely envelopes existing slot (09:00 - 13:00)', () => {
      const reqStart = new Date('2026-10-15T09:00:00Z');
      const reqEnd = new Date('2026-10-15T13:00:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(true);
    });

    it('allows back-to-back reservations without conflict (08:00 - 10:00 adjacent before)', () => {
      const reqStart = new Date('2026-10-15T08:00:00Z');
      const reqEnd = new Date('2026-10-15T10:00:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(false);
    });

    it('allows back-to-back reservations without conflict (12:00 - 14:00 adjacent after)', () => {
      const reqStart = new Date('2026-10-15T12:00:00Z');
      const reqEnd = new Date('2026-10-15T14:00:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(false);
    });

    it('allows completely separate non-overlapping days', () => {
      const reqStart = new Date('2026-10-16T10:00:00Z');
      const reqEnd = new Date('2026-10-16T12:00:00Z');
      expect(hasOverlap(slot10to12Start, slot10to12End, reqStart, reqEnd)).toBe(false);
    });
  });

  describe('Duration and Format Helpers', () => {
    it('calculates duration in hours accurately', () => {
      const start = new Date('2026-10-15T10:00:00Z');
      const end = new Date('2026-10-15T12:30:00Z');
      expect(getDurationHours(start, end)).toBe('2.5h');
    });

    it('calculates sub-hour duration in minutes', () => {
      const start = new Date('2026-10-15T10:00:00Z');
      const end = new Date('2026-10-15T10:45:00Z');
      expect(getDurationHours(start, end)).toBe('45m');
    });
  });
});
