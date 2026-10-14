export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatTimeRange(startInput: Date | string, endInput: Date | string): string {
  const start = typeof startInput === 'string' ? new Date(startInput) : startInput;
  const end = typeof endInput === 'string' ? new Date(endInput) : endInput;

  const isSameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (isSameDay) {
    return `${formatDate(start)} • ${formatTime(start)} – ${formatTime(end)}`;
  }

  return `${formatDateTime(start)} – ${formatDateTime(end)}`;
}

export function getDurationHours(startInput: Date | string, endInput: Date | string): string {
  const start = typeof startInput === 'string' ? new Date(startInput) : startInput;
  const end = typeof endInput === 'string' ? new Date(endInput) : endInput;
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.round(diffMs / (1000 * 60));
    return `${mins}m`;
  }
  return `${diffHours % 1 === 0 ? diffHours : diffHours.toFixed(1)}h`;
}

/**
 * Safely extracts a clean, human-readable error message from any error,
 * including ZodError instances or JSON-stringified error arrays/objects.
 */
export function formatErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';

  // If it's a Next.js redirect signal, rethrow immediately
  if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
    throw error;
  }

  // If error is already a string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first && typeof first === 'object' && typeof first.message === 'string') {
            return first.message;
          }
        } else if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
          return parsed.message;
        }
      } catch (_) {
        // Not valid JSON, keep as is
      }
    }
    return error;
  }

  // If it has Zod-style issues array
  if (error.issues && Array.isArray(error.issues) && error.issues.length > 0) {
    const first = error.issues[0];
    if (first && typeof first === 'object' && typeof first.message === 'string') {
      return first.message;
    }
  }

  // If it's a standard Error with message
  if (error.message && typeof error.message === 'string') {
    const trimmed = error.message.trim();
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first && typeof first === 'object' && typeof first.message === 'string') {
            return first.message;
          }
        } else if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
          return parsed.message;
        }
      } catch (_) {
        // Not valid JSON
      }
    }
    return error.message;
  }

  return 'An unexpected error occurred.';
}
