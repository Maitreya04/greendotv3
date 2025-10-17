"use client";

import React, { useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Leaf,
  Flame,
  Apple,
} from "lucide-react";
import type { ProductResult } from "@/types";
import { analyzeIngredients } from "@/lib/analyze";

type Props = {
  result: ProductResult;
  onBack: () => void;
};

function DietIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle size={20} className="text-green-600" />
  ) : (
    <XCircle size={20} className="text-red-600" />
  );
}

function sugarStatus(sugars?: number) {
  if (sugars == null) return { label: "Unknown sugar", tone: "gray" as const };
  if (sugars < 5) return { label: "Low sugar", tone: "green" as const };
  if (sugars < 15) return { label: "Moderate sugar", tone: "yellow" as const };
  return { label: "High sugar", tone: "red" as const };
}

export default function ResultLight({ result, onBack }: Props) {
  const vegan = analyzeIngredients(result.ingredientsText || "", "vegan");
  const vegetarian = analyzeIngredients(result.ingredientsText || "", "vegetarian");
  const jain = analyzeIngredients(result.ingredientsText || "", "jain");

  const isVegan = vegan.verdict === "yes";
  const isVegetarian = vegetarian.verdict === "yes";
  const isJain = jain.verdict === "yes";

  const sugars = result.nutrition?.sugars;
  const kcal = result.nutrition?.calories;
  const protein = result.nutrition?.protein;

  const sugarChip = useMemo(() => sugarStatus(sugars), [sugars]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F9FC] to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={20} className="text-gray-700" />
            <span className="text-gray-700 font-medium">Back to Scan</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full grid place-items-center bg-gradient-to-br from-[#6E37FF] to-[#B25CFF]">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Product Header */}
        <div className="bg-white rounded-3xl p-8 mb-6 border border-gray-200 shadow-lg">
          <div className="flex flex-col md:flex-row gap-6">
            {!!result.image && (
              <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.image} alt={result.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-100 text-purple-700">
                International
              </div>
              <h1 className="text-3xl font-bold text-black mb-2">{result.name}</h1>
              {!!result.brand && (
                <p className="text-lg text-gray-600 mb-4">by {result.brand}</p>
              )}
              <p className="text-sm text-gray-500">Barcode: {result.barcode}</p>
            </div>
          </div>
        </div>

        {/* Dietary Compatibility */}
        <div className="bg-white rounded-3xl p-8 mb-6 border border-gray-200 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Leaf size={24} className="text-green-600" />
            <h2 className="text-2xl font-bold text-black">Dietary Compatibility</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border-2 ${isVegetarian ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-black">Vegetarian</span>
                <DietIcon ok={isVegetarian} />
              </div>
              <p className="text-sm text-gray-600">
                {isVegetarian ? "Safe for vegetarians" : "Contains animal products"}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border-2 ${isVegan ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-black">Vegan</span>
                <DietIcon ok={isVegan} />
              </div>
              <p className="text-sm text-gray-600">
                {isVegan ? "Suitable for vegans" : "Contains animal-derived ingredients"}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border-2 ${isJain ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-black">Jain-Friendly</span>
                <DietIcon ok={isJain} />
              </div>
              <p className="text-sm text-gray-600">
                {isJain ? "Follows Jain dietary guidelines" : "May contain restricted ingredients"}
              </p>
            </div>
          </div>
        </div>

        {/* Nutrition Facts */}
        <div className="bg-white rounded-3xl p-8 mb-6 border border-gray-200 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Apple size={24} className="text-purple-600" />
            <h2 className="text-2xl font-bold text-black">Nutrition Facts</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Per 100g / 100ml</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} className="text-orange-600" />
                <span className="text-xs text-gray-600">Calories</span>
              </div>
              <p className="text-2xl font-bold text-black">{kcal ?? "N/A"}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
              <span className="text-xs text-gray-600 block mb-2">Protein</span>
              <p className="text-2xl font-bold text-black">{protein ?? "N/A"}</p>
              <p className="text-xs text-gray-500">g</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100">
              <span className="text-xs text-gray-600 block mb-2">Carbs</span>
              <p className="text-2xl font-bold text-black">N/A</p>
              <p className="text-xs text-gray-500">g</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100">
              <span className="text-xs text-gray-600 block mb-2">Fat</span>
              <p className="text-2xl font-bold text-black">N/A</p>
              <p className="text-xs text-gray-500">g</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Sugars</span>
                <p className="font-semibold text-black">{sugars ?? "N/A"} g</p>
              </div>
              <div>
                <span className="text-gray-500">Fiber</span>
                <p className="font-semibold text-black">N/A g</p>
              </div>
              <div>
                <span className="text-gray-500">Saturated Fat</span>
                <p className="font-semibold text-black">N/A g</p>
              </div>
              <div>
                <span className="text-gray-500">Sodium</span>
                <p className="font-semibold text-black">N/A g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Special Dietary Info */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 mb-6 border border-purple-200">
          <h2 className="text-xl font-bold text-black mb-4">Special Dietary Information</h2>
          <div className="flex flex-wrap gap-3">
            <div
              className={[
                "px-4 py-2 rounded-full text-sm font-medium",
                sugarChip.tone === "green" && "bg-green-100 text-green-700",
                sugarChip.tone === "yellow" && "bg-yellow-100 text-yellow-700",
                sugarChip.tone === "red" && "bg-red-100 text-red-700",
                sugarChip.tone === "gray" && "bg-gray-100 text-gray-700",
              ].filter(Boolean).join(" ")}
            >
              {sugarChip.label}
            </div>

            {Array.isArray(result.allergens) && result.allergens.length > 0 && (
              <div className="px-4 py-2 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                Contains: {result.allergens.join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-3xl p-8 mb-8 border border-gray-200 shadow-lg">
          <h2 className="text-2xl font-bold text-black mb-4">Ingredients</h2>
          <div className="p-4 rounded-xl bg-purple-50">
            <p className="text-sm text-gray-600 mb-2">Listed:</p>
            <p className="text-gray-700">
              {result.ingredientsText || "No ingredients information provided"}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-8 py-4 rounded-full font-semibold text-white text-center transition-all duration-150 hover:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #6E37FF 0%, #B25CFF 100%)" }}
          >
            Scan Another Product
          </button>
        </div>
      </main>
    </div>
  );
}


