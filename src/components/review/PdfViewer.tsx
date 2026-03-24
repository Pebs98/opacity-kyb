"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use CDN worker to avoid Webpack/Turbopack bundling issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  documentId: string;
}

export function PdfViewer({ documentId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = `/api/files?documentId=${documentId}`;

  return (
    <div className="flex flex-col items-center gap-2 overflow-auto">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={(err) => setError(err.message)}
        loading={
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading PDF...
          </div>
        }
      >
        {error ? (
          <p className="text-sm text-red-500">Failed to load PDF: {error}</p>
        ) : (
          Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={550}
              className="mb-4 shadow-sm"
            />
          ))
        )}
      </Document>
    </div>
  );
}
