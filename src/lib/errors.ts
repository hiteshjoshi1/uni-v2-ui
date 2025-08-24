export function humanError(e: unknown): string {
  const err = e as any;
  if (!err) return "Unknown error";
  if (err.shortMessage) return err.shortMessage;
  if (err?.cause?.shortMessage) return err.cause.shortMessage;
  if (err?.cause?.message) return err.cause.message;
  if (err.message) return err.message;
  return String(err);
}
