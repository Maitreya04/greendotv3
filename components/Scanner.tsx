"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";

type ScannerProps = {
  onScanSuccess: (barcode: string) => void;
  className?: string;
};

const ScannerInner: React.FC<ScannerProps> = ({ onScanSuccess, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerId = useId().replace(/[:]/g, "_");
  const html5QrcodeRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "error" | "success">("loading");
  const hasDecodedRef = useRef(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [canFlip, setCanFlip] = useState<boolean>(false);
  const currentDeviceIdRef = useRef<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);

  // Keep scanner box size in sync with html5-qrcode qrbox
  const SCAN_BOX = { width: 280, height: 140 } as const;

  const stopScanner = async () => {
    try {
      if (html5QrcodeRef.current) {
        await html5QrcodeRef.current.stop();
        await html5QrcodeRef.current.clear();
        html5QrcodeRef.current = null;
      }
    } catch (_e) {
      // swallow stop errors
    }
  };

  const startScanner = async () => {
    setStatus("loading");
    try {
      // Stop any running session before starting a new one to avoid duplicate feeds
      await stopScanner();
      // Request camera permissions early and prefer the rear camera on mobile.
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const permissionStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        permissionStream.getTracks().forEach((t) => t.stop());
      }

      const { Html5Qrcode } = await import("html5-qrcode");

      if (!containerRef.current) throw new Error("Container not mounted");

      // Ensure a mount element exists with a stable id for html5-qrcode
      let mountEl = containerRef.current.querySelector<HTMLDivElement>(`#${scannerId}`);
      if (!mountEl) {
        mountEl = document.createElement("div");
        mountEl.id = scannerId;
        mountEl.className = "w-full h-full";
        containerRef.current.appendChild(mountEl);
      }

      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(scannerId, false);
      }
      // Choose device explicitly if possible (iOS sometimes ignores facingMode)
      let startConfig: any = null;
      try {
        const cameras = await (Html5Qrcode as any).getCameras();
        setCanFlip(Array.isArray(cameras) && cameras.length > 1);
        if (Array.isArray(cameras) && cameras.length > 0) {
          const isEnv = facingMode === "environment";
          const match = cameras.find((c: any) =>
            isEnv ? /back|rear|environment/i.test(c.label) : /front|user|face/i.test(c.label)
          );
          const target = match ?? (isEnv ? cameras[cameras.length - 1] : cameras[0]);
          if (target?.id) {
            currentDeviceIdRef.current = target.id;
            startConfig = { deviceId: { exact: target.id } };
          }
        }
      } catch (_e) {
        // ignore enumerate errors and fall back to facingMode
      }
      if (!startConfig) {
        startConfig = { facingMode } as any;
      }
      const config = {
        fps: 10,
        qrbox: { width: SCAN_BOX.width, height: SCAN_BOX.height },
        aspectRatio: 1.7777778,
      } as any;

      const onSuccess = async (decodedText: string) => {
        if (hasDecodedRef.current) return; // ignore subsequent decodes
        hasDecodedRef.current = true;
        setStatus("success");
        // Haptic feedback where supported
        try {
          if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
            (navigator as any).vibrate(30);
          }
        } catch (_h) {
          // ignore haptic errors
        }
        // Stop scanning then transition quickly to results
        try {
          await stopScanner();
        } catch (_s) {
          // ignore stop errors
        }
        setTimeout(() => {
          onScanSuccess(decodedText);
        }, 650);
      };

      const onError = (_: string) => {
        // per-frame decode errors are expected; ignore
      };

      await html5QrcodeRef.current.start(startConfig, config, onSuccess, onError);
      setStatus("scanning");
    } catch (_e) {
      await stopScanner();
      setStatus("error");
    }
  };

  useEffect(() => {
    hasDecodedRef.current = false;
    startScanner();
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss instructions shortly after scanning starts
  useEffect(() => {
    if (status === "scanning") {
      setShowInstructions(true);
      const t = setTimeout(() => setShowInstructions(false), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const retry = () => {
    void startScanner();
  };

  return (
    <div className={`relative text-gray-900 ${className ?? ""}`}>
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 to-teal-50" />
      <div className="relative z-10 flex min-h-screen w-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl">
          {/* Camera feed mount */}
          <div ref={containerRef} className="absolute inset-0 bg-black">
            {status === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="animate-pulse text-sm text-gray-300">Initializing camera...</div>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
                <div className="text-lg font-medium">Camera not available</div>
                <button
                  type="button"
                  onClick={retry}
                  className="px-4 py-2 rounded-md bg-white text-black hover:bg-gray-200 active:bg-gray-300"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Controls */}
            {canFlip && (
              <button
                type="button"
                aria-label="Flip camera"
                onClick={() => {
                  setFacingMode((m) => (m === "environment" ? "user" : "environment"));
                  void startScanner();
                }}
                className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-emerald-700 shadow backdrop-blur hover:bg-white"
              >
                Flip
              </button>
            )}

            {/* Instruction card */}
            {status === "scanning" && showInstructions && (
              <div className="absolute left-1/2 -translate-x-1/2 top-4 flex items-center gap-2 px-3 py-2 rounded-xl glass-card text-white animate-slide-up">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm5 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <circle cx="12" cy="13" r="2.75" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
                <span className="text-sm font-medium">Point camera at barcode</span>
              </div>
            )}

            {/* Premium scanner overlay */}
            {status !== "error" && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: SCAN_BOX.width, height: SCAN_BOX.height }}
                aria-hidden
              >
                <div className="relative w-full h-full rounded-2xl overflow-visible">
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 rounded-2xl p-[2px]">
                    <div className="absolute inset-0 rounded-2xl scanner-border" />
                    <div className="absolute inset-[2px] rounded-2xl bg-black/40" />
                  </div>
                  {/* Corner brackets */}
                  <div className="absolute inset-0">
                    <span className="absolute left-0 top-0 h-6 w-6 border-t-2 border-l-2 border-emerald-400/90 rounded-tl-md animate-bracket" />
                    <span className="absolute right-0 top-0 h-6 w-6 border-t-2 border-r-2 border-emerald-400/90 rounded-tr-md animate-bracket" />
                    <span className="absolute left-0 bottom-0 h-6 w-6 border-b-2 border-l-2 border-emerald-400/90 rounded-bl-md animate-bracket" />
                    <span className="absolute right-0 bottom-0 h-6 w-6 border-b-2 border-r-2 border-emerald-400/90 rounded-br-md animate-bracket" />
                  </div>
                </div>
              </div>
            )}

            {/* Searching status */}
            {status === "scanning" && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-6 text-center text-sm text-white/90">
                <span className="inline-block animate-search-fade">Searching for barcode...</span>
              </div>
            )}

            {/* Success animation overlay */}
            {status === "success" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500 text-white animate-scale-in shadow-[0_0_0_0_rgba(16,185,129,0.7)] animate-pulse-success">
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scanner-border {
          background: conic-gradient(
            from 0deg,
            rgba(16, 185, 129, 0.0) 0%,
            rgba(16, 185, 129, 0.45) 25%,
            rgba(20, 184, 166, 0.8) 50%,
            rgba(16, 185, 129, 0.45) 75%,
            rgba(16, 185, 129, 0.0) 100%
          );
          filter: blur(6px);
          animation: spin 2.4s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-bracket {
          animation: bracket-pulse 1.2s ease-in-out infinite;
        }
        @keyframes bracket-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .animate-search-fade {
          animation: search-fade 1.6s ease-in-out infinite alternate;
        }
        @keyframes search-fade {
          0% { opacity: 0.45; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default dynamic<ScannerProps>(() => Promise.resolve(ScannerInner), { ssr: false });


