"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  addToCollection as saveToCollection,
  callR2,
  getPdfAccessState,
  recordEngagement,
  transitionPdfRequest,
} from "@/lib/api"
import { trackSuccessfulCitationExport } from "@/lib/citation-export"
import type { PdfAccessState } from "@/types/api"

export function ResearchActions({
  researchId,
  citation,
}: {
  researchId: string
  citation: string
}) {
  const trackedView = useRef(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accessState, setAccessState] = useState<
    PdfAccessState["state"] | null
  >(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [availableAt, setAvailableAt] = useState<string | null>(null)
  const [cooldownReason, setCooldownReason] = useState<
    PdfAccessState["reason"] | null
  >(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (trackedView.current) return
    trackedView.current = true
    void recordEngagement(researchId, "view").catch(() => {})
  }, [researchId])

  function loadAccessState() {
    getPdfAccessState(researchId)
      .then(({ state, requestId, availableAt, reason }) => {
        setAccessState(state)
        setRequestId(requestId ?? null)
        setAvailableAt(availableAt ?? null)
        setCooldownReason(reason ?? null)
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Unable to load PDF access"
        )
      )
  }

  useEffect(loadAccessState, [researchId])

  function cancel() {
    if (!requestId) return
    setError(null)
    startTransition(async () => {
      try {
        await transitionPdfRequest(requestId, "cancel")
        loadAccessState()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to cancel request"
        )
      }
    })
  }

  function download() {
    if (!requestId) return
    setError(null)
    startTransition(async () => {
      try {
        const { url } = await callR2<{ url: string }>({
          action: "granted-download",
          requestId,
        })
        window.open(url, "_blank", "noopener,noreferrer")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to download PDF")
      }
    })
  }

  function addToCollection() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await saveToCollection(researchId)
        setMessage("Saved to Collection")
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to add to collection"
        )
      }
    })
  }

  function cite() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const tracked = await trackSuccessfulCitationExport(
          () => navigator.clipboard.writeText(citation),
          () => recordEngagement(researchId, "citation_export")
        )
        setMessage("Citation copied")
        if (!tracked)
          setError("Citation copied, but its activity could not be recorded")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to cite research")
      }
    })
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        {accessState === "guest" && (
          <Button asChild>
            <Link href={`/login?next=/research/${researchId}`}>
              Sign in to request PDF
            </Link>
          </Button>
        )}
        {accessState === "requestable" && (
          <Button asChild>
            <Link href={`/research/${researchId}/request-pdf`}>
              Request PDF
            </Link>
          </Button>
        )}
        {accessState === "pending" && (
          <>
            <Button disabled>Request pending</Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={cancel}
            >
              Cancel request
            </Button>
          </>
        )}
        {accessState === "granted" && (
          <Button type="button" disabled={isPending} onClick={download}>
            Download PDF
          </Button>
        )}
        {accessState === "cooldown" && (
          <Button disabled>
            {cooldownReason === "rejected"
              ? "Request was rejected — "
              : cooldownReason === "revoked"
                ? "Access was revoked — "
                : "Request canceled — "}
            {availableAt
              ? `you can request again after ${new Date(availableAt).toLocaleString()}`
              : "you can request again later"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={cite}
        >
          Cite
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={addToCollection}
        >
          Add to Collection
        </Button>
      </div>
      {message ? (
        <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </>
  )
}
