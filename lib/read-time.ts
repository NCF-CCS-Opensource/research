export function estimateReadTime(
  abstract: string | null | undefined
): number | null {
  if (!abstract) return null
  const words = abstract.trim().split(/\s+/).length
  if (words < 50) return null
  return Math.max(1, Math.ceil(words / 200))
}
