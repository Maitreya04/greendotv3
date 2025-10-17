import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { q, target = "EN", source } = await req.json();
    const key = process.env.DEEPL_API_KEY;
    if (!key) return NextResponse.json({ error: "DEEPL_API_KEY missing" }, { status: 500 });

    const params = new URLSearchParams();
    params.set("text", String(q ?? ""));
    params.set("target_lang", String(target).toUpperCase());
    if (source) params.set("source_lang", String(source).toUpperCase());

    const resp = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const json = await resp.json();
    if (!resp.ok) return NextResponse.json(json, { status: resp.status });

    const tr = (json as any).translations?.[0];
    return NextResponse.json({
      text: tr?.text ?? q,
      detectedLang: tr?.detected_source_language,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "translate failed" }, { status: 500 });
  }
}


