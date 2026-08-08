"use client";

import { useState } from "react";

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  async function uploadFile() {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setMessage("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error}\n${data.details || ""}`);
        return;
      }

      setMessage(
        `Upload successful!\nFile: ${data.file.name}\nDrive ID: ${data.file.driveFileId}`
      );
    } catch (error) {
      console.error(error);
      setMessage("Upload request failed.");
    }
  }

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">
        Test Google Drive Upload
      </h1>

      <input
        type="file"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setMessage("");
        }}
        className="mb-4"
      />

      {file && (
        <p className="mb-4">
          Selected: <strong>{file.name}</strong>
        </p>
      )}

      <button
        onClick={uploadFile}
        className="rounded bg-black px-5 py-3 text-white"
      >
        Upload
      </button>

      {message && (
        <pre className="mt-6 whitespace-pre-wrap rounded border p-4">
          {message}
        </pre>
      )}
    </main>
  );
}