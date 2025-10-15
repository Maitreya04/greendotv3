"use client";

import React from "react";
import type { ProductResult as VegWiseProductResult } from "@/types";

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
      bg: "bg-green-100",
      fg: "text-green-800",
      ring: "ring-green-200",
    } as const;
  }
  if (verdict === "no") {
    return {
      emoji: "❌",
      text: "Not suitable",
      bg: "bg-red-100",
      fg: "text-red-800",
      ring: "ring-red-200",
    } as const;
  }
  return {
    emoji: "⚠️",
    text: "Check carefully",
    bg: "bg-yellow-100",
    fg: "text-yellow-800",
    ring: "ring-yellow-200",
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

export default function ResultCard({ result, onScanAnother, dietMode }: Props) {
  const name = result.name || "Unknown Product";
  const barcode = result.barcode;
  const verdict = result.analysis.verdict;
  const meta = verdictMeta(verdict);

  // Support both shapes just in case: prefer nested analysis.reasons
  const reasons = (result as any).reasons ?? result.analysis.reasons ?? [];

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* 1) Product name + barcode */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{name}</div>
          <div className="mt-0.5 text-sm text-gray-600">Barcode: {barcode}</div>
        </div>
        <div className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${meta.bg} ${meta.fg} ring-1 ${meta.ring}`}>
          <span className="mr-2" aria-hidden>
            {meta.emoji}
          </span>
          {meta.text}
        </div>
      </div>

      {/* Optional image if present */}
      {result.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result.image}
          alt={name}
          className="mb-3 h-40 w-full rounded-md object-cover"
        />
      )}

      {/* 3) Reasons */}
      <div className="mb-3">
        <div className="mb-1 text-sm font-medium text-gray-800">Reasons</div>
        {Array.isArray(reasons) && reasons.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {reasons.map((r: any, idx: number) => {
              const isBlocking = r?.severity === "blocking";
              const color = isBlocking ? "text-red-700" : "text-yellow-700";
              const ingredient = r?.ingredient ?? "Unknown";
              const category = r?.category ?? "ingredient";
              return (
                <li key={idx} className={color}>
                  {/* Contains {ingredient} ({category}) */}
                  Contains {ingredient} ({category})
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-gray-600">No specific issues detected.</div>
        )}
      </div>

      {/* 4) Allergens */}
      <div className="mb-3">
        <div className="mb-1 text-sm font-medium text-gray-800">Allergens</div>
        {result.allergens && result.allergens.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.allergens.map((a) => {
              const key = String(a).toLowerCase().replace(/^en:/, "");
              const emoji = ALLERGEN_ICON[key] || "⚠️";
              return (
                <span
                  key={`${key}`}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800 ring-1 ring-gray-200"
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

      {/* 5) Ingredients */}
      <div className="mb-4">
        <div className="mb-1 text-sm font-medium text-gray-800">Ingredients</div>
        <div className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-700">
          {result.ingredientsText || "No ingredients info available."}
        </div>
      </div>

      {/* 6) Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onScanAnother}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black active:opacity-90"
        >
          Scan Another Product
        </button>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <a
            href={`mailto:support@greendot.app?subject=${encodeURIComponent("Issue with " + barcode)}&body=${encodeURIComponent(
              `Please describe the issue and suggest a fix.\n\n` +
                `Barcode: ${barcode}\n` +
                `Name: ${name}\n` +
                `Diet mode: ${dietMode ?? "unknown"}\n` +
                `Verdict: ${verdict}\n` +
                `Reasons: ${JSON.stringify(reasons)}\n` +
                `Ingredients: ${result.ingredientsText}\n` +
                `OFF link: https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}\n` +
                `Suggested Jain rule change: `
            )}`}
            className="text-sm text-gray-600 underline hover:text-gray-800"
          >
            Report Issue
          </a>
          <a
            href={`mailto:support@greendot.app?subject=${encodeURIComponent("Suggest Jain rule update for " + barcode)}&body=${encodeURIComponent(
              `I would like to suggest a Jain dietary rule update.\n\n` +
                `Context:\n` +
                `- Barcode: ${barcode}\n` +
                `- Name: ${name}\n` +
                `- Ingredients: ${result.ingredientsText}\n` +
                `- OFF link: https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}\n\n` +
                `Current analysis:\n` +
                `- Diet mode: ${dietMode ?? "jain"}\n` +
                `- Verdict: ${verdict}\n` +
                `- Reasons: ${JSON.stringify(reasons)}\n\n` +
                `My suggested rule change (add/remove terms, categories, patterns):\n- `
            )}`}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            Suggest Jain Rule Update
          </a>
        </div>
      </div>

      {/* 7) Source citation */}
      <div className="mt-3 text-xs text-gray-500">
        Data source:
        {" "}
        <a
          href={`https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700"
        >
          Open Food Facts
        </a>
        . Ingredients and nutrition are sourced from OFF; dietary analysis is computed locally.
      </div>
    </div>
  );
}


