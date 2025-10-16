"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ResultCard from "@/components/ResultCard";
import { ResultSkeletonCard } from "@/components/Skeleton";
import dynamic from "next/dynamic";
import { fetchProduct, type ProductResult as OffProductResult } from "@/lib/offApi";
import { analyzeIngredients, normalizeIngredients, type AnalysisResult } from "@/lib/analyze";
import type { DietMode, ProductResult as TypesProductResult } from "@/types";
import Onboarding from "@/components/Onboarding";

type ViewState = "scanner" | "result" | "error";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });
const PhotoUpload = dynamic(() => import("@/components/PhotoUpload"), { ssr: false });

export default function Home() {
  const [scanning, setScanning] = useState<boolean>(true);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<OffProductResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dietMode, setDietMode] = useState<DietMode>("vegetarian");
  const [uploaderOpen, setUploaderOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const view: ViewState = useMemo(() => {
    if (loading) return "result"; // show skeleton in result view while loading
    if (error) return "error";
    if (product) return "result";
    return "scanner";
  }, [loading, error, product]);
  // Onboarding gate
  useEffect(() => {
    try {
      const done = typeof window !== "undefined" ? localStorage.getItem("greendot.onboarding.done") : null;
      if (!done) setShowOnboarding(true);
      // If preferences exist, hydrate default diet
      const raw = typeof window !== "undefined" ? localStorage.getItem("greendot.onboarding") : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { diets?: DietMode[] };
        if (parsed?.diets && parsed.diets.length > 0) {
          const preferred = (parsed.diets[0] ?? "vegetarian") as DietMode;
          setDietMode(preferred);
        }
      }
    } catch {}
  }, []);

  const handleOnboardingComplete = useCallback((prefs?: { diets?: DietMode[] }) => {
    try { if (typeof window !== "undefined") localStorage.setItem("greendot.onboarding.done", "1"); } catch {}
    if (prefs?.diets && prefs.diets.length > 0) {
      setDietMode(prefs.diets[0] as DietMode);
    }
    setShowOnboarding(false);
  }, []);


  const doAnalyze = useCallback(
    (ingredientsText: string | null, mode: DietMode) => {
      if (!ingredientsText) return null;
      try {
        return analyzeIngredients(ingredientsText, mode);
      } catch (_e) {
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (product) {
      const next = doAnalyze(product.ingredientsText, dietMode);
      setAnalysis(next);
    } else {
      setAnalysis(null);
    }
  }, [product, dietMode, doAnalyze]);

  const handleScanSuccess = useCallback(async (scannedText: string) => {
    const code = (scannedText || "").trim();
    if (!code) return;
    setScanning(false);
    setBarcode(code);
    setError(null);
    setLoading(true);
    setProduct(null);
    setAnalysis(null);
    try {
      const p = await fetchProduct(code);
      if (!p) {
        const offline = typeof navigator !== "undefined" && navigator && "onLine" in navigator ? !navigator.onLine : false;
        setError(offline ? "Network error. Check connection and retry." : "Product not found. Try another product or upload photo.");
        setLoading(false);
        return;
      }
      setProduct(p);
      setLoading(false);
    } catch (_e) {
      setError("Network error. Check connection and retry.");
      setLoading(false);
    }
  }, []);

  const retryFetch = useCallback(async () => {
    if (!barcode) return;
    setError(null);
    setLoading(true);
    try {
      const p = await fetchProduct(barcode);
      if (!p) {
        const offline = typeof navigator !== "undefined" && navigator && "onLine" in navigator ? !navigator.onLine : false;
        setError(offline ? "Network error. Check connection and retry." : "Product not found. Try another product or upload photo.");
        setLoading(false);
        return;
      }
      setProduct(p);
      setLoading(false);
    } catch (_e) {
      setError("Network error. Check connection and retry.");
      setLoading(false);
    }
  }, [barcode]);

  const resetAll = useCallback(() => {
    setScanning(true);
    setBarcode(null);
    setProduct(null);
    setAnalysis(null);
    setError(null);
    setLoading(false);
    setUploaderOpen(false);
  }, []);

  const uiResult = useMemo<TypesProductResult | null>(() => {
    if (!product) return null;
    const anal = analysis ?? { verdict: "unsure", confidence: 50, reasons: [], allergens: [] };
    return {
      barcode: product.barcode,
      name: product.name ?? "Unknown Product",
      brand: product.brands ?? "",
      image: product.imageUrl ?? "",
      ingredientsText: product.ingredientsText ?? "",
      ingredientsNormalized: normalizeIngredients(product.ingredientsText ?? ""),
      analysis: {
        verdict: anal.verdict,
        confidence: anal.confidence,
        reasons: anal.reasons,
      },
      allergens: product.allergens ?? [],
      nutrition: product.energyKcalPer100g != null ? { calories: product.energyKcalPer100g } : undefined,
      metadata: {
        scannedAt: new Date().toISOString(),
        source: "OpenFoodFacts",
      },
    };
  }, [product, analysis]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-white">
          <Onboarding onComplete={handleOnboardingComplete} />
        </div>
      )}
      <div className="mx-auto w-full px-4 py-4 sm:max-w-[600px] lg:max-w-[800px]">
        <header className={"mb-4 items-center justify-between gap-3 " + (view === "scanner" ? "hidden sm:flex" : "flex")}>
          <h1 className="text-lg font-semibold">Greendot</h1>
          <DietSelector
            value={dietMode}
            onChange={(m) => setDietMode(m)}
          />
        </header>

        {view === "scanner" && (
          <section>
            <Scanner onScanSuccess={handleScanSuccess} />
            <p className="mt-3 text-center text-sm text-gray-600">
              Point the camera at a barcode to scan.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setUploaderOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100 active:bg-gray-200"
              >
                <span className="text-lg" aria-hidden>🖼️</span>
                <span className="text-sm font-medium">Can't scan? Upload photo</span>
              </button>
            </div>
          </section>
        )}

        {view === "result" && (
          <section>
            <div className="mx-auto w-full sm:max-w-[600px]">
              {loading && <ResultSkeletonCard />}
              {!loading && uiResult && (
                <ResultCard result={uiResult} onScanAnother={resetAll} dietMode={dietMode} />
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetAll}
                className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black active:opacity-90"
              >
                Scan Another
              </button>
              {error && (
                <button
                  type="button"
                  onClick={retryFetch}
                  className="rounded-md bg-white px-4 py-2 text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100 active:bg-gray-200"
                >
                  Retry
                </button>
              )}
            </div>
          </section>
        )}

        {view === "error" && (
          <section>
            <ErrorCard message={error ?? "Something went wrong."} onRetry={retryFetch} onReset={resetAll} />
          </section>
        )}

        {/* Uploader overlay */}
        <PhotoUpload
          open={uploaderOpen}
          onClose={() => setUploaderOpen(false)}
          dietMode={dietMode}
        />
      </div>
    </div>
  );
}

function DietSelector({ value, onChange }: { value: DietMode; onChange: (m: DietMode) => void }) {
  const options: { key: DietMode; label: string }[] = [
    { key: "vegetarian", label: "Veg" },
    { key: "vegan", label: "Vegan" },
    { key: "jain", label: "Jain" },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gray-200 p-1">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={
              "px-3 py-1 text-sm rounded-full transition-colors " +
              (active ? "bg-white text-gray-900 shadow" : "text-gray-700 hover:bg-white/60")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ErrorCard({ message, onRetry, onReset }: { message: string; onRetry: () => void; onReset: () => void }) {
  const isNetwork = /network/i.test(message);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
      <div className="mb-2 text-base font-semibold">We couldn't load that</div>
      <div className="mb-4 text-sm text-gray-700">{message}</div>
      <div className="flex items-center justify-center gap-3">
        {isNetwork && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black active:opacity-90"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-md bg-white px-4 py-2 text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100 active:bg-gray-200"
        >
          Scan Another
        </button>
      </div>
      {!isNetwork && (
        <div className="mt-3 text-xs text-gray-500">Tip: Try another product or upload a clear photo of the ingredients.</div>
      )}
    </div>
  );
}

