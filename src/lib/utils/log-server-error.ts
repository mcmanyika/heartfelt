export function logServerError(context: string, error: unknown) {
  let message = "Unknown error";
  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim()) {
      message = value;
    }
  } else if (typeof error === "string" && error.trim()) {
    message = error;
  }
  console.warn(`[${context}]`, message);
}
