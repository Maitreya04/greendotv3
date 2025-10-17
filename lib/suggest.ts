import { analyzeIngredients } from "./analyze";
import type { DietMode } from "@/types";

// Minimal OFF search and product fields
type Grade = "a" | "b" | "c" | "d" | "e";

export type DesiredLabel = "vegan" | "organic" | "halal" | "kosher";

export interface SuggestionPrefs {
  diet: DietMode;
  avoidAllergens: string[];
  palmOilFree?: boolean;
  requiredLabels?: DesiredLabel[];
  countryTag?: string; // e.g., "en:india"
  limit?: number; // default 8
  sort?: "balanced" | "nutri" | "nova" | "eco" | "sugar" | "salt";
}

export interface Baseline {
  code: string;
  name?: string;
  categories_tags?: string[];
  countries_tags?: string[];
  nutrition_grades?: Grade;
  nova_group?: number;
  ecoscore_grade?: Grade;
  ecoscore_score?: number;
  nutriments?: Record<string, unknown>;
  additives_n?: number;
  additives_tags?: string[];
  ingredients_from_palm_oil_n?: number;
}

export interface Candidate {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  categories_tags?: string[];
  countries_tags?: string[];
  labels_tags?: string[];
  ingredients_analysis_tags?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
  nutrition_grades?: Grade;
  nova_group?: number;
  ecoscore_grade?: Grade;
  ecoscore_score?: number;
  nutriments?: Record<string, unknown>;
  additives_n?: number;
  additives_tags?: string[];
  ingredients_from_palm_oil_n?: number;
  ingredients_text?: string;
}

export interface Suggestion extends Candidate {
  dietVerdict: "yes" | "no" | "unsure";
  badges: {
    palmOilFree?: boolean;
    labels?: DesiredLabel[];
  };
  deltas: {
    nutri?: { from?: Grade; to?: Grade };
    nova?: { from?: number; to?: number };
    eco?: { from?: Grade; to?: Grade };
    sugars100g?: { from?: number; to?: number };
    salt100g?: { from?: number; to?: number };
    additives?: { from?: number; to?: number };
  };
  score: number;
}

const USER_AGENT = "Greendot/1.0 (https://greendot.app)";
const SEARCH_ENDPOINT = "https://world.openfoodfacts.org/api/v2/search";
const PRODUCT_ENDPOINT_V2 = "https://world.openfoodfacts.org/api/v2/product";

const gradeOrder: Grade[] = ["a", "b", "c", "d", "e"];
function betterGrade(a?: Grade, b?: Grade): boolean {
  if (!a || !b) return false;
  return gradeOrder.indexOf(a) < gradeOrder.indexOf(b);
}

function toEnglishTagValue(tags?: string[]): string | undefined {
  if (!Array.isArray(tags) || tags.length === 0) return undefined;
  // Pick the most specific tag tail with en: prefix if available
  const en = tags.find((t) => t.startsWith("en:"));
  return en ? en.slice(3) : tags[tags.length - 1]?.split(":").pop();
}

// Normalize OFF categories into lowercase english slugs
function normalizeCategorySlugs(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(String)
    .map((t) => (t.includes(":") ? t.split(":").pop()! : t))
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);
}

// Avoid generic/broad categories that don't help with like-for-like suggestions
const GENERIC_CATEGORY_SLUGS = new Set([
  "foods",
  "food",
  "meals",
  "prepared-meals",
  "ready-meals",
  "snacks",
  "beverages",
  "drinks",
  "groceries",
  "grocery-products",
  "dishes",
]);

// Choose a specific category slug; prefer ramen/noodles if present, else longest non-generic slug
function pickCategorySlug(tags?: string[]): string | undefined {
  const slugs = normalizeCategorySlugs(tags).filter((s) => !GENERIC_CATEGORY_SLUGS.has(s));
  if (slugs.length === 0) return undefined;

  const preferred = ["instant-ramen", "instant-noodles", "ramen", "noodles"];
  for (const key of preferred) {
    const hits = slugs.filter((s) => s.includes(key));
    if (hits.length) return hits.sort((a, b) => b.length - a.length)[0];
  }

  // Fallback: assume longest slug is most specific
  return slugs.sort((a, b) => b.length - a.length)[0];
}

// Ensure a candidate truly belongs to the selected category (not just loosely matched by search)
function belongsToCategory(c: Candidate, slug: string): boolean {
  const cats = normalizeCategorySlugs(c.categories_tags);
  return cats.some((cat) => cat === slug || cat.endsWith(`-${slug}`) || slug.endsWith(`-${cat}`));
}

export function offSearchUrl(input: { category: string; country?: string; page?: number }): string {
  const { category, country, page = 1 } = input;
  const fields = [
    "code","product_name","brands","image_url",
    "categories_tags","countries_tags",
    "labels_tags","ingredients_analysis_tags",
    "allergens_tags","traces_tags",
    "nutrition_grades","nova_group",
    "ecoscore_grade","ecoscore_score",
    "ingredients_from_palm_oil_n","nutriments","additives_n","additives_tags","ingredients_text"
  ].join(",");
  const qs = new URLSearchParams({
    fields,
    page: String(page),
    page_size: "50",
    categories_tags_en: category,
  });
  if (country) qs.set("countries_tags_en", country);
  return `${SEARCH_ENDPOINT}?${qs.toString()}`;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": USER_AGENT } as any });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchBaselineFromOff(code: string): Promise<Baseline | null> {
  try {
    const data = await fetchJson(`${PRODUCT_ENDPOINT_V2}/${encodeURIComponent(code)}`);
    if (!data || data.status !== 1) return null;
    const p = data.product || {};
    const base: Baseline = {
      code: String(data.code || code),
      name: p.product_name,
      categories_tags: p.categories_tags,
      countries_tags: p.countries_tags,
      nutrition_grades: p.nutrition_grades,
      nova_group: p.nova_group,
      ecoscore_grade: p.ecoscore_grade,
      ecoscore_score: p.ecoscore_score,
      nutriments: p.nutriments,
      additives_n: p.additives_n,
      additives_tags: p.additives_tags,
      ingredients_from_palm_oil_n: p.ingredients_from_palm_oil_n,
    };
    return base;
  } catch {
    return null;
  }
}

function mapOffToCandidate(hit: any): Candidate {
  return {
    code: String(hit.code || ""),
    product_name: hit.product_name,
    brands: hit.brands,
    image_url: hit.image_url,
    categories_tags: hit.categories_tags,
    countries_tags: hit.countries_tags,
    labels_tags: hit.labels_tags,
    ingredients_analysis_tags: hit.ingredients_analysis_tags,
    allergens_tags: hit.allergens_tags,
    traces_tags: hit.traces_tags,
    nutrition_grades: hit.nutrition_grades,
    nova_group: hit.nova_group,
    ecoscore_grade: hit.ecoscore_grade,
    ecoscore_score: hit.ecoscore_score,
    nutriments: hit.nutriments,
    additives_n: hit.additives_n,
    additives_tags: hit.additives_tags,
    ingredients_from_palm_oil_n: hit.ingredients_from_palm_oil_n,
    ingredients_text: hit.ingredients_text,
  };
}

function hasDesiredLabels(labels: string[] | undefined, required: DesiredLabel[] | undefined): boolean {
  if (!required || required.length === 0) return true;
  const arr = (labels || []).map(String);
  const match = (needle: string) => arr.some((t) => t.toLowerCase().includes(needle));
  return required.every((L) => match(L));
}

function normalizeAllergenTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => String(t).toLowerCase().replace(/^en:/, ""));
}

function palmOilFree(n?: number): boolean {
  return (n ?? 0) === 0;
}

function passesFilters(c: Candidate, prefs: SuggestionPrefs): { ok: boolean; dietVerdict: "yes"|"no"|"unsure" } {
  const ingredients = c.ingredients_text ?? "";
  let dietVerdict: "yes" | "no" | "unsure" = "unsure";
  if (ingredients && ingredients.length > 0) {
    dietVerdict = analyzeIngredients(ingredients, prefs.diet).verdict;
  } else {
    // Backstop using OFF analysis tags for vegan/vegetarian; Jain has no OFF tag.
    const tags = (c.ingredients_analysis_tags || []).map(String);
    const hasTag = (s: string) => tags.some((t) => t.includes(s));
    if (prefs.diet === "vegan" && hasTag("vegan:yes")) dietVerdict = "yes";
    else if (prefs.diet === "vegetarian" && hasTag("vegetarian:yes")) dietVerdict = "yes";
    else dietVerdict = "unsure";
  }
  if (dietVerdict !== "yes") return { ok: false, dietVerdict };

  // Allergens
  const avoid = new Set(prefs.avoidAllergens.map((s) => s.toLowerCase()))
  const candAllergens = normalizeAllergenTags(c.allergens_tags);
  if (candAllergens.some((a) => avoid.has(a))) return { ok: false, dietVerdict };

  // Palm oil
  if (prefs.palmOilFree && !palmOilFree(c.ingredients_from_palm_oil_n)) return { ok: false, dietVerdict };

  // Labels
  if (!hasDesiredLabels(c.labels_tags, prefs.requiredLabels)) return { ok: false, dietVerdict };

  return { ok: true, dietVerdict };
}

function num(val: any | undefined): number | undefined {
  if (typeof val === "number") return Number.isFinite(val) ? val : undefined;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function computeDeltas(c: Candidate, base: Baseline): Suggestion["deltas"] {
  const sugars = num((c.nutriments as any)?.sugars_100g ?? (c.nutriments as any)?.["sugars_100g"]);
  const sugarsBase = num((base.nutriments as any)?.sugars_100g ?? (base.nutriments as any)?.["sugars_100g"]);
  const salt = num((c.nutriments as any)?.salt_100g ?? (c.nutriments as any)?.["salt_100g"]);
  const saltBase = num((base.nutriments as any)?.salt_100g ?? (base.nutriments as any)?.["salt_100g"]);
  const adds = num(c.additives_n ?? c.additives_tags?.length);
  const addsBase = num(base.additives_n ?? base.additives_tags?.length);
  return {
    nutri: (c.nutrition_grades || base.nutrition_grades) ? { from: base.nutrition_grades, to: c.nutrition_grades } : undefined,
    nova: (typeof c.nova_group === "number" || typeof base.nova_group === "number") ? { from: base.nova_group, to: c.nova_group } : undefined,
    eco: (c.ecoscore_grade || base.ecoscore_grade) ? { from: base.ecoscore_grade, to: c.ecoscore_grade } : undefined,
    sugars100g: (sugars !== undefined || sugarsBase !== undefined) ? { from: sugarsBase, to: sugars } : undefined,
    salt100g: (salt !== undefined || saltBase !== undefined) ? { from: saltBase, to: salt } : undefined,
    additives: (adds !== undefined || addsBase !== undefined) ? { from: addsBase, to: adds } : undefined,
  };
}

function scoreCandidate(c: Candidate, base: Baseline, prefs: SuggestionPrefs): number {
  let s = 0;
  if (betterGrade(c.nutrition_grades, base.nutrition_grades)) {
    s += 20 + 10 * (gradeOrder.indexOf(base.nutrition_grades as Grade) - gradeOrder.indexOf(c.nutrition_grades as Grade));
  }
  if (typeof c.nova_group === "number" && typeof base.nova_group === "number" && c.nova_group < base.nova_group) {
    s += 12 + 6 * (base.nova_group - c.nova_group);
  }
  if (betterGrade(c.ecoscore_grade, base.ecoscore_grade)) {
    s += 15 + 7 * (gradeOrder.indexOf(base.ecoscore_grade as Grade) - gradeOrder.indexOf(c.ecoscore_grade as Grade));
  }
  if (palmOilFree(c.ingredients_from_palm_oil_n) && !palmOilFree(base.ingredients_from_palm_oil_n)) s += 10;
  if (prefs.requiredLabels && prefs.requiredLabels.length) {
    const labels = (c.labels_tags || []).map(String);
    const count = prefs.requiredLabels.filter((L) => labels.some((t) => t.toLowerCase().includes(L))).length;
    s += 8 * count;
  }
  const sugar = num((c.nutriments as any)?.sugars_100g ?? (c.nutriments as any)?.["sugars_100g"]);
  const sugarBase = num((base.nutriments as any)?.sugars_100g ?? (base.nutriments as any)?.["sugars_100g"]);
  if (sugar !== undefined && sugarBase !== undefined && sugar < sugarBase) {
    s += Math.min(10, ((sugarBase - sugar) / Math.max(1, sugarBase)) * 10);
  }
  const adds = num(c.additives_n ?? c.additives_tags?.length);
  const addsBase = num(base.additives_n ?? base.additives_tags?.length);
  if (adds !== undefined && addsBase !== undefined && adds > addsBase) s -= 8 * (adds - addsBase);
  return s;
}

function sortKey(c: Candidate, base: Baseline, prefs: SuggestionPrefs, mode: NonNullable<SuggestionPrefs["sort"]>): number {
  const sugars = num((c.nutriments as any)?.sugars_100g ?? (c.nutriments as any)?.["sugars_100g"]);
  const salt = num((c.nutriments as any)?.salt_100g ?? (c.nutriments as any)?.["salt_100g"]);
  switch (mode) {
    case "nutri":
      return gradeOrder.indexOf(c.nutrition_grades as Grade);
    case "nova":
      return c.nova_group ?? 99;
    case "eco":
      return gradeOrder.indexOf(c.ecoscore_grade as Grade);
    case "sugar":
      return sugars ?? Number.POSITIVE_INFINITY;
    case "salt":
      return salt ?? Number.POSITIVE_INFINITY;
    default:
      return -scoreCandidate(c, base, prefs); // for balanced we use score
  }
}

function diversifyByBrand(list: Candidate[], maxPerBrand = 2): Candidate[] {
  const counts = new Map<string, number>();
  const out: Candidate[] = [];
  for (const item of list) {
    const brand = (item.brands || "").split(",")[0].trim().toLowerCase();
    const n = counts.get(brand) || 0;
    if (n < maxPerBrand) {
      out.push(item);
      counts.set(brand, n + 1);
    }
  }
  return out;
}

export async function fetchSuggestions(baselineInput: Baseline, prefs: SuggestionPrefs): Promise<Suggestion[]> {
  // Ensure baseline has category/country; fetch if missing
  let baseline = baselineInput;
  if (!baseline.categories_tags || baseline.categories_tags.length === 0) {
    const fetched = await fetchBaselineFromOff(baseline.code);
    if (fetched) baseline = { ...fetched, ...baseline };
  }
  const categorySlug = pickCategorySlug(baseline.categories_tags);
  if (!categorySlug) return [];
  const countrySlug = prefs.countryTag ? prefs.countryTag.replace(/^en:/, "") : toEnglishTagValue(baseline.countries_tags);

  const url = offSearchUrl({ category: categorySlug, country: countrySlug });
  let data: any;
  try {
    data = await fetchJson(url);
  } catch {
    return [];
  }
  const hits: any[] = Array.isArray(data?.products) ? data.products : [];
  const candidates = hits
    .map(mapOffToCandidate)
    .filter((c) => c.code && c.code !== baseline.code && belongsToCategory(c, categorySlug));

  // Filter
  const filtered: { c: Candidate; dietVerdict: "yes"|"no"|"unsure" }[] = [];
  for (const c of candidates) {
    const res = passesFilters(c, prefs);
    if (res.ok) filtered.push({ c, dietVerdict: res.dietVerdict });
  }

  // Rank
  const scored = filtered.map(({ c, dietVerdict }) => {
    const score = scoreCandidate(c, baseline, prefs);
    return { c, dietVerdict, score };
  });

  // Sort
  const mode: NonNullable<SuggestionPrefs["sort"]> = prefs.sort || "balanced";
  if (mode === "balanced") {
    scored.sort((a, b) => b.score - a.score);
  } else {
    scored.sort((a, b) => sortKey(a.c, baseline, prefs, mode) - sortKey(b.c, baseline, prefs, mode));
  }

  // Diversify brands
  const diversified = diversifyByBrand(scored.map((s) => s.c));

  const limited = diversified.slice(0, prefs.limit ?? 8);

  // Build suggestions
  const suggestions: Suggestion[] = limited.map((c) => ({
    ...c,
    dietVerdict: "yes",
    badges: {
      palmOilFree: palmOilFree(c.ingredients_from_palm_oil_n),
      labels: (prefs.requiredLabels || []).filter((L) => (c.labels_tags || []).some((t) => String(t).toLowerCase().includes(L))),
    },
    deltas: computeDeltas(c, baseline),
    score: scoreCandidate(c, baseline, prefs),
  }));

  return suggestions;
}


