export function logServerError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.warn(`[${context}]`, message);
}
