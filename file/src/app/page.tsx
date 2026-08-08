"use client";

import { useEffect, useState } from "react";

type FileItem = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: string;
  driveFileId: string;
};

type StorageInfo = {
  used: number;
  total: number;
  percentage: number;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [storage, setStorage] = useState<StorageInfo>({
    used: 0,
    total: 0,
    percentage: 0,
  });

  async function loadFiles() {
    try {
      const response = await fetch("/api/files");
      const data = await response.json();

      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  }

  async function loadStorage() {
    try {
      const response = await fetch("/api/storage");
      const data = await response.json();

      if (data.success) {
        setStorage(data.storage);
      }
    } catch (error) {
      console.error("Failed to load storage:", error);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFiles();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStorage();
  }, []);

  async function uploadFile() {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.details || data.error || "Upload failed."
        );
        return;
      }

      setMessage("File uploaded successfully!");

      setFile(null);

      // Clear file input
      const input = document.getElementById(
        "file-input"
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      // Refresh files and storage
      await loadFiles();
      await loadStorage();
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: string) {
    const size = Number(bytes);

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function formatStorage(bytes: number) {
    if (bytes === 0) {
      return "0 B";
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">
            ☁️ FreeStorage
          </h1>

          <div className="text-sm text-gray-500">
            Google Drive Storage
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Storage */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">
            Your Storage
          </h2>

          <p className="text-sm text-gray-500">
            Files are stored securely in your connected Google Drive.
          </p>

          {/* Storage progress */}
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-black transition-all duration-500"
              style={{
                width: `${Math.min(storage.percentage, 100)}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-sm text-gray-500">
            <span>
              {formatStorage(storage.used)} used
            </span>

            <span>
              {formatStorage(storage.total)} total
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {files.length} file
            {files.length !== 1 ? "s" : ""}
          </p>
        </section>

        {/* Upload */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Upload a file
          </h2>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              id="file-input"
              type="file"
              onChange={(event) => {
                setFile(
                  event.target.files?.[0] ?? null
                );
                setMessage("");
              }}
              className="block w-full rounded-lg border p-2"
            />

            <button
              onClick={uploadFile}
              disabled={uploading || !file}
              className="rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          {file && (
            <p className="mt-3 text-sm text-gray-500">
              Selected: {file.name}
            </p>
          )}

          {message && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-sm">
              {message}
            </p>
          )}
        </section>

        {/* Files */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              My Files
            </h2>

            <button
              onClick={() => {
                loadFiles();
                loadStorage();
              }}
              className="rounded-lg border px-4 py-2 text-sm transition hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {files.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <div className="mb-3 text-4xl">
                📁
              </div>

              <p className="font-medium">
                No files yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Upload your first file above.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.originalName}
                    </p>

                    <p className="text-sm text-gray-500">
                      {item.mimeType} ·{" "}
                      {formatSize(item.size)}
                    </p>
                  </div>

                  <div className="shrink-0 text-sm text-green-600">
                    ✓ Stored
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}