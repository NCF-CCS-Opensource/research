"use client";

import { getPaperContentContract } from "@repo/contracts";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import styles from "./reader.module.css";

const contentUrl = (publicId: string) =>
  `/v1/api${getPaperContentContract.path.replace(":publicId", encodeURIComponent(publicId))}`;

export function PaperReader({ publicId }: Readonly<{ publicId: string }>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    void import("pdfjs-dist")
      .then((pdfjs) => {
        if (!alive) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        task = pdfjs.getDocument({
          url: contentUrl(publicId),
          withCredentials: true,
          disableStream: true,
          disableAutoFetch: true,
          enableXfa: false,
        });
        void task.promise.then(
          (loaded) => {
            if (!alive) return;
            setDocument(loaded);
            setPageCount(loaded.numPages);
            setLoading(false);
          },
          (cause: unknown) => {
            if (!alive) return;
            setError(readError(cause));
            setLoading(false);
          },
        );
      })
      .catch((cause: unknown) => {
        if (alive) {
          setError(readError(cause));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      void task?.destroy();
    };
  }, [publicId]);

  useEffect(() => {
    if (!document || !canvas.current || !text.current) return;
    let alive = true;
    let render: import("pdfjs-dist").RenderTask | undefined;
    let textLayer: import("pdfjs-dist").TextLayer | undefined;
    setLoading(true);
    void document
      .getPage(pageNumber)
      .then(async (page) => {
        if (!alive || !canvas.current || !text.current) return;
        const viewport = page.getViewport({ scale: zoom });
        const element = canvas.current;
        const context = element.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        element.width = viewport.width;
        element.height = viewport.height;
        text.current.replaceChildren();
        text.current.style.width = `${viewport.width}px`;
        text.current.style.height = `${viewport.height}px`;
        render = page.render({
          canvas: element,
          canvasContext: context,
          viewport,
        });
        textLayer = new (await import("pdfjs-dist")).TextLayer({
          textContentSource: page.streamTextContent(),
          container: text.current,
          viewport,
        });
        await Promise.all([render.promise, textLayer.render()]);
        if (alive) setLoading(false);
      })
      .catch((cause: unknown) => {
        if (alive) {
          setError(readError(cause));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      render?.cancel();
      textLayer?.cancel();
    };
  }, [document, pageNumber, zoom]);

  function keyControl(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      setPageNumber((page) => Math.min(pageCount, page + 1));
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      setPageNumber((page) => Math.max(1, page - 1));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((scale) => Math.min(2.5, scale + 0.1));
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom((scale) => Math.max(0.5, scale - 0.1));
    }
  }

  return (
    <section
      aria-label="PDF reader"
      style={{ display: "grid", gap: "0.75rem" }}
    >
      <div
        aria-label="PDF controls"
        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
      >
        <button
          type="button"
          onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
          disabled={pageNumber <= 1}
        >
          Previous page
        </button>
        <span aria-live="polite">
          Page {pageNumber} of {pageCount || "…"}
        </span>
        <button
          type="button"
          onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}
          disabled={pageNumber >= pageCount}
        >
          Next page
        </button>
        <button
          type="button"
          onClick={() => setZoom((scale) => Math.max(0.5, scale - 0.1))}
          aria-label="Zoom out"
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((scale) => Math.min(2.5, scale + 0.1))}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      {loading && <p role="status">Loading PDF…</p>}
      {error && <p role="alert">{error}</p>}
      {!error && (
        <div
          className={styles.page}
          tabIndex={0}
          onKeyDown={keyControl}
          aria-label={`Page ${pageNumber}. Use arrow keys to change pages and plus or minus to zoom.`}
        >
          <canvas ref={canvas} aria-label={`PDF page ${pageNumber}`} />
        <div ref={text} className={styles.textLayer} />
        </div>
      )}
    </section>
  );
}

function readError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/401/.test(message))
    return "Your session expired. Sign in again, then reload this page.";
  if (/403|404/.test(message))
    return "This PDF is unavailable or you do not have access.";
  return "The PDF could not be loaded. Reload the page to try again.";
}
