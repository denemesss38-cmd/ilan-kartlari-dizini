export type FooterBox = {
  title: string;
  text: string;
};

const DEFAULT_TITLES = ["Ofis", "Yenişehir", "Kayapınar", "Bağlar"];

/** Yeni JSON biçimini ve eski boş satırla ayrılan metin biçimini birlikte destekler. */
export function parseFooterBoxes(value: string): FooterBox[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        const title = typeof record["title"] === "string" ? record["title"].trim() : "";
        const text = typeof record["text"] === "string" ? record["text"].trim() : "";
        return title || text ? [{ title, text }] : [];
      });
    }
  } catch {
    // Eski düz metin biçimi aşağıda dönüştürülür.
  }

  return trimmed
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({ title: DEFAULT_TITLES[index] ?? `Bölge ${index + 1}`, text }));
}

export function serializeFooterBoxes(boxes: FooterBox[]) {
  return JSON.stringify(
    boxes
      .map((box) => ({ title: box.title.trim(), text: box.text.trim() }))
      .filter((box) => box.title || box.text),
  );
}