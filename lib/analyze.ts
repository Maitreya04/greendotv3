import rules from "./rules.json" assert { type: "json" };
import type { DietMode, Verdict, ConfidenceScore, Reason } from "@/types";

export interface AnalysisResult {
  verdict: Verdict;
  confidence: ConfidenceScore;
  reasons: Reason[];
  allergens: string[];
}

type BlocklistCategories = Record<string, string[]>;

interface DietRule {
  extends?: string;
  blocklist?: BlocklistCategories;
  patterns?: string[]; // legacy top-level, but we will hoist/merge into blocklist.patterns
  flags?: Record<string, "unsure" | "warning">;
}

interface RulesShape {
  vegetarian: DietRule;
  vegan: DietRule;
  jain: DietRule;
  allergens: Record<string, string[]>;
}

const t0 = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function debug(...args: unknown[]) {
  // Centralized debug logger to allow silencing in production later if needed.
  // eslint-disable-next-line no-console
  console.log("[analyze]", ...args);
}

const RULES: RulesShape = rules as unknown as RulesShape;

/**
 * Normalize raw ingredients text into lowercase tokens, stripping punctuation and splitting on delimiters.
 */
export function normalizeIngredients(raw: string): string[] {
  if (!raw) return [];
  const lower = raw.toLowerCase();
  // Remove special chars: ()[],.!? and collapse multiple delimiters into spaces
  const cleaned = lower.replace(/[()\[\],.!?]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  // Split by spaces and commas -> commas already replaced, split on spaces
  const tokens = cleaned.split(" ").map((t) => t.trim()).filter(Boolean);
  return tokens;
}

function mergeDietRule(mode: DietMode): Required<Pick<DietRule, "blocklist">> & Pick<DietRule, "flags"> {
  const chain: DietRule[] = [];
  let cursor: string | undefined = mode;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) break; // guard against cycles
    seen.add(cursor);
    const node: DietRule | undefined = (RULES as unknown as Record<string, DietRule | undefined>)[cursor];
    if (node) chain.unshift(node); // parent first
    cursor = node?.extends;
  }

  const mergedBlocklists: BlocklistCategories = {};
  let mergedFlags: Record<string, "unsure" | "warning"> | undefined = undefined;

  for (const layer of chain) {
    // Merge blocklist categories
    if (layer.blocklist) {
      for (const [category, items] of Object.entries(layer.blocklist)) {
        const bucket = mergedBlocklists[category] ?? [];
        for (const item of items) {
          if (!bucket.includes(item)) bucket.push(item);
        }
        mergedBlocklists[category] = bucket;
      }
    }
    // Hoist top-level patterns if present to blocklist.patterns
    if (Array.isArray((layer as any).patterns) && (layer as any).patterns.length) {
      const bucket = mergedBlocklists["patterns"] ?? [];
      for (const p of (layer as any).patterns as string[]) {
        if (!bucket.includes(p)) bucket.push(p);
      }
      mergedBlocklists["patterns"] = bucket;
    }
    if (layer.flags) {
      mergedFlags = { ...(mergedFlags ?? {}), ...layer.flags };
    }
  }

  return { blocklist: mergedBlocklists, flags: mergedFlags };
}

function toReason(ingredient: string, category: string, severity: "blocking" | "warning", explanation?: string): Reason {
  // Map category names in rules to Reason.category union
  const categoryMap: Record<string, Reason["category"]> = {
    meat: "meat",
    animal_products: "additive",
    dairy: "dairy",
    egg: "egg",
    honey: "honey",
    roots: "root",
    fungi: "fungi",
    alcohol: "additive",
    patterns: "additive",
  };
  const mapped = categoryMap[category] ?? "additive";
  return {
    ingredient,
    category: mapped,
    severity,
    explanation: explanation ?? `${ingredient} is not allowed for this diet (category: ${category}).`,
  };
}

function matchTokensAgainstBlocklists(
  tokens: string[],
  blocklists: BlocklistCategories,
  mode: DietMode,
  flags?: Record<string, "unsure" | "warning">,
  fullText?: string
): Reason[] {
  const reasons: Reason[] = [];
  const seen = new Set<string>();
  const categories = Object.keys(blocklists);

  // Build a flat set for exact matches per category for O(1) checks
  const exactMaps: Record<string, Set<string>> = {};
  for (const cat of categories) {
    if (cat === "patterns") continue;
    exactMaps[cat] = new Set(blocklists[cat].map((s) => s.toLowerCase()));
  }

  // Patterns are substring contains checks
  const patternList = (blocklists["patterns"] ?? []).map((s) => s.toLowerCase());

  // Special handling for Jain: roots and fungi are blocking; some flags are unsure/warning
  const isJain = mode === "jain";

  for (const token of tokens) {
    // Exact matches
    for (const [cat, set] of Object.entries(exactMaps)) {
      if (set.has(token)) {
        const severity: "blocking" | "warning" = isJain && (cat === "roots" || cat === "fungi" || cat === "alcohol") ? "blocking" : "blocking";
        const key = `${token}|${cat}|${severity}`;
        if (!seen.has(key)) {
          reasons.push(toReason(token, cat, severity));
          seen.add(key);
        }
      }
    }

    // Flags for Jain
    if (isJain && flags) {
      const flag = flags[token];
      if (flag === "unsure") {
        const key = `${token}|patterns|warning|unsure`;
        if (!seen.has(key)) {
          reasons.push(toReason(token, "patterns", "warning", `${token} may be derived from restricted sources for Jain diet.`));
          seen.add(key);
        }
      } else if (flag === "warning") {
        const key = `${token}|patterns|warning|warning`;
        if (!seen.has(key)) {
          reasons.push(toReason(token, "patterns", "warning", `${token} is cautioned for Jain diet.`));
          seen.add(key);
        }
      }
    }

    // Pattern contains
    if (patternList.length) {
      for (const pattern of patternList) {
        if (token.includes(pattern)) {
          const key = `${token}|patterns|blocking|${pattern}`;
          if (!seen.has(key)) {
            reasons.push(toReason(token, "patterns", "blocking", `Contains restricted pattern: ${pattern}`));
            seen.add(key);
          }
          break; // one pattern per token is enough
        }
      }
    }

    // Additional heuristic: if token is multi-word split (e.g., bone meal becomes ["bone", "meal"]) patterns like "bone" still catch via contains
  }

  // Phrase-level pattern check across full normalized text (handles multi-word patterns like "fish oil")
  if (fullText && patternList.length) {
    for (const pattern of patternList) {
      if (fullText.includes(pattern)) {
        const key = `${pattern}|patterns|blocking|phrase`;
        if (!seen.has(key)) {
          reasons.push(toReason(pattern, "patterns", "blocking", `Contains restricted pattern: ${pattern}`));
          seen.add(key);
        }
      }
    }
  }

  return reasons;
}

function extractAllergens(tokens: string[]): string[] {
  const allergens: string[] = [];
  for (const [allergen, terms] of Object.entries(RULES.allergens)) {
    const set = new Set(terms.map((t) => t.toLowerCase()));
    for (const token of tokens) {
      if (set.has(token)) {
        if (!allergens.includes(allergen)) allergens.push(allergen);
        break;
      }
    }
  }
  return allergens;
}

function computeVerdict(reasons: Reason[]): Verdict {
  const hasBlocking = reasons.some((r) => r.severity === "blocking");
  if (hasBlocking) return "no";
  const hasWarnings = reasons.some((r) => r.severity === "warning");
  if (hasWarnings) return "unsure";
  return "yes";
}

function estimateConfidence(raw: string, _reasons: Reason[], _verdict: Verdict): ConfidenceScore {
  const len = (raw ?? "").trim().length;
  if (len > 20) return 100; // good quality text per spec
  if (len > 0) return 75; // somewhat incomplete/short
  return 50; // missing
}

export function analyzeIngredients(ingredients: string, dietMode: DietMode): AnalysisResult {
  const start = t0();
  debug("Starting analysis", { dietMode, length: ingredients?.length ?? 0 });

  const tokens = normalizeIngredients(ingredients);
  debug("Normalized tokens", tokens.slice(0, 30), tokens.length > 30 ? `(+${tokens.length - 30} more)` : "");

  const { blocklist, flags } = mergeDietRule(dietMode);
  debug("Merged rules categories", Object.keys(blocklist));

  const normalizedText = tokens.join(" ");
  const reasons = matchTokensAgainstBlocklists(tokens, blocklist, dietMode, flags, normalizedText);
  debug("Matched reasons", reasons);

  const verdict = computeVerdict(reasons);
  const confidence = estimateConfidence(ingredients, reasons, verdict);
  const allergens = extractAllergens(tokens);

  const elapsed = Math.round((t0() - start) * 1000) / 1000; // ms with micro precision if performance.now available
  debug(`Finished analysis in ~${elapsed} ms`, { verdict, confidence, reasonCount: reasons.length, allergens });

  return { verdict, confidence, reasons, allergens };
}

export default analyzeIngredients;


