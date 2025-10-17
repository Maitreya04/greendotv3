export type ProductResult = {
  barcode: string;
  name: string | null;
  brands: string | null;
  ingredientsText: string | null;
  allergens: string[];
  energyKcalPer100g: number | null;
  sugarsPer100g: number | null;
  proteinsPer100g: number | null;
  servingSize: string | null;
  imageUrl: string | null;
};

type OffProduct = {
  product_name?: string;
  brands?: string;
  ingredients_text_en?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  nutriments?: Record<string, unknown> & {
    [key: string]: unknown;
  };
  serving_size?: string;
  image_url?: string;
};

type OffResponse = {
  status?: number; // 1 if found, otherwise 0
  code?: string;
  product?: OffProduct;
};

// Primary: OFF API v2 (no .json suffix). Fallback to legacy v0 with .json on retry.
const OFF_ENDPOINT_V2 = "https://world.openfoodfacts.org/api/v2/product";
const OFF_ENDPOINT_V0 = "https://world.openfoodfacts.org/api/v0/product";
const USER_AGENT = "Greendot/1.0 (https://greendot.app)";
const REQUEST_TIMEOUT_MS = 10_000; // 10s
const MAX_ATTEMPTS = 2; // total attempts
const RETRY_DELAY_MS = 1_000; // 1s

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toProductResult(barcode: string, product: OffProduct): ProductResult {
  const allergens = Array.isArray(product.allergens_tags)
    ? (product.allergens_tags as string[])
    : [];

  let energyKcalPer100g: number | null = null;
  const energyRaw = product.nutriments?.["energy-kcal_100g"] as
    | number
    | string
    | undefined;
  if (typeof energyRaw === "number") {
    energyKcalPer100g = Number.isFinite(energyRaw) ? energyRaw : null;
  } else if (typeof energyRaw === "string") {
    const parsed = Number(energyRaw);
    energyKcalPer100g = Number.isFinite(parsed) ? parsed : null;
  }

  // Parse sugars (g/100g)
  let sugarsPer100g: number | null = null;
  const sugarsRaw = product.nutriments?.["sugars_100g"] as number | string | undefined;
  if (typeof sugarsRaw === "number") {
    sugarsPer100g = Number.isFinite(sugarsRaw) ? sugarsRaw : null;
  } else if (typeof sugarsRaw === "string") {
    const parsed = Number(sugarsRaw);
    sugarsPer100g = Number.isFinite(parsed) ? parsed : null;
  }

  // Parse proteins (g/100g)
  let proteinsPer100g: number | null = null;
  const proteinsRaw = product.nutriments?.["proteins_100g"] as number | string | undefined;
  if (typeof proteinsRaw === "number") {
    proteinsPer100g = Number.isFinite(proteinsRaw) ? proteinsRaw : null;
  } else if (typeof proteinsRaw === "string") {
    const parsed = Number(proteinsRaw);
    proteinsPer100g = Number.isFinite(parsed) ? parsed : null;
  }

  const ingredientsText =
    product.ingredients_text_en?.trim() || product.ingredients_text?.trim() || null;

  return {
    barcode,
    name: product.product_name?.trim() || null,
    brands: product.brands?.trim() || null,
    ingredientsText,
    allergens,
    energyKcalPer100g,
    sugarsPer100g,
    proteinsPer100g,
    servingSize: product.serving_size?.trim() || null,
    imageUrl: product.image_url?.trim() || null,
  };
}

export async function fetchProduct(barcode: string): Promise<ProductResult | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // Attempt 1: v2 endpoint without .json; Attempt 2: legacy v0 with .json
      const url =
        attempt === 1
          ? `${OFF_ENDPOINT_V2}/${encodeURIComponent(barcode)}`
          : `${OFF_ENDPOINT_V0}/${encodeURIComponent(barcode)}.json`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        // next: { revalidate: 0 } // no caching; we rely on runtime defaults
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Retry on second attempt using legacy v0 endpoint for 404s and 5xx.
        console.warn(
          `[OFF] HTTP error ${response.status} on attempt ${attempt}/${MAX_ATTEMPTS} for barcode ${barcode}`
        );
        if (attempt < MAX_ATTEMPTS) {
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      let data: OffResponse | null = null;
      try {
        data = (await response.json()) as OffResponse;
      } catch (parseError) {
        console.error(`[OFF] Failed to parse JSON for barcode ${barcode}`, parseError);
        return null;
      }

      if (!data || data.status !== 1 || !data.product) {
        // Product not found
        return null;
      }

      return toProductResult(barcode, data.product);
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = (error as any)?.name === "AbortError";
      const isNetworkError = isAbort || error instanceof TypeError;

      console.error(
        `[OFF] Request failed on attempt ${attempt}/${MAX_ATTEMPTS} for barcode ${barcode}`,
        error
      );

      if (isNetworkError && attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue; // retry
      }

      // Give up
      return null;
    }
  }

  return null;
}

// Helper to pick a localized field from OFF (e.g., ingredients_text_en, ingredients_text_fr)
type AnyOff = Record<string, any>;
function pickLangField<T extends AnyOff>(obj: T, base: string, preferred?: string) {
  const tries: string[] = [];
  if (preferred) {
    const lc = preferred.toLowerCase();
    tries.push(lc);
    const short = lc.split("-")[0];
    if (short && short !== lc) tries.push(short);
  }
  tries.push("en");
  for (const t of tries) {
    const key = `${base}_${t}`;
    const val = obj?.[key];
    if (typeof val === "string" && val.trim()) return { value: val.trim(), lang: t };
  }
  const fallback = obj?.[base];
  return { value: typeof fallback === "string" ? fallback.trim() : null, lang: null };
}

export async function fetchProductLocalized(
  barcode: string,
  preferredLang?: string,
  translateTo: string = "EN"
): Promise<(ProductResult & { ingredientsOriginal?: string | null; ingredientsLang?: string | null }) | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${OFF_ENDPOINT_V2}/${encodeURIComponent(barcode)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(preferredLang ? { "Accept-Language": preferredLang } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = (await response.json()) as { status?: number; product?: AnyOff };
    if (!data || data.status !== 1 || !data.product) return null;

    const p = data.product as AnyOff;
    const picked = pickLangField(p, "ingredients_text", preferredLang);
    const namePicked = pickLangField(p, "product_name", preferredLang);

    let ingredientsText: string | null = picked.value ?? null;
    const nameText: string | null = namePicked.value ?? (p.product_name?.trim() || null);

    // Translate to target language for consistent analysis
    const needTranslate = !!ingredientsText && translateTo.toLowerCase() !== (picked.lang ?? "").toLowerCase();
    if (needTranslate) {
      try {
        const { translateText } = await import("./translate");
        const tr = await translateText(ingredientsText!, translateTo);
        ingredientsText = tr.text || ingredientsText;
      } catch {
        // swallow translation errors; keep original
      }
    }

    return {
      barcode,
      name: nameText,
      brands: p.brands?.trim() || null,
      ingredientsText,
      allergens: Array.isArray(p.allergens_tags) ? (p.allergens_tags as string[]) : [],
      energyKcalPer100g: Number.isFinite(+p?.nutriments?.["energy-kcal_100g"]) ? +p.nutriments["energy-kcal_100g"] : null,
      sugarsPer100g: Number.isFinite(+p?.nutriments?.["sugars_100g"]) ? +p.nutriments["sugars_100g"] : null,
      proteinsPer100g: Number.isFinite(+p?.nutriments?.["proteins_100g"]) ? +p.nutriments["proteins_100g"] : null,
      servingSize: p.serving_size?.trim() || null,
      imageUrl: p.image_url?.trim() || null,
      ingredientsOriginal: picked.value ?? null,
      ingredientsLang: picked.lang ?? null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}


