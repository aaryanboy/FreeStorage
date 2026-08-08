export function formatBytes(bytes: bigint | number | string | null) {
  const value = Number(bytes ?? 0);
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(value) / Math.log(1024));
  return `${(value / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

export function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📁";
}

export function getFileCategory(mimeType: string) {
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("video/")) return "videos";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("sheet") ||
    mimeType.includes("text")
  )
    return "documents";
  return "other";
}

export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}
