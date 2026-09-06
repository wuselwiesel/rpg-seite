// Escaped for safe use inside a PostgREST `.or(...)` filter string, where
// commas and parentheses are syntax delimiters.
export function escapePostgrestValue(value: string): string {
  return value.replace(/[(),]/g, (c) => `\\${c}`);
}
