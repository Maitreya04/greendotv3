export type ProductResult = {
  barcode: string;
  name: string | null;
  brands: string | null;
  ingredientsText: string | null;
  allergens: string[];
  energyKcalPer100g: number | null;
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

  const ingredientsText =
    product.ingredients_text_en?.trim() || product.ingredients_text?.trim() || null;

  return {
    barcode,
    name: product.product_name?.trim() || null,
    brands: product.brands?.trim() || null,
    ingredientsText,
    allergens,
    energyKcalPer100g,
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


