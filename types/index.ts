/**
 * ISO 8601 date-time string (e.g., 2025-10-15T12:34:56.789Z).
 */
export type ISODateString = string;

/**
 * User-selected diet mode used to evaluate products.
 */
export type DietMode = "vegetarian" | "vegan" | "jain";

/**
 * Overall decision for whether a product fits the selected diet mode.
 */
export type Verdict = "yes" | "no" | "unsure";

/**
 * Confidence score represented as a number between 0 and 100 (inclusive).
 * Note: Enforced at runtime; TypeScript cannot constrain numeric ranges at type-level.
 */
export type ConfidenceScore = number;

/**
 * A single reason contributing to the product's dietary verdict.
 */
export interface Reason {
  /** Matched ingredient or term that triggered this reason. */
  ingredient: string;
  /** Category of the reason. */
  category: "meat" | "dairy" | "egg" | "honey" | "root" | "fungi" | "additive";
  /** Severity of the reason's impact on the verdict. */
  severity: "blocking" | "warning";
  /** Human-readable explanation of why this reason applies. */
  explanation: string;
}

/**
 * Summary of dietary analysis for a product.
 */
export interface AnalysisSummary {
  /** Final verdict for the selected diet mode. */
  verdict: Verdict;
  /** Confidence in the verdict (0-100). */
  confidence: ConfidenceScore;
  /** Supporting reasons that explain the verdict. */
  reasons: Reason[];
}

/**
 * Optional nutrition data available for a product.
 * Units are per 100g/ml when sourced from Open Food Facts unless otherwise noted.
 */
export interface NutritionData {
  /** Energy in kilocalories. */
  calories?: number;
  /** Sugars in grams. */
  sugars?: number;
  /** Protein in grams. */
  protein?: number;
}

/**
 * Standardized result representing a scanned or looked-up product within VegWise.
 */
export interface ProductResult {
  /** GTIN/EAN barcode of the product. */
  barcode: string;
  /** Display name of the product. */
  name: string;
  /** Brand or manufacturer name. */
  brand: string;
  /** Primary image URL for the product. */
  image: string;

  /** Raw ingredients string as provided by the source. */
  ingredientsText: string;
  /** Normalized list of ingredients (lowercased, trimmed, canonicalized). */
  ingredientsNormalized: string[];

  /** Dietary analysis summary. */
  analysis: AnalysisSummary;

  /** Declared allergens, normalized to lowercase strings (e.g., "milk"). */
  allergens: string[];

  /** Optional nutrition metrics when available. */
  nutrition?: NutritionData;

  /** Metadata about this record. */
  metadata: {
    /** When the product was scanned or analyzed (ISO 8601). */
    scannedAt: ISODateString;
    /** Data source identifier (e.g., "OpenFoodFacts", "manual"). */
    source: string;
  };
}

/**
 * Entry for persisting past scans/lookups in local storage or IndexedDB.
 */
export interface HistoryEntry {
  /** Unique identifier for this history record. */
  id: string;
  /** Full product result snapshot at time of storage. */
  product: ProductResult;
  /** When this entry was stored (ISO 8601). */
  storedAt: ISODateString;
}

/**
 * Subset of Open Food Facts ingredient entry used by VegWise.
 * See OFF API docs for complete schema.
 */
export interface OFFIngredient {
  /** Raw text of the ingredient. */
  text?: string;
  /** Optional OFF ingredient identifier. */
  id?: string;
  /** OFF-provided vegetarian flag. */
  vegetarian?: "yes" | "no" | "maybe" | "unknown";
  /** OFF-provided vegan flag. */
  vegan?: "yes" | "no" | "maybe" | "unknown";
  /** Estimated percent of ingredient in product. */
  percent_estimate?: number;
  /** Minimum percent of ingredient in product. */
  percent_min?: number;
  /** Maximum percent of ingredient in product. */
  percent_max?: number;
}

/**
 * Nutrimients as provided by Open Food Facts for fields relevant to VegWise.
 */
export interface OFFNutriments {
  /** Energy in kcal per 100g (canonical key). */
  energy_kcal_100g?: number;
  /** Energy in kcal per 100g (alternate key commonly seen in OFF). */
  "energy-kcal_100g"?: number;
  /** Sugars in g per 100g. */
  sugars_100g?: number;
  /** Protein in g per 100g. */
  proteins_100g?: number;
}

/**
 * Product object from Open Food Facts used to map into VegWise structures.
 */
export interface OFFProduct {
  /** EAN/GTIN code also returned as top-level response code. */
  code: string;
  /** Localized product name. */
  product_name?: string;
  /** Comma-separated brand names. */
  brands?: string;
  /** Primary image URL. */
  image_url?: string;
  /** Raw ingredients text. */
  ingredients_text?: string;
  /** Parsed ingredients list from OFF. */
  ingredients?: OFFIngredient[];
  /** Allergen tags (e.g., "en:milk"). */
  allergens_tags?: string[];
  /** Nutritional values (per 100g). */
  nutriments?: OFFNutriments;
}

/**
 * Canonical response shape for a product lookup from Open Food Facts.
 */
export interface OFFProductResponse {
  /** EAN/GTIN barcode string. */
  code: string;
  /** 1 if found, 0 if not found. */
  status: 0 | 1;
  /** Human-readable status message. */
  status_verbose: string;
  /** Product payload present when status = 1. */
  product?: OFFProduct;
}

/**
 * Re-export convenience bundle for consumers preferring namespace-style imports.
 */
export type {
  Reason as VegWiseReason,
  AnalysisSummary as VegWiseAnalysis,
  NutritionData as VegWiseNutrition,
  OFFIngredient as VegWiseOFFIngredient,
  OFFNutriments as VegWiseOFFNutriments,
  OFFProduct as VegWiseOFFProduct,
  OFFProductResponse as VegWiseOFFProductResponse,
};


