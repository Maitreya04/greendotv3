"use client";

import React from "react";
import { typography } from "@/lib/typography";
import { useMemo, useState, useCallback, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductResult as VegWiseProductResult, Reason as VegWiseReason, DietMode } from "@/types";
import Image from "next/image";
import { analyzeIngredients } from "@/lib/analyze";
import SectionCard from "@/components/ui/SectionCard";
import StatusRow from "@/components/ui/StatusRow";
import { DietTag, TagState } from "@/components/ui/DietTag";
import {
  Leaf,
  Sprout,
  Wheat,
  Milk,
  Hand,
  ShieldAlert,
  HeartPulse,
  Check,
  X,
  AlertTriangle,
  Share2,
  Flag,
  Heart as HeartIcon,
  Camera,
  Clock,
  BarChart3,
  TriangleAlert,
  Package,
  Egg,
  Fish,
  Shrimp,
  AlertCircle,
  Carrot,
  Drumstick
} from "lucide-react";

type Props = {
  result: VegWiseProductResult;
  onScanAnother: () => void;
  dietMode?: DietMode;
};

function verdictMeta(verdict: VegWiseProductResult["analysis"]["verdict"]) {
  if (verdict === "yes") {
    return {
      emoji: "✅",
      text: "Safe for your diet",
      bg: "bg-emerald-100",
      fg: "text-emerald-800",
      ring: "ring-emerald-200",
      gradient: "from-emerald-500/80 via-emerald-600/60 to-emerald-700/60",
      bar: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600",
    } as const;
  }
  if (verdict === "no") {
    return {
      emoji: "❌",
      text: "Not suitable",
      bg: "bg-rose-100",
      fg: "text-rose-800",
      ring: "ring-rose-200",
      gradient: "from-rose-500/80 via-rose-600/60 to-rose-700/60",
      bar: "bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600",
    } as const;
  }
  return {
    emoji: "⚠️",
    text: "Check carefully",
    bg: "bg-amber-100",
    fg: "text-amber-800",
    ring: "ring-amber-200",
    gradient: "from-amber-500/80 via-amber-600/60 to-amber-700/60",
    bar: "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600",
  } as const;
}

function renderAllergenIcon(key: string) {
  switch (key) {
    case "milk":
    case "lactose":
      return <Milk size={14} />;
    case "gluten":
    case "wheat":
      return <Wheat size={14} />;
    case "egg":
    case "eggs":
      return <Egg size={14} />;
    case "fish":
      return <Fish size={14} />;
    case "shellfish":
    case "crustacean":
      return <Shrimp size={14} />;
    case "soy":
    case "soya":
      return <Sprout size={14} />;
    // For peanuts/tree nuts/sesame, fall back to a generic alert icon
    case "peanut":
    case "peanuts":
    case "tree nuts":
    case "almond":
    case "hazelnut":
    case "walnut":
    case "sesame":
      return <AlertCircle size={14} />;
    default:
      return <AlertCircle size={14} />;
  }
}

const containerVariants = {
  hidden: { opacity: 0, y: 64 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      duration: 0.5,
      stiffness: 240,
      damping: 24,
      staggerChildren: 0.1,
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 22 } },
};

const tooltipBase = "pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100 group-active:opacity-100";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function categoryColor(category: VegWiseReason["category"]) {
  switch (category) {
    case "meat":
      return "text-rose-700 decoration-rose-500";
    case "dairy":
      return "text-amber-700 decoration-amber-500";
    case "egg":
      return "text-amber-700 decoration-amber-500";
    case "honey":
      return "text-amber-700 decoration-amber-500";
    case "root":
      return "text-orange-700 decoration-orange-500";
    case "fungi":
      return "text-violet-700 decoration-violet-500";
    default:
      return "text-slate-700 decoration-slate-400";
  }
}

export default function ResultCard({ result, onScanAnother, dietMode }: Props) {
  const name = result.name || "Unknown Product";
  const barcode = result.barcode;
  const verdict = result.analysis.verdict;
  const confidence = result.analysis.confidence ?? 0;
  const meta = verdictMeta(verdict);
  const confettiFiredRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();

  const reasons = (result as any).reasons ?? result.analysis.reasons ?? [];
  const [expanded, setExpanded] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);

  const uniqueTerms = useMemo(() => {
    const byCat: Record<string, VegWiseReason["category"]> = {};
    for (const r of reasons as VegWiseReason[]) {
      const key = r.ingredient?.toLowerCase();
      if (key && !(key in byCat)) byCat[key] = r.category;
    }
    return byCat;
  }, [reasons]);

  const highlighted = useMemo(() => {
    const raw = result.ingredientsText || "No ingredients info available.";
    const keys = Object.keys(uniqueTerms);
    if (keys.length === 0) return [raw];
    const pattern = new RegExp(`\\b(${keys.map(escapeRegExp).join("|")})\\b`, "gi");
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    for (const match of raw.matchAll(pattern)) {
      const index = match.index ?? 0;
      const matched = match[0];
      if (index > lastIndex) nodes.push(raw.slice(lastIndex, index));
      const cat = uniqueTerms[matched.toLowerCase() as keyof typeof uniqueTerms] ?? "additive";
      nodes.push(
        <span key={`${matched}-${index}`} className="relative group inline-block">
          <mark
            className={`rounded-[2px] bg-transparent underline decoration-2 underline-offset-4 ${categoryColor(cat)}`}
          >
            {matched}
          </mark>
          <span className={`${tooltipBase} bottom-full mb-1`}>{cat}</span>
        </span>
      );
      lastIndex = index + matched.length;
    }
    if (lastIndex < raw.length) nodes.push(raw.slice(lastIndex));
    return nodes;
  }, [result.ingredientsText, uniqueTerms]);

  const share = useCallback(async () => {
    const text = `${name} • ${verdict.toUpperCase()} (${confidence}%)`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Link copied to clipboard");
    } catch {}
  }, [name, verdict, confidence]);

  const progressWidth = `${Math.max(0, Math.min(100, confidence))}%`;

  // Trigger a subtle confetti burst when verdict is 'yes' (from badge origin)
  useEffect(() => {
    if (verdict !== "yes") return;
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("canvas-confetti");
        if (cancelled) return;
        const confetti = mod.default || (mod as any);
        let origin = { x: 0.8, y: 0.15 };
        try {
          const el = badgeRef.current;
          if (el && typeof window !== "undefined") {
            const rect = el.getBoundingClientRect();
            origin = {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            };
          }
        } catch {}
        confetti({
          particleCount: 80,
          spread: 70,
          startVelocity: 38,
          gravity: 1.1,
          ticks: 120,
          scalar: 0.8,
          origin,
          colors: ["#10b981", "#34d399", "#059669"],
        });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [verdict]);

  // Basic focus trap + ESC to close
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusFirst = () => {
      try {
        const focusables = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors));
        (focusables[0] || node).focus();
      } catch {}
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onScanAnother();
        return;
      }
      if (e.key === "Tab") {
        try {
          const focusables = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors)).filter((el) => el.offsetParent !== null || el === document.activeElement);
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        } catch {}
      }
    };

    focusFirst();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onScanAnother]);

  const fallbackCategoryIcon = useMemo(() => {
    try {
      const normalized = result.ingredientsNormalized || [];
      const hasGrain = normalized.some((i) => /wheat|rice|oat|barley|corn|maize/i.test(i));
      if (hasGrain) return <Wheat size={56} className="text-stone-400" />;
    } catch {}
    return <Package size={56} className="text-stone-400" />;
  }, [result.ingredientsNormalized]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full h-[100dvh] sm:h-auto sm:max-w-2xl md:max-w-3xl md:w-[80%] overflow-y-auto rounded-none sm:rounded-3xl bg-white shadow-xl"
      >
        {/* 1) HERO SECTION */}
        <motion.div variants={itemVariants} className="relative">
          <div className="relative h-[280px] w-full overflow-hidden sm:rounded-t-3xl bg-gray-100">
          {result.image ? (
            isOptimizableHttpUrl(result.image) ? (
              <Image
                src={result.image}
                alt={name}
                fill
                priority={false}
                className="object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="(max-width: 640px) 100vw, 800px"
              />
            ) : (
              // Fallback for blob:/data: or unsupported schemes
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.image} alt={name} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-5xl" aria-hidden>{fallbackCategoryEmoji}</span>
              <span className="sr-only">No product image available</span>
            </div>
          )}
            {/* Depth overlays */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 to-transparent mix-blend-multiply"></div>
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${meta.gradient}`}></div>

            {/* Product info overlay */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
              <div id={headingId} className={`truncate text-white drop-shadow ${typography.h3}`}>{name}</div>
              <div className={`mt-0.5 text-white/80 ${typography.bodySmall}`}>{result.brand || ""}</div>
              <div className={`mt-0.5 text-white/70 ${typography.barcode}`}>Barcode: {barcode}</div>
            </div>

            {/* Floating verdict badge */}
            <motion.div
              ref={badgeRef}
              className="absolute right-4 top-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            >
              <div
                className={`grid place-items-center rounded-full w-16 h-16 shadow-xl backdrop-blur ${
                  verdict === "yes"
                    ? "bg-emerald-500 text-white animate-pulse"
                    : verdict === "no"
                    ? "bg-red-500 text-white"
                    : "bg-amber-500 text-white"
                }`}
                aria-label={`Verdict: ${meta.text}`}
              >
                {verdict === "yes" ? (
                  <Check size={28} aria-hidden />
                ) : verdict === "no" ? (
                  <X size={28} aria-hidden />
                ) : (
                  <AlertTriangle size={28} aria-hidden />
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 2) VERDICT SECTION */}
        <motion.div variants={itemVariants} className="px-4 pt-4">
          <div
            className={`rounded-2xl p-6 text-white shadow-sm bg-gradient-to-r ${
              verdict === "yes"
                ? "from-emerald-500 to-emerald-600"
                : verdict === "no"
                ? "from-red-500 to-red-600"
                : "from-amber-500 to-amber-600"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-[5rem] leading-none" aria-hidden>
                {verdict === "yes" ? (
                  <Check size={80} />
                ) : verdict === "no" ? (
                  <X size={80} />
                ) : (
                  <AlertTriangle size={80} />
                )}
              </div>
              <div>
                <div className={`${typography.h2} text-white`}>{meta.text}</div>
                <div className={`${typography.bodySmall} text-white/90`}>{dietMode ? `Verified for ${capitalize(dietMode)}` : "Diet analysis"}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: progressWidth }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/80">{confidence}% confidence</div>
              </div>
            </div>
            {/* Diet toggle removed */}
          </div>
        </motion.div>

        {/* 2.5) DIET STATUS LIST */}
        <DietStatusList result={result} />

        {/* 3) DETAILED ANALYSIS */}
        <motion.div variants={itemVariants} className="px-4 pt-4">
          {Array.isArray(reasons) && reasons.length > 0 && (
            <SectionCard title="Flagged ingredients" subtitle="Detected terms affecting the verdict" className="mb-6">
              <motion.ul
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                className="grid gap-2"
              >
                {(reasons as VegWiseReason[]).map((r, idx) => (
                  <motion.li
                    key={idx}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                    className={`flex items-start gap-3 rounded-lg p-4 ring-1 ${chipRing(r.category)} ${chipBg(r.category)} ${chipText(r.category)} border-l-4 ${chipBorder(r.category)}`}
                    aria-label={`Contains ${r.ingredient}. ${r.explanation}`}
                  >
                    <span className="text-xl" aria-hidden>{chipIcon(r.category)}</span>
                    <div className="flex-1">
                      <div className="font-medium">Contains: {r.ingredient}</div>
                      <div className="text-sm opacity-70">{r.explanation || `Flagged as ${r.category}`}</div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </SectionCard>
          )}

          {/* Original Ingredients (collapsible) */}
          <div className={`${typography.label} text-stone-900 mb-3`}>Ingredients</div>
          <div className="relative">
            <AnimatePresence initial={false}>
              <motion.div
                key={expanded ? "expanded" : "collapsed"}
                initial={{ height: 112, opacity: 1 }}
                animate={{ height: expanded ? "auto" : 112 }}
                exit={{ height: 112 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800"
              >
                <div className="whitespace-pre-wrap leading-relaxed font-mono">
                  {highlighted}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex justify-end">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setExpanded((v) => !v)}
                className={`rounded-full bg-white px-4 py-2 ${typography.caption} text-stone-700 ring-1 ring-stone-200 shadow-sm`}
                aria-expanded={expanded}
                aria-controls="ingredients-panel"
              >
                {expanded ? "Show less" : "View full ingredients"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* 4) INFO CARDS GRID */}
        <motion.div
          variants={itemVariants}
          className="px-4 pt-4"
          transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.3 }}
        >
          <div className="mb-3 flex justify-end">
              <button
              type="button"
              onClick={() => setShowNutrition((v) => !v)}
              className={`rounded-full bg-white px-4 py-2 ${typography.caption} text-stone-700 ring-1 ring-stone-200 shadow-sm`}
              aria-expanded={showNutrition}
              aria-controls="nutrition-card"
            >
              {showNutrition ? "Hide nutrition" : "Show nutrition"}
            </button>
          </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Allergens */}
            <div className="rounded-2xl p-4 shadow-sm border border-stone-100 bg-amber-50 hover:shadow-md transition-transform hover:-translate-y-0.5">
          <div className={`mb-2 flex items-center gap-1 ${typography.label}`}><TriangleAlert size={14} /> Allergens</div>
              {result.allergens && result.allergens.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.allergens.map((a) => {
                    const key = String(a).toLowerCase().replace(/^en:/, "");
                    return (
                      <span
                        key={`${key}`}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-stone-800 ring-1 ring-gray-200"
                      >
                        <span aria-hidden className="grid place-items-center">{renderAllergenIcon(key)}</span>
                        <span className="capitalize">{key}</span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className={`${typography.bodySmall} text-emerald-700`}>No common allergens ✓</div>
              )}
            </div>

            {/* Nutrition (collapsible via toggle) */}
            {showNutrition && (
              <div id="nutrition-card" className="rounded-2xl p-4 shadow-sm border border-stone-100 bg-emerald-50 hover:shadow-md transition-transform hover:-translate-y-0.5">
                <div className={`mb-2 flex items-center gap-1 ${typography.label}`}><BarChart3 size={14} /> Nutrition</div>
                {result.nutrition ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <CircleStat label="Kcal" value={result.nutrition.calories ?? 0} unit="" pct={clamp((result.nutrition.calories ?? 0) / 300, 0, 1)} />
                    <CircleStat label="Sugars" value={result.nutrition.sugars ?? 0} unit="g" pct={clamp((result.nutrition.sugars ?? 0) / 50, 0, 1)} />
                    <CircleStat label="Protein" value={result.nutrition.protein ?? 0} unit="g" pct={clamp((result.nutrition.protein ?? 0) / 25, 0, 1)} />
                  </div>
                ) : (
                  <div className={`${typography.bodySmall} text-stone-500`}>Data not available</div>
                )}
              </div>
            )}

            {/* Source */}
            <div className="rounded-2xl p-4 shadow-sm border border-stone-100 bg-stone-50 hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className={`${typography.label}`}>Source</div>
              <a
                href={`https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${typography.bodySmall} underline underline-offset-4 decoration-stone-400 hover:decoration-stone-600`}
              >
                Open Food Facts
              </a>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                <Check size={12} aria-hidden /> Verified
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl p-4 shadow-sm border border-stone-100 bg-white hover:shadow-md transition-transform hover:-translate-y-0.5">
              <div className={`${typography.label}`}>Quick actions</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={share}
                  aria-label="Share product"
                  className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-stone-200 hover:bg-stone-100 transition"
                >
                  <Share2 size={18} aria-hidden />
                </button>
                <FavoriteButton barcode={barcode} />
                <button
                  type="button"
                  aria-label="Report an issue"
                  onClick={() => {
                    try { window.dispatchEvent(new CustomEvent("reportProduct", { detail: { barcode } })); } catch {}
                    alert("Thanks for your report. We'll review it.");
                  }}
                  className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-stone-200 hover:bg-stone-100 transition"
                >
                  <Flag size={18} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 5) BOTTOM ACTIONS */}
        <div className="pb-[7.5rem] sm:pb-6" />
        <div className="fixed inset-x-0 bottom-0 z-[70] bg-white/95 backdrop-blur border-t border-stone-200 px-4 pt-3 pb-safe">
          <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                onClick={onScanAnother}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 basis-[70%] h-14 rounded-xl bg-emerald-600 text-white font-semibold shadow-md grid place-items-center"
                aria-label="Scan another product"
              >
                <span className="mr-2" aria-hidden><Camera size={18} /></span> Scan Another
              </motion.button>
              <button
                type="button"
                className="basis-[30%] h-14 rounded-xl bg-white text-gray-900 ring-1 ring-stone-300 hover:bg-stone-100 transition grid place-items-center"
                aria-label="Open history"
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent("openHistory")); } catch {}
                }}
              >
                <span className="mr-2" aria-hidden><Clock size={18} /></span> History
              </button>
            </div>
          </div>
        </div>

        {/* 6) Source citation */}
        <motion.div variants={itemVariants} className="px-4 pt-4 pb-6">
          <div className={`${typography.caption} text-stone-500`}>
            Data source: <a href={`https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">Open Food Facts</a>. Ingredients and nutrition are sourced from OFF; dietary analysis is computed locally.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Lightweight shimmer placeholder for Image blurDataURL
function shimmer(width: number, height: number) {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#e5e7eb" offset="20%"/>
          <stop stop-color="#f3f4f6" offset="50%"/>
          <stop stop-color="#e5e7eb" offset="70%"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#eee"/>
      <rect id="r" width="${Math.ceil(width/3)}" height="${height}" fill="url(#g)"/>
      <animate xlink:href="#r" attributeName="x" from="-${Math.ceil(width/3)}" to="${width}" dur="1.2s" repeatCount="indefinite"  />
    </svg>`;
}

function toBase64Safe(s: string): string {
  try {
    if (typeof window !== "undefined" && typeof window.btoa === "function") return window.btoa(s);
  } catch {}
  try {
    const g: any = globalThis as any;
    if (g && g.Buffer) return g.Buffer.from(s).toString("base64");
  } catch {}
  return s;
}

const BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64Safe(shimmer(1200, 448))}`;

function isOptimizableHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// --- Diet status helpers & list ---
type TagKey = "Vegan" | "Vegetarian" | "Gluten-Free" | "Lactose-Free" | "Jain" | "Allergen" | "Healthy";

function verdictToState(v: "yes" | "no" | "unsure"): TagState {
  if (v === "yes") return "pass";
  if (v === "no") return "fail";
  return "unknown";
}

function computeGlutenState(tokens: string[], allergens: string[]): TagState {
  const has = (s: string) => tokens.includes(s) || allergens.includes(s);
  if (has("gluten") || has("wheat") || has("barley") || has("rye") || has("oats")) return "fail";
  if (tokens.length === 0) return "unknown";
  return "pass";
}

function computeLactoseState(tokens: string[], allergens: string[], reasons: VegWiseReason[]): TagState {
  const has = (s: string) => tokens.includes(s) || allergens.includes(s);
  if (has("milk") || has("lactose") || reasons.some((r) => r.category === "dairy")) return "fail";
  if (tokens.length === 0) return "unknown";
  return "pass";
}

function computeHealthyState(nutrition: { calories?: number; sugars?: number } | undefined): TagState {
  if (!nutrition) return "unknown";
  const calories = nutrition.calories ?? 0;
  const sugars = nutrition.sugars ?? 0;
  if (calories <= 150 && sugars <= 10) return "pass";
  if (calories > 250 || sugars > 20) return "fail";
  return "unknown";
}

function DietStatusList({ result }: { result: VegWiseProductResult }) {
  const tokens = (result.ingredientsNormalized ?? []).map((t) => t.toLowerCase());
  const allergens = (result.allergens ?? []).map((a) => String(a).toLowerCase().replace(/^en:/, ""));

  const vegan = analyzeIngredients(result.ingredientsText ?? "", "vegan");
  const vegetarian = analyzeIngredients(result.ingredientsText ?? "", "vegetarian");
  const jain = analyzeIngredients(result.ingredientsText ?? "", "jain");

  const tagStates: Record<TagKey, TagState> = {
    "Vegan": verdictToState(vegan.verdict),
    "Vegetarian": verdictToState(vegetarian.verdict),
    "Gluten-Free": computeGlutenState(tokens, allergens),
    "Lactose-Free": computeLactoseState(tokens, allergens, (result.analysis.reasons ?? []) as VegWiseReason[]),
    "Jain": verdictToState(jain.verdict),
    "Allergen": allergens.length > 0 ? "fail" : tokens.length === 0 ? "unknown" : "pass",
    "Healthy": computeHealthyState(result.nutrition),
  };

  return (
    <div className="px-4 pt-4">
      <SectionCard title="Diet overview" subtitle="Quick checks across common preferences">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <DietTag icon={<Leaf size={16} />} label="Vegan" state={tagStates["Vegan"]} subtle />
          <DietTag icon={<Sprout size={16} />} label="Vegetarian" state={tagStates["Vegetarian"]} subtle />
          <DietTag icon={<Wheat size={16} />} label="Gluten-Free" state={tagStates["Gluten-Free"]} subtle />
          <DietTag icon={<Milk size={16} />} label="Lactose-Free" state={tagStates["Lactose-Free"]} subtle />
          <DietTag icon={<Hand size={16} />} label="Jain" state={tagStates["Jain"]} subtle />
          <DietTag icon={<ShieldAlert size={16} />} label="Allergen" state={tagStates["Allergen"]} subtle />
          <DietTag icon={<HeartPulse size={16} />} label="Healthy" state={tagStates["Healthy"]} subtle />
        </div>
      </SectionCard>
    </div>
  );
}

// Chip styles by category
function chipIcon(category: VegWiseReason["category"]) {
  switch (category) {
    case "meat":
      return <Drumstick size={18} />;
    case "dairy":
      return <Milk size={18} />;
    case "egg":
      return <Egg size={18} />;
    case "honey":
      return <AlertTriangle size={18} />;
    case "root":
      return <Carrot size={18} />;
    case "fungi":
      return <span className="text-[18px] leading-none" aria-hidden>🍄</span>;
    default:
      return <AlertCircle size={18} />;
  }
}

function chipBg(category: VegWiseReason["category"]) {
  switch (category) {
    case "meat":
      return "bg-red-50";
    case "dairy":
      return "bg-blue-50";
    case "root":
      return "bg-amber-50";
    case "fungi":
      return "bg-purple-50";
    default:
      return "bg-stone-50";
  }
}

function chipBorder(category: VegWiseReason["category"]) {
  switch (category) {
    case "meat":
      return "border-red-500";
    case "dairy":
      return "border-blue-500";
    case "root":
      return "border-amber-500";
    case "fungi":
      return "border-purple-500";
    default:
      return "border-stone-400";
  }
}

function chipRing(category: VegWiseReason["category"]) {
  switch (category) {
    case "meat":
      return "ring-red-100";
    case "dairy":
      return "ring-blue-100";
    case "root":
      return "ring-amber-100";
    case "fungi":
      return "ring-purple-100";
    default:
      return "ring-stone-100";
  }
}

function chipText(category: VegWiseReason["category"]) {
  switch (category) {
    case "meat":
      return "text-red-900";
    case "dairy":
      return "text-blue-900";
    case "root":
      return "text-amber-900";
    case "fungi":
      return "text-purple-900";
    default:
      return "text-stone-900";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function FavoriteButton({ barcode }: { barcode: string }) {
  const [fav, setFav] = React.useState<boolean>(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("greendot.favorites") || "{}";
      const map = JSON.parse(raw) as Record<string, true>;
      setFav(Boolean(map[barcode]));
    } catch {}
  }, [barcode]);
  const toggle = useCallback(() => {
    try {
      const raw = localStorage.getItem("greendot.favorites") || "{}";
      const map = JSON.parse(raw) as Record<string, true>;
      if (map[barcode]) {
        delete map[barcode];
        setFav(false);
      } else {
        map[barcode] = true as true;
        setFav(true);
      }
      localStorage.setItem("greendot.favorites", JSON.stringify(map));
    } catch {}
  }, [barcode]);
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? "Remove from favorites" : "Save to favorites"}
      onClick={toggle}
      className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ring-stone-200 hover:bg-stone-100 transition ${fav ? "text-rose-600" : "text-inherit"}`}
    >
      <HeartIcon size={18} aria-hidden fill={fav ? "currentColor" : "none"} />
    </button>
  );
}

function CircleStat({ label, value, unit, pct }: { label: string; value: number; unit: string; pct: number }) {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const stroke = Math.round(circumference * pct);
  const remain = circumference - stroke;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray={`${stroke} ${remain}`} strokeLinecap="round" />
      </svg>
      <div className="text-lg font-bold leading-none">{Math.round(value)}{unit}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}


