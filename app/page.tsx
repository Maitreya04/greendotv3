"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ResultCard from "@/components/ResultCard";
import dynamic from "next/dynamic";
import { fetchProduct, type ProductResult as OffProductResult } from "@/lib/offApi";
import { analyzeIngredients, normalizeIngredients, type AnalysisResult } from "@/lib/analyze";
import type { DietMode, ProductResult as TypesProductResult } from "@/types";
import Onboarding from "@/components/Onboarding";
import Link from "next/link";
import { Settings as SettingsIcon } from "lucide-react";

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
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [gateReady, setGateReady] = useState<boolean>(true); // avoid mounting scanner before gate check
  const [scannerStatus, setScannerStatus] = useState<"loading" | "scanning" | "error" | "success">("loading");
  const [greenFlash, setGreenFlash] = useState<boolean>(false);

  const view: ViewState = useMemo(() => {
    // Keep camera view visible during loading; switch to result only when we have data or error
    if (product) return "result";
    if (error) return "error";
    return "scanner";
  }, [error, product]);
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
    setGateReady(true);
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

  // Fire subtle confetti and green flash on successful decode
  useEffect(() => {
    if (scannerStatus === "success") {
      setGreenFlash(true);
      try { if (typeof navigator !== "undefined" && (navigator as any).vibrate) (navigator as any).vibrate(15); } catch {}
      (async () => {
        try {
          const mod = await import("canvas-confetti");
          const confetti = (mod as any).default || mod;
          confetti({ particleCount: 20, spread: 60, origin: { x: 0.5, y: 0.5 }, scalar: 0.7, ticks: 80, colors: ["#10b981", "#34d399", "#a7f3d0"] });
        } catch {}
      })();
      const t = setTimeout(() => setGreenFlash(false), 300);
      return () => clearTimeout(t);
    }
  }, [scannerStatus]);

  // Until gate is checked, don't mount scanner to prevent mobile camera prompt
  if (!gateReady) {
    return (
      <div className="min-h-screen w-full bg-gray-50 text-gray-900" />
    );
  }

  return (
    <div className="min-h-[100svh] w-full bg-black text-white">
      {/* Camera Surface - use Scanner's own overlay and keep it visible */}
      {!showOnboarding && (
        <Scanner
          onScanSuccess={handleScanSuccess}
          onStatusChange={(s) => setScannerStatus(s)}
        />
      )}

      {/* Green success flash */}
      {greenFlash && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-emerald-500/30" />
      )}

      {/* Top Bar */}
      {!showOnboarding && (
        <div className="fixed top-0 left-0 right-0 z-30 pt-[max(0px,env(safe-area-inset-top))]">
          <div className="mx-4 md:mx-auto md:max-w-[900px] mt-3 h-16 rounded-2xl bg-white/80 text-black shadow-sm backdrop-blur-xl ring-1 ring-black/5 flex items-center justify-between px-4">
            <div className="text-xl font-bold select-none">🌱 VegWise</div>
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-xs font-medium ring-1 ring-emerald-200">
                {capitalize(dietMode)}
              </span>
            </div>
            <Link href="/settings" aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-xl text-emerald-700 hover:bg-emerald-50 ring-1 ring-emerald-200">
              <SettingsIcon size={18} />
            </Link>
          </div>
        </div>
      )}

      {/* Remove page-level scanner overlay; rely on Scanner component's overlay */}

      {/* Bottom Card Actions */}
      {!showOnboarding && view === "scanner" && (
        <div className="fixed inset-x-0 bottom-0 z-30 pt-2 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom)))]">
          <div className="mx-4 md:mx-auto md:max-w-[900px] rounded-t-3xl bg-white text-black shadow-2xl ring-1 ring-black/5 p-6">
            {scannerStatus !== "error" && (
              <button
                type="button"
                onClick={() => setUploaderOpen(true)}
                className="w-full h-14 rounded-xl ring-1 ring-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 font-medium transition-transform hover:-translate-y-0.5 shadow-sm"
              >
                <span className="mr-2" aria-hidden>📸</span> Upload Photo
              </button>
            )}
            <div className="mt-3 text-center text-xs text-stone-500">Powered by Open Food Facts</div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {!showOnboarding && view === "result" && uiResult && (
        <ResultCard result={uiResult} onScanAnother={resetAll} dietMode={dietMode} onChangeDietMode={setDietMode} />
      )}

      {/* Uploader overlay */}
      {!showOnboarding && (
        <PhotoUpload
          open={uploaderOpen}
          onClose={() => setUploaderOpen(false)}
          dietMode={dietMode}
        />
      )}

      {/* Onboarding overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-white">
          <Onboarding onComplete={handleOnboardingComplete} />
        </div>
      )}

      {/* Local styles for subtle animations */}
      <style jsx>{`
        .animate-breathe { animation: breathe 1.4s ease-in-out infinite; }
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.05); opacity: 1; } }
        .animate-corner { animation: cornerPulse 1.2s ease-in-out infinite; }
        @keyframes cornerPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .animate-ellipsis { display: inline-block; overflow: hidden; vertical-align: bottom; }
        .animate-ellipsis::after { content: "…"; animation: dots 1.4s steps(4, end) infinite; }
        @keyframes dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } 100% { content: ""; } }
        .animate-shake { animation: shake 450ms ease-in-out 1; }
        @keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-3px); } 40%, 60% { transform: translateX(3px); } }
        [data-ready] { opacity: 1; }
      `}</style>
    </div>
  );
}

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

