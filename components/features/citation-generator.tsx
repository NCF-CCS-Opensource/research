"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

const FORMATS = {
  APA: (authors: string, year: string, title: string) =>
    `${authors}. (${year}). ${title}. NCF College of Computer Studies.`,
  MLA: (authors: string, _year: string, title: string) =>
    `${authors}. "${title}." NCF College of Computer Studies.`,
  Chicago: (authors: string, year: string, title: string) =>
    `${authors}. "${title}." NCF College of Computer Studies, ${year}.`,
  IEEE: (authors: string, year: string, title: string) =>
    `${authors}, "${title}," NCF College of Computer Studies, ${year}.`,
}

function buildBibtex(authors: string, year: string, title: string): string {
  const safeYear = year === "n.d." ? new Date().getFullYear().toString() : year
  const entryKey =
    `${authors.split(",")[0]?.replace(/\s+/g, "") ?? "Unknown"}${safeYear}`.replace(
      /[^a-zA-Z0-9_]/g,
      ""
    )

  return [
    `@techreport{${entryKey},`,
    `  author    = {${authors}},`,
    `  title     = {${title}},`,
    `  institution = {NCF College of Computer Studies},`,
    `  year      = {${safeYear}},`,
    `  type      = {Undergraduate Thesis},`,
    `}`,
  ].join("\n")
}

function downloadBibtex(authors: string, year: string, title: string) {
  const content = buildBibtex(authors, year, title)
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const safeTitle = title
    .slice(0, 40)
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
  a.href = url
  a.download = `${safeTitle}.bib`
  a.click()
  URL.revokeObjectURL(url)
}

export function CitationGenerator({
  authors,
  year,
  title,
}: {
  authors: string
  year: string
  title: string
}) {
  const [format, setFormat] = useState<keyof typeof FORMATS>("APA")
  const [copied, setCopied] = useState(false)

  const citation = FORMATS[format](authors, year, title)

  function copy() {
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="grid gap-4">
      {/* Format tabs */}
      <div className="flex flex-wrap gap-1">
        {(Object.keys(FORMATS) as Array<keyof typeof FORMATS>).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              format === f
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Citation text */}
      <pre className="rounded-xl border bg-muted/30 p-4 font-mono text-sm leading-6 whitespace-pre-wrap">
        {citation}
      </pre>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy citation"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadBibtex(authors, year, title)}
        >
          Download .bib
        </Button>
      </div>
    </div>
  )
}
