"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DietMode, ProductResult as TypesProductResult } from "@/types";
import ResultCard from "@/components/ResultCard";
import { analyzeIngredients, normalizeIngredients } from "@/lib/analyze";

type Props = {
  open: boolean;
  onClose: () => void;
  dietMode: DietMode;
};

type Selection = { x: number; y: number; w: number; h: number } | null;

export default function PhotoUpload({ open, onClose, dietMode }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [productResult, setProductResult] = useState<TypesProductResult | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const revokeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (revokeUrlRef.current) {
        try { URL.revokeObjectURL(revokeUrlRef.current); } catch {}
        revokeUrlRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setDragActive(false);
    setImageUrl(null);
    setSelection(null);
    setIsDrawing(false);
    setProcessing(false);
    setProgress(0);
    setOcrText(null);
    setProductResult(null);
    if (revokeUrlRef.current) {
      try { URL.revokeObjectURL(revokeUrlRef.current); } catch {}
      revokeUrlRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const onFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!/^image\/(png|jpeg)$/i.test(f.type)) return;
    const url = URL.createObjectURL(f);
    revokeUrlRef.current = url;
    setImageUrl(url);
    setSelection(null);
    setOcrText(null);
    setProductResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files) onFiles(e.dataTransfer.files);
  }, [onFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const startDraw = useCallback((clientX: number, clientY: number) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.min(Math.max(clientX - box.left, 0), box.width);
    const y = Math.min(Math.max(clientY - box.top, 0), box.height);
    setSelection({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  }, []);

  const moveDraw = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing || !selection) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const clampedX = Math.min(Math.max(clientX - box.left, 0), box.width);
    const clampedY = Math.min(Math.max(clientY - box.top, 0), box.height);
    const w = clampedX - selection.x;
    const h = clampedY - selection.y;
    setSelection({ x: selection.x, y: selection.y, w, h });
  }, [isDrawing, selection]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => startDraw(e.clientX, e.clientY), [startDraw]);
  const onMouseMove = useCallback((e: React.MouseEvent) => moveDraw(e.clientX, e.clientY), [moveDraw]);
  const onMouseUp = useCallback(() => endDraw(), [endDraw]);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]; if (t) startDraw(t.clientX, t.clientY);
  }, [startDraw]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]; if (t) moveDraw(t.clientX, t.clientY);
  }, [moveDraw]);
  const onTouchEnd = useCallback(() => endDraw(), [endDraw]);

  const hasValidSelection = useMemo(() => {
    if (!selection) return false;
    return Math.abs(selection.w) > 10 && Math.abs(selection.h) > 10;
  }, [selection]);

  const cropToBlob = useCallback(async (): Promise<Blob | null> => {
    const img = imgRef.current;
    const box = containerRef.current;
    if (!img || !box || !selection) return null;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const display = box.getBoundingClientRect();
    const scaleX = naturalW / display.width;
    const scaleY = naturalH / display.height;
    const sx = Math.round((selection.w >= 0 ? selection.x : selection.x + selection.w) * scaleX);
    const sy = Math.round((selection.h >= 0 ? selection.y : selection.y + selection.h) * scaleY);
    const sw = Math.round(Math.abs(selection.w) * scaleX);
    const sh = Math.round(Math.abs(selection.h) * scaleY);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 0.92);
    });
  }, [selection]);

  const runOcr = useCallback(async () => {
    setProcessing(true);
    setProgress(0);
    try {
      let input: Blob | string | null = null;
      if (hasValidSelection) {
        input = await cropToBlob();
      }
      if (!input) {
        input = imageUrl as string;
      }
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: any) => {
          if (m.status && typeof m.progress === "number") {
            setProgress(Math.max(0, Math.min(1, m.progress)));
          }
        },
      } as any);
      const { data } = await worker.recognize(input as any);
      const text = (data?.text || "").trim();
      try { await worker.terminate(); } catch {}
      setOcrText(text);
      const analysis = analyzeIngredients(text, dietMode);
      const now = new Date().toISOString();
      const product: TypesProductResult = {
        barcode: "manual",
        name: "Manual Entry",
        brand: "",
        image: imageUrl ?? "",
        ingredientsText: text,
        ingredientsNormalized: normalizeIngredients(text),
        analysis: {
          verdict: analysis.verdict,
          confidence: analysis.confidence,
          reasons: analysis.reasons,
        },
        allergens: analysis.allergens,
        nutrition: undefined,
        metadata: { scannedAt: now, source: "manual" },
      };
      setProductResult(product);
    } catch (_e) {
      setOcrText("");
    } finally {
      setProcessing(false);
      setProgress(1);
    }
  }, [dietMode, imageUrl, cropToBlob, hasValidSelection]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Container: bottom sheet on mobile, centered modal on desktop */}
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto w-full sm:inset-0 sm:flex sm:items-center sm:justify-center"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="relative mx-auto w-full max-w-2xl rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold text-gray-900">Upload ingredient photo</div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md bg-white px-2 py-1 text-sm text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {/* Dropzone or preview */}
              {!imageUrl && (
                <label
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition " +
                    (dragActive ? "border-emerald-400 bg-emerald-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100")
                  }
                >
                  <div className="text-3xl" aria-hidden>📷</div>
                  <div className="text-sm font-medium text-gray-900">Upload ingredient photo</div>
                  <div className="text-xs text-gray-600">Drag and drop or click to choose</div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              )}

              {imageUrl && !productResult && (
                <div className="space-y-3">
                  <div
                    ref={containerRef}
                    className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-black/5"
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img ref={imgRef} src={imageUrl} alt="Selected" className="max-h-[50vh] w-full object-contain" />
                    {selection && (
                      <div
                        className="absolute border-2 border-emerald-400 bg-emerald-200/10 backdrop-blur-[0.5px]"
                        style={{
                          left: `${Math.min(selection.x, selection.x + selection.w)}px`,
                          top: `${Math.min(selection.y, selection.y + selection.h)}px`,
                          width: `${Math.abs(selection.w)}px`,
                          height: `${Math.abs(selection.h)}px`,
                        }}
                      />
                    )}
                    {!selection && (
                      <div className="pointer-events-none absolute inset-0 grid place-items-center">
                        <div className="rounded-md bg-black/40 px-2 py-1 text-xs text-white">Drag to select crop area</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelection(null)}
                      className="rounded-md bg-white px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                    >
                      Reset selection
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImageUrl(null)}
                        className="rounded-md bg-white px-3 py-2 text-sm text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                      >
                        Choose another
                      </button>
                      <button
                        type="button"
                        disabled={processing}
                        onClick={runOcr}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {processing ? "Processing..." : "Crop & Analyze"}
                      </button>
                    </div>
                  </div>

                  {processing && (
                    <div
                      className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress * 100)}
                      aria-label="OCR progress"
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(progress * 100)}%` }}
                        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
                        {Math.round(progress * 100)}%
                      </div>
                    </div>
                  )}

                  {ocrText !== null && !processing && ocrText.length === 0 && (
                    <div className="text-sm text-rose-600">We couldn't read the text. Try a clearer photo.</div>
                  )}
                </div>
              )}

              {productResult && (
                <div className="mt-2">
                  <ResultCard
                    result={productResult}
                    onScanAnother={() => {
                      reset();
                      onClose();
                    }}
                    dietMode={dietMode}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


