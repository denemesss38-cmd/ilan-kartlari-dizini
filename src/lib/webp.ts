/** Görseli tarayıcıda WebP'ye çevirip sıkıştırır (maks. 1600px). Başarısızsa orijinal döner. */
export async function toWebp(file: File, max = 1600, quality = 0.82): Promise<{ blob: Blob; ext: string; type: string }> {
  const fallback = { blob: file as Blob, ext: file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg", type: file.type || "image/jpeg" };
  if (!file.type.startsWith("image/") || file.type === "image/gif") return fallback;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") return fallback;
    return { blob, ext: "webp", type: "image/webp" };
  } catch {
    return fallback;
  }
}
