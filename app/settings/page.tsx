"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DietMode } from "@/types";
import {
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Info,
  Shield,
  Trash2,
} from "lucide-react";
import { del, get } from "idb-keyval";
import pkg from "../../package.json"; // safe to import JSON (tsconfig resolveJsonModule)

type Message = { kind: "success" | "error"; text: string } | null;

const DIETS: Array<{
  key: DietMode;
  label: string;
  description: string;
  details: string[];
}> = [
  {
    key: "vegetarian",
    label: "Vegetarian",
    description: "No meat or fish. Dairy and eggs may be allowed.",
    details: [
      "Excludes meat, poultry, fish, and seafood.",
      "Allows dairy and eggs unless specified otherwise.",
      "Watch for gelatin, rennet, and animal-based additives.",
    ],
  },
  {
    key: "vegan",
    label: "Vegan",
    description: "Excludes all animal-derived ingredients.",
    details: [
      "No meat, dairy, eggs, or honey.",
      "Avoid whey, casein, lactose, and animal glycerin.",
      "Check E-numbers and flavorings for animal sources.",
    ],
  },
  {
    key: "jain",
    label: "Jain",
    description: "Strict vegetarian; excludes roots and certain microbes.",
    details: [
      "No meat, fish, eggs, or root vegetables (e.g., onion, garlic, potato).",
      "Avoid ingredients from microbial fermentation where applicable.",
      "Check stabilizers and enzymes for animal or microbial origin.",
    ],
  },
];

export default function SettingsPage() {
  const [selectedDiet, setSelectedDiet] = useState<DietMode>("vegetarian");
  const [expandedDietKey, setExpandedDietKey] = useState<DietMode | null>(null);
  const [message, setMessage] = useState<Message>(null);

  // Load saved diet preference
  useEffect(() => {
    try {
      const saved = (typeof window !== "undefined" && window.localStorage.getItem("dietMode")) as DietMode | null;
      if (saved === "vegetarian" || saved === "vegan" || saved === "jain") {
        setSelectedDiet(saved);
      }
    } catch (_e) {
      // noop
    }
  }, []);

  // Persist diet preference
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dietMode", selectedDiet);
      }
    } catch (_e) {
      // noop
    }
  }, [selectedDiet]);

  const appVersion = useMemo(() => pkg.version ?? "0.0.0", []);

  function showMessage(next: Message) {
    setMessage(next);
    if (next) {
      window.setTimeout(() => setMessage(null), 2500);
    }
  }

  async function handleClearHistory() {
    const confirm = window.confirm("Clear all history? This cannot be undone.");
    if (!confirm) return;
    try {
      // Clear common localStorage keys that might store history
      try {
        const ls = window.localStorage;
        const keysToRemove: string[] = [];
        for (let i = 0; i < ls.length; i++) {
          const key = ls.key(i);
          if (!key) continue;
          if (/history/i.test(key)) keysToRemove.push(key);
        }
        keysToRemove.forEach((k) => ls.removeItem(k));
        // Specific key used by this app if present
        ls.removeItem("history");
      } catch (_e) {
        // ignore localStorage errors
      }

      // Clear history entry from IndexedDB default store (if used)
      try {
        await del("history");
      } catch (_e) {
        // ignore idb errors
      }

      showMessage({ kind: "success", text: "History cleared" });
    } catch (_e) {
      showMessage({ kind: "error", text: "Failed to clear history" });
    }
  }

  async function handleClearCache() {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((n) => caches.delete(n)));
      }
      showMessage({ kind: "success", text: "Cache cleared" });
    } catch (_e) {
      showMessage({ kind: "error", text: "Failed to clear cache" });
    }
  }

  async function handleExportHistory() {
    try {
      // Prefer structured history from localStorage 'history'; fallback to IndexedDB
      let data: unknown = [];
      try {
        const raw = window.localStorage.getItem("history");
        if (raw) {
          data = JSON.parse(raw);
        }
      } catch (_e) {
        // ignore parse errors
      }
      if (Array.isArray(data) && data.length === 0) {
        try {
          const idbData = await get("history");
          if (idbData != null) {
            data = idbData;
          }
        } catch (_e) {
          // ignore idb errors
        }
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `greendot-history-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showMessage({ kind: "success", text: "History exported" });
    } catch (_e) {
      showMessage({ kind: "error", text: "Failed to export history" });
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <div className="mx-auto w-full px-4 py-6 sm:max-w-[720px] lg:max-w-[900px]">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-gray-600">Customize your experience and manage the app.</p>
        </header>

        {message && (
          <div
            className={
              "mb-4 rounded-lg border p-3 text-sm " +
              (message.kind === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-300 bg-rose-50 text-rose-900")
            }
            role="status"
          >
            {message.text}
          </div>
        )}

        {/* Diet Profile */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-700" aria-hidden />
            <h2 className="text-base font-semibold">Diet Profile</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DIETS.map((diet) => {
              const selected = selectedDiet === diet.key;
              const expanded = expandedDietKey === diet.key;
              return (
                <button
                  key={diet.key}
                  type="button"
                  onClick={() => setSelectedDiet(diet.key)}
                  className={
                    "group relative rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors " +
                    (selected ? "border-emerald-500" : "border-gray-200 hover:border-gray-300")
                  }
                  aria-pressed={selected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{diet.label}</span>
                        {selected && <Check className="h-4 w-4 text-emerald-600" aria-label="Selected" />}
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{diet.description}</p>
                    </div>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDietKey(expanded ? null : diet.key);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                      Learn more
                      <ChevronDown
                        className={"h-3.5 w-3.5 transition-transform " + (expanded ? "rotate-180" : "")}
                        aria-hidden
                      />
                    </button>
                  </div>
                  {expanded && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {diet.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* About */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-700" aria-hidden />
            <h2 className="text-base font-semibold">About</h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">App version</span>
                <span className="text-sm font-medium">{appVersion}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Data source</span>
                <a
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                  href="https://world.openfoodfacts.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Food Facts <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">GitHub</span>
                <a
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                  href="https://github.com/maitreyapatel/greendotv3"
                  target="_blank"
                  rel="noreferrer"
                >
                  Repository <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Privacy</span>
                <span className="text-sm font-medium">No data collected</span>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-700" aria-hidden />
            <h2 className="text-base font-semibold">Advanced</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleClearHistory}
              className="rounded-2xl border border-rose-300 bg-white p-4 text-left text-rose-800 shadow-sm hover:bg-rose-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">Clear history</div>
                  <div className="mt-1 text-sm text-rose-700">Remove all past scans from this device.</div>
                </div>
                <Trash2 className="h-5 w-5" aria-hidden />
              </div>
            </button>

            <button
              type="button"
              onClick={handleClearCache}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">Clear cache</div>
                  <div className="mt-1 text-sm text-gray-700">Free up space by clearing stored files.</div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M3 6h18M8 6V4h8v2m-9 4h10l-1 10H7L6 10z" />
                </svg>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportHistory}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">Export history (JSON)</div>
                  <div className="mt-1 text-sm text-gray-700">Download your scan history as a file.</div>
                </div>
                <Download className="h-5 w-5" aria-hidden />
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}


