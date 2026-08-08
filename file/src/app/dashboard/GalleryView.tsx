"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FileItem = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: string;
  folder: string | null;
  createdAt: string;
  googleAccount?: {
    email: string;
  };
};

export type FolderItem = {
  id: string;
  name: string;
};

function formatBytes(bytes: string | number) {
  const value = Number(bytes);
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(value) / Math.log(1024));
  return `${(value / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📁";
}

export default function GalleryView({
  initialFiles,
  initialFolders,
  currentFolder,
}: {
  initialFiles: FileItem[];
  initialFolders: FolderItem[];
  currentFolder?: string;
}) {
  const router = useRouter();

  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingFileIds, setMovingFileIds] = useState<string[]>([]);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [folderError, setFolderError] = useState("");

  const activeFolder = currentFolder || null;

  // Files in current view: root (folder === null) or inside a specific folder
  const currentFiles = files.filter((f) => (f.folder || null) === activeFolder);

  // File counts per folder for display
  const folderFileCounts: Record<string, number> = {};
  for (const f of folders) {
    folderFileCounts[f.name] = files.filter((file) => file.folder === f.name).length;
  }

  // Selection
  function toggleSelect(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === currentFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentFiles.map((f) => f.id)));
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────
  async function handleDeleteFile(fileId: string) {
    if (!confirm("Delete this file permanently from Google Drive?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(fileId); return n; });
      if (lightboxIndex !== null) setLightboxIndex(null);
      router.refresh();
    } catch { alert("Error deleting file"); }
    finally { setIsDeleting(false); }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} file(s) permanently?`)) return;
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => fetch(`/api/files/${id}`, { method: "DELETE" })));
      setFiles((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
      router.refresh();
    } catch { alert("Failed to delete some files"); }
    finally { setIsDeleting(false); }
  }

  // ── Move ────────────────────────────────────────────────────────────
  async function handleMoveFiles(targetFolder: string | null) {
    if (movingFileIds.length === 0) return;
    try {
      await Promise.all(
        movingFileIds.map((id) =>
          fetch(`/api/files/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder: targetFolder }),
          })
        )
      );
      setFiles((prev) =>
        prev.map((f) => movingFileIds.includes(f.id) ? { ...f, folder: targetFolder } : f)
      );
      setSelectedIds(new Set());
      setIsMoveModalOpen(false);
      setMovingFileIds([]);
      router.refresh();
    } catch { alert("Failed to move file(s)"); }
  }

  // ── Create Folder ───────────────────────────────────────────────────
  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderNameInput.trim();
    if (!name) return;
    setFolderError("");

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFolderError(data.error || "Failed to create folder");
        return;
      }

      setFolders((prev) => [...prev, data.folder]);

      // If we were moving files into a new folder, do the move now
      if (movingFileIds.length > 0) {
        await handleMoveFiles(name);
      }

      setNewFolderNameInput("");
      setIsNewFolderModalOpen(false);
      router.refresh();
    } catch {
      setFolderError("Failed to create folder");
    }
  }

  // Media files for Lightbox
  const mediaFiles = currentFiles.filter(
    (f) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/")
  );
  const currentLightboxFile = lightboxIndex !== null ? mediaFiles[lightboxIndex] : null;

  return (
    <div className="space-y-6">

      {/* ── Breadcrumb & View Controls ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <a href="/dashboard" className="hover:text-black flex items-center gap-1.5 shrink-0">
            <span>📁</span> All Files
          </a>
          {activeFolder && (
            <>
              <span className="text-gray-400">/</span>
              <span className="rounded-md bg-gray-100 px-2.5 py-1 text-gray-900 font-semibold">
                {activeFolder}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setMovingFileIds([]); setFolderError(""); setIsNewFolderModalOpen(true); }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ➕ New Folder
          </button>

          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "grid" ? "bg-black text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              🖼️ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "list" ? "bg-black text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              📄 List
            </button>
          </div>
        </div>
      </div>

      {/* ── Folder Cards (only shown at root level) ──────────────────── */}
      {!activeFolder && folders.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <a
                key={folder.id}
                href={`/dashboard?folder=${encodeURIComponent(folder.name)}`}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 hover:border-black hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                  <span className="truncate text-sm font-semibold text-gray-800">{folder.name}</span>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {folderFileCounts[folder.name] || 0}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Batch Action Bar ─────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-20 z-20 flex items-center justify-between rounded-xl bg-black px-5 py-3.5 text-white shadow-xl">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold">{selectedIds.size} selected</span>
            <button onClick={selectAll} className="text-xs text-gray-300 underline hover:text-white">
              Deselect all
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMovingFileIds(Array.from(selectedIds)); setIsMoveModalOpen(true); }}
              className="rounded-lg bg-gray-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              ✂️ Move to Folder
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              🗑️ Delete ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* ── Gallery Content ──────────────────────────────────────────── */}
      {currentFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <div className="text-5xl">{activeFolder ? "📂" : "🖼️"}</div>
          <h3 className="mt-4 text-base font-semibold text-gray-800">
            {activeFolder ? `"${activeFolder}" is empty` : "No files yet"}
          </h3>
          <p className="mt-1.5 text-sm text-gray-400">
            {activeFolder ? "Move files into this folder from the main gallery." : "Upload files to populate your gallery."}
          </p>
          <a href="/test-upload" className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
            Upload File
          </a>
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID VIEW ───────────────────────────────────────────────── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {currentFiles.map((file) => {
            const isSelected = selectedIds.has(file.id);
            const isImage = file.mimeType.startsWith("image/");
            const isVideo = file.mimeType.startsWith("video/");
            const mediaIndex = mediaFiles.findIndex((m) => m.id === file.id);

            return (
              <div
                key={file.id}
                onClick={() => { if (mediaIndex !== -1) setLightboxIndex(mediaIndex); }}
                className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-xs transition-all hover:shadow-md cursor-pointer ${
                  isSelected ? "border-black ring-2 ring-black" : "border-gray-200"
                }`}
              >
                {/* Checkbox */}
                <div
                  onClick={(e) => toggleSelect(file.id, e)}
                  className={`absolute top-2.5 left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-black border-black text-white opacity-100"
                      : "border-gray-300 bg-white/80 text-transparent group-hover:opacity-100 opacity-0 hover:border-black"
                  }`}
                >
                  ✓
                </div>

                {/* Preview */}
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                  {isImage ? (
                    <img
                      src={`/api/files/${file.id}/preview`}
                      alt={file.originalName}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : isVideo ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900 text-white">
                      <span className="text-4xl">🎬</span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-300">Video</span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50">
                      <span className="text-4xl">{getFileIcon(file.mimeType)}</span>
                      <span className="mt-2 text-xs font-semibold uppercase text-gray-400">
                        {file.mimeType.split("/")[1] ?? "File"}
                      </span>
                    </div>
                  )}

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMovingFileIds([file.id]); setIsMoveModalOpen(true); }}
                      className="rounded-lg bg-white/90 p-2 text-xs font-semibold text-gray-900 hover:bg-white transition-colors"
                    >
                      ✂️ Move
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                      className="rounded-lg bg-red-600/90 p-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-3 bg-white border-t border-gray-100">
                  <p className="truncate text-xs font-semibold text-gray-900" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{formatBytes(file.size)}</span>
                    {file.folder && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 font-medium">
                        📁 {file.folder}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ───────────────────────────────────────────────── */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-4 border-b border-gray-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            <input type="checkbox" checked={selectedIds.size === currentFiles.length && currentFiles.length > 0} onChange={selectAll} className="rounded border-gray-300" />
            <span>Name</span>
            <span>Folder</span>
            <span>Size</span>
            <span>Uploaded</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {currentFiles.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div key={file.id} className={`grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors ${isSelected ? "bg-gray-50" : ""}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(file.id)} className="rounded border-gray-300" />
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {file.mimeType.startsWith("image/") ? (
                        <img src={`/api/files/${file.id}/preview`} alt={file.originalName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">{getFileIcon(file.mimeType)}</div>
                      )}
                    </div>
                    <span className="truncate text-sm font-medium text-gray-900">{file.originalName}</span>
                  </div>
                  <span className="text-xs text-gray-500">{file.folder ? `📁 ${file.folder}` : "—"}</span>
                  <span className="text-xs text-gray-600">{formatBytes(file.size)}</span>
                  <span className="text-xs text-gray-400">{formatDate(file.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setMovingFileIds([file.id]); setIsMoveModalOpen(true); }} className="rounded p-1.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-900">✂️</button>
                    <button onClick={() => handleDeleteFile(file.id)} className="rounded p-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ─────────────────────────────────────────────────── */}
      {currentLightboxFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setLightboxIndex(null)}>
          <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20">✕</button>

          {mediaFiles.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => p !== null ? (p - 1 + mediaFiles.length) % mediaFiles.length : 0); }}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">‹</button>
          )}

          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] max-w-[90vw] flex-col items-center justify-center">
            {currentLightboxFile.mimeType.startsWith("image/") ? (
              <img src={`/api/files/${currentLightboxFile.id}/preview`} alt={currentLightboxFile.originalName} className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl" />
            ) : (
              <video controls autoPlay src={`/api/files/${currentLightboxFile.id}/preview`} className="max-h-[75vh] max-w-full rounded-lg shadow-2xl" />
            )}

            <div className="mt-4 flex items-center justify-between w-full max-w-2xl bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl text-white">
              <div>
                <p className="font-semibold text-sm truncate max-w-md">{currentLightboxFile.originalName}</p>
                <p className="text-xs text-gray-400">{formatBytes(currentLightboxFile.size)} · {currentLightboxFile.mimeType}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setMovingFileIds([currentLightboxFile.id]); setIsMoveModalOpen(true); }}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30">✂️ Move</button>
                <button onClick={() => handleDeleteFile(currentLightboxFile.id)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-700">🗑️ Delete</button>
              </div>
            </div>
          </div>

          {mediaFiles.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((p) => p !== null ? (p + 1) % mediaFiles.length : 0); }}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">›</button>
          )}
        </div>
      )}

      {/* ── MOVE TO FOLDER MODAL ─────────────────────────────────────── */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsMoveModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Move to Folder</h3>
            <p className="mt-1 text-xs text-gray-500">Select destination for {movingFileIds.length} item(s)</p>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              <button onClick={() => handleMoveFiles(null)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-800">📁 Root (No Folder)</span>
                <span className="text-xs text-gray-400">Main directory</span>
              </button>

              {folders.map((folder) => (
                <button key={folder.id} onClick={() => handleMoveFiles(folder.name)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left hover:bg-black hover:text-white transition-all group">
                  <span className="text-sm font-semibold">📁 {folder.name}</span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-300">Move here</span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-gray-100">
              <button onClick={() => { setIsMoveModalOpen(false); setFolderError(""); setIsNewFolderModalOpen(true); }}
                className="text-xs font-semibold text-black underline">+ Create New Folder</button>
              <button onClick={() => setIsMoveModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE FOLDER MODAL ──────────────────────────────────────── */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsNewFolderModalOpen(false)}>
          <form onSubmit={handleCreateFolder} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Create New Folder</h3>
            <p className="mt-1 text-xs text-gray-500">Enter a name for your new folder</p>

            <input
              type="text" required autoFocus
              placeholder="e.g. Vacation 2026"
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none"
            />

            {folderError && <p className="mt-2 text-xs text-red-500">{folderError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsNewFolderModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800">
                {movingFileIds.length > 0 ? "Create & Move" : "Create Folder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
