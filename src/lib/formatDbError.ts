// Friendly error formatter for Supabase / Postgres errors.
// Maps known Postgres SQLSTATE codes and PostgREST codes to readable strings.

type AnyError =
  | (Error & { code?: string; details?: string; hint?: string; message?: string })
  | { code?: string; message?: string; details?: string; hint?: string }
  | string
  | null
  | undefined;

const POSTGRES_CODES: Record<string, string> = {
  '23505': 'That record already exists.',
  '23503': 'That action references a related record that no longer exists.',
  '23502': 'A required field is missing.',
  '23514': 'The value provided is not allowed by validation rules.',
  '42501': "You don't have permission to perform that action.",
  '42P01': 'The requested data table is unavailable.',
  '22P02': 'A field has an invalid format.',
  '22001': 'A field exceeds its maximum length.',
  '40001': 'Conflicting changes were detected. Please retry.',
  PGRST301: 'Your session has expired. Please sign in again.',
  PGRST116: 'No matching record was found.',
  PGRST204: 'No matching record was found.',
};

export const formatDbError = (err: AnyError): string => {
  if (!err) return 'Something went wrong.';
  if (typeof err === 'string') return err;

  const code = (err as any).code as string | undefined;
  const message = (err as any).message as string | undefined;
  const details = (err as any).details as string | undefined;

  if (code && POSTGRES_CODES[code]) return POSTGRES_CODES[code];

  if (message) {
    if (/row-level security/i.test(message)) {
      return "You don't have permission to perform that action.";
    }
    if (/JWT|expired|invalid token/i.test(message)) {
      return 'Your session has expired. Please sign in again.';
    }
    if (/network|fetch/i.test(message)) {
      return 'Network error. Check your connection and try again.';
    }
    return message;
  }
  return details || 'Something went wrong.';
};
