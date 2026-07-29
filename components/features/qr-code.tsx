"use client"

import { useSyncExternalStore } from "react"
import { QRCodeSVG } from "qrcode.react"

export function QrCode({ researchId }: { researchId: string }) {
  const url = useSyncExternalStore(
    () => () => {},
    () => `${window.location.origin}/research/${researchId}`,
    () => ""
  )

  if (!url) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeSVG value={url} size={128} className="rounded-lg" />
      <p className="text-center text-xs text-muted-foreground">Scan to share</p>
    </div>
  )
}
