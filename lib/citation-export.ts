export async function trackSuccessfulCitationExport(
  performExport: () => void | Promise<void>,
  recordExport: () => Promise<unknown>
) {
  await performExport()
  return recordExport().then(
    () => true,
    () => false
  )
}
