"use client";

import React from "react";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductResult as VegWiseProductResult, Reason as VegWiseReason } from "@/types";

type Props = {
  result: VegWiseProductResult;
  onScanAnother: () => void;
  dietMode?: "vegetarian" | "vegan" | "jain";
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

const ALLERGEN_ICON: Record<string, string> = {
  milk: "🥛",
  lactose: "🥛",
  gluten: "🌾",
  wheat: "🌾",
  egg: "🥚",
  eggs: "🥚",
  peanut: "🥜",
  peanuts: "🥜",
  "tree nuts": "🌰",
  almond: "🌰",
  hazelnut: "🌰",
  walnut: "🌰",
  soy: "🌱",
  soya: "🌱",
  fish: "🐟",
  shellfish: "🦐",
  crustacean: "🦐",
  sesame: "⚪️",
};

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      duration: 0.5,
      stiffness: 240,
      damping: 24,
      staggerChildren: 0.08,
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

  const reasons = (result as any).reasons ?? result.analysis.reasons ?? [];
  const [expanded, setExpanded] = useState(false);

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

  // Trigger a subtle confetti burst when verdict is 'yes'
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
        confetti({
          particleCount: 80,
          spread: 70,
          startVelocity: 38,
          gravity: 1.1,
          ticks: 120,
          scalar: 0.8,
          origin: { y: 0.2 },
        });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [verdict]);

  return (
    <motion.div
      layout
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md"
    >
      {/* 1) Product Image Hero */}
      <motion.div variants={itemVariants} className="relative">
        <div className="relative h-56 w-full overflow-hidden rounded-t-2xl bg-gray-100">
          {result.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-sm text-gray-500">No image available</span>
            </div>
          )}
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${meta.gradient}`}></div>

          {/* Product name overlay */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-4">
            <div className="truncate text-xl font-semibold text-white drop-shadow-sm">{name}</div>
            <div className="mt-0.5 text-xs text-white/80">Barcode: {barcode}</div>
          </div>

          {/* Floating verdict badge */}
          <motion.div
            className="absolute right-4 top-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
          >
            <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${meta.bg} ${meta.fg} ring-1 ${meta.ring} shadow-md backdrop-blur-sm`}>
              <span className="text-xl" aria-hidden>{meta.emoji}</span>
              <span className="hidden sm:block">{meta.text}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 2) Verdict Section */}
      <motion.div variants={itemVariants} className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="text-[4rem] leading-none" aria-hidden>{meta.emoji}</div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{meta.text}</div>
            <div className="text-sm text-gray-500">Confidence</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
            <motion.div
              className={`h-full ${meta.bar}`}
              initial={{ width: 0 }}
              animate={{ width: progressWidth }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600">{confidence}%</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3) Flagged Ingredients */}
      <motion.div variants={itemVariants} className="px-4 pt-4">
        <div className="mb-2 text-sm font-semibold text-gray-900">Ingredients</div>
        <div className="relative">
          <AnimatePresence initial={false}>
            <motion.div
              key={expanded ? "expanded" : "collapsed"}
              initial={{ height: 96, opacity: 1 }}
              animate={{ height: expanded ? "auto" : 96 }}
              exit={{ height: 96 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800"
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {highlighted}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-2 flex justify-end">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExpanded((v) => !v)}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 shadow-sm"
            >
              {expanded ? "Show less" : "Show full"}
            </motion.button>
          </div>
        </div>

        {Array.isArray(reasons) && reasons.length > 0 ? (
          <motion.ul
            className="mt-3 grid gap-1 text-sm text-gray-700"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.2 }}
          >
            {(reasons as VegWiseReason[]).map((r, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${r.severity === "blocking" ? "bg-rose-500" : "bg-amber-500"}`}></span>
                <span className={`capitalize ${categoryColor(r.category).replace("text-", "text-")}`}>
                  Contains {r.ingredient} ({r.category})
                </span>
              </li>
            ))}
          </motion.ul>
        ) : (
          <div className="mt-2 text-sm text-gray-600">No specific issues detected.</div>
        )}
      </motion.div>

      {/* 4) Info Cards Grid */}
      <motion.div
        variants={itemVariants}
        className="px-4 pt-4"
        transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.3 }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Allergens card */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="mb-2 text-sm font-semibold text-gray-900">Allergens</div>
            {result.allergens && result.allergens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.allergens.map((a) => {
                  const key = String(a).toLowerCase().replace(/^en:/, "");
                  const emoji = ALLERGEN_ICON[key] || "⚠️";
                  return (
                    <span
                      key={`${key}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-800 ring-1 ring-gray-200"
                    >
                      <span aria-hidden>{emoji}</span>
                      <span className="capitalize">{key}</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600">None declared</div>
            )}
          </div>

          {/* Nutrition card */}
          {result.nutrition ? (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="mb-2 text-sm font-semibold text-gray-900">Nutrition (per 100g)</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Calories</div>
                  <div className="text-sm font-semibold text-gray-900">{result.nutrition.calories ?? "-"}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Sugars</div>
                  <div className="text-sm font-semibold text-gray-900">{result.nutrition.sugars ?? "-"}g</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <div className="text-xs text-gray-500">Protein</div>
                  <div className="text-sm font-semibold text-gray-900">{result.nutrition.protein ?? "-"}g</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm text-gray-600">Nutrition data not available</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 5) Actions */}
      <div className="pb-20" />
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-white/80 p-2 shadow-xl ring-1 ring-gray-200 backdrop-blur">
          <motion.button
            type="button"
            onClick={onScanAnother}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md"
          >
            Scan Another
          </motion.button>
          <motion.button
            type="button"
            onClick={share}
            aria-label="Share"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-gray-700 ring-1 ring-gray-200 shadow-sm"
          >
            <span aria-hidden>📤</span>
          </motion.button>
          <motion.button
            type="button"
            aria-label="History"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-gray-700 ring-1 ring-gray-200 shadow-sm"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent("openHistory"));
              } catch {}
            }}
          >
            <span aria-hidden>🕘</span>
          </motion.button>
        </div>
      </div>

      {/* 6) Source citation */}
      <motion.div variants={itemVariants} className="px-4 pt-4 pb-6">
        <div className="text-xs text-gray-500">
          Data source: <a href={`https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">Open Food Facts</a>. Ingredients and nutrition are sourced from OFF; dietary analysis is computed locally.
        </div>
      </motion.div>
    </motion.div>
  );
}


