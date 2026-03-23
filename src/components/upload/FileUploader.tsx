"use client";

import { useCallback, useState } from "react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "done" | "error";
}

interface FileUploaderProps {
  applicationId: string;
  onUploadComplete?: (documentId: string) => void;
}

export function FileUploader({
  applicationId,
  onUploadComplete,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      const tempId = crypto.randomUUID();
      setFiles((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "uploading",
        },
      ]);

      try {
        // Get presigned URL
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!res.ok) throw new Error("Failed to get upload URL");

        const { documentId, uploadUrl } = await res.json();

        // Upload to S3
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, id: documentId, status: "done" } : f
          )
        );

        onUploadComplete?.(documentId);
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" } : f
          )
        );
      }
    },
    [applicationId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      selected.forEach(uploadFile);
    },
    [uploadFile]
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        }`}
      >
        <svg
          className="mb-3 h-10 w-10 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mb-1 text-sm font-medium text-zinc-700">
          Drag and drop files here
        </p>
        <p className="mb-3 text-xs text-zinc-500">
          PDF, DOCX, PNG, JPG up to 50MB
        </p>
        <label className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Browse Files
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 text-xs font-medium text-zinc-600">
                  {file.name.split(".").pop()?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
              <div>
                {file.status === "uploading" && (
                  <span className="text-xs text-blue-600">Uploading...</span>
                )}
                {file.status === "done" && (
                  <span className="text-xs text-green-600">Uploaded</span>
                )}
                {file.status === "error" && (
                  <span className="text-xs text-red-600">Failed</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
