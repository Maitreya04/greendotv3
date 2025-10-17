export async function translateText(
  text: string,
  target: string = "EN",
  source?: string
): Promise<{ text: string; detectedLang?: string }> {
  if (!text || (source && source.toLowerCase() === target.toLowerCase())) {
    return { text, detectedLang: source };
  }
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target, source }),
  });
  if (!res.ok) {
    throw new Error("Translation failed");
  }
  return res.json();
}


