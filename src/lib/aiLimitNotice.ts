// Exact matching of the generic error toast that belongs to an already-explained
// limit response (trial ended, allowance used up, daily cap). Each controlled
// response gets a unique one-shot token as its error message; only a toast that
// carries that exact token is skipped, once. Any other error is always shown.
const pending = new Set<string>();
let seq = 0;

export function registerLimitToken(code: string): string {
  const token = `AI_LIMIT:${code}:${Date.now()}:${++seq}`;
  pending.add(token);
  return token;
}

/** True (and consumes the token) only for the duplicate of a handled limit response. */
export function consumeLimitToast(props: { title?: unknown; description?: unknown }): boolean {
  for (const v of [props.description, props.title]) {
    if (typeof v === "string" && pending.has(v)) {
      pending.delete(v);
      return true;
    }
  }
  return false;
}
