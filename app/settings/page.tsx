"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DietMode } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Github,
  Info,
  Mail,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { del, get } from "idb-keyval";
import pkg from "../../package.json";

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

type ThemeChoice = "light" | "dark" | "system";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
        checked ? "bg-emerald-600" : "bg-stone-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Segmented({ value, onChange }: { value: ThemeChoice; onChange: (v: ThemeChoice) => void }) {
  const options: ThemeChoice[] = ["light", "dark", "system"];
  return (
    <div className="inline-flex rounded-full ring-1 ring-stone-200 bg-stone-100 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs rounded-full transition-colors duration-200 ${
            value === opt ? "bg-emerald-600 text-white" : "text-stone-600 hover:text-stone-800"
          }`}
          aria-pressed={value === opt}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [selectedDiet, setSelectedDiet] = useState<DietMode>("vegetarian");
  const [learnKey, setLearnKey] = useState<DietMode | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [restrictions, setRestrictions] = useState<{ alcohol: boolean; nuts: boolean; gluten: boolean }>({ alcohol: false, nuts: false, gluten: false });
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  // Load persisted
  useEffect(() => {
    try {
      const saved = (typeof window !== "undefined" && window.localStorage.getItem("dietMode")) as DietMode | null;
      if (saved === "vegetarian" || saved === "vegan" || saved === "jain") setSelectedDiet(saved);
    } catch {}
    try {
      const raw = localStorage.getItem("greendot.restrictions");
      if (raw) setRestrictions(JSON.parse(raw));
    } catch {}
    try {
      const t = (localStorage.getItem("greendot.theme") as ThemeChoice | null) || "system";
      setTheme(t);
      applyTheme(t);
    } catch {}
    // history count
    (async () => {
      try {
        const raw = localStorage.getItem("history");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setHistoryCount(arr.length);
        } else {
          const idbData = await get("history");
          if (Array.isArray(idbData)) setHistoryCount(idbData.length);
        }
      } catch {}
    })();
  }, []);

  // Persist
  useEffect(() => {
    try { if (typeof window !== "undefined") localStorage.setItem("dietMode", selectedDiet); } catch {}
  }, [selectedDiet]);
  useEffect(() => {
    try { localStorage.setItem("greendot.restrictions", JSON.stringify(restrictions)); } catch {}
  }, [restrictions]);
  useEffect(() => {
    try { localStorage.setItem("greendot.theme", theme); } catch {}
  }, [theme]);

  const appVersion = useMemo(() => pkg.version ?? "1.0.0", []);

  function showMessage(next: Message) {
    setMessage(next);
    if (next) window.setTimeout(() => setMessage(null), 2500);
  }

  const applyTheme = useCallback((t: ThemeChoice) => {
    try {
      const root = document.documentElement;
      root.classList.remove("dark");
      if (t === "dark") root.classList.add("dark");
      if (t === "system") {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) root.classList.add("dark");
      }
    } catch {}
  }, []);

  function handleChangeTheme(next: ThemeChoice) {
    setTheme(next);
    applyTheme(next);
  }

  async function handleClearCache() {
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((n) => caches.delete(n)));
      }
      showMessage({ kind: "success", text: "Cache cleared" });
    } catch {
      showMessage({ kind: "error", text: "Failed to clear cache" });
    }
  }

  async function handleClearAllData() {
    try {
      // Remove only app-specific keys in localStorage
      const ls = localStorage;
      const keys: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (!k) continue;
        if (/^(greendot\.|history|dietMode)/.test(k)) keys.push(k);
      }
      keys.forEach((k) => ls.removeItem(k));
      try { await del("history"); } catch {}
      showMessage({ kind: "success", text: "All data cleared" });
      setHistoryCount(0);
    } catch {
      showMessage({ kind: "error", text: "Failed to clear data" });
    } finally {
      setConfirmOpen(false);
    }
  }

  function rerunOnboarding(next: DietMode) {
    try { localStorage.removeItem("greendot.onboarding.done"); } catch {}
    try { localStorage.setItem("dietMode", next); } catch {}
    router.push("/");
  }

  return (
    <div className="min-h-screen w-full bg-stone-50 text-stone-900">
      <div className="mx-auto w-full px-4 py-6 sm:max-w-[720px] lg:max-w-[900px]">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-stone-600">Clean, organized controls.</p>
        </header>

        {message && (
          <div
            className={`mb-4 rounded-xl p-3 text-sm shadow-sm ${
              message.kind === "success" ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-900 ring-1 ring-rose-200"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}

        {/* DIET PREFERENCES */}
        <section className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 text-xs font-semibold text-stone-500">DIET PREFERENCES</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DIETS.map((diet) => {
              const selected = selectedDiet === diet.key;
              return (
                <button
                  key={diet.key}
                  type="button"
                  onClick={() => { setSelectedDiet(diet.key); rerunOnboarding(diet.key); }}
                  className={`group relative rounded-2xl p-4 text-left transition-all ring-1 ${
                    selected ? "ring-emerald-500" : "ring-stone-200 hover:ring-stone-300"
                  } bg-white shadow-sm`}
                  aria-pressed={selected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{diet.label}</span>
                        {selected && <Check className="h-4 w-4 text-emerald-600" aria-hidden />}
                      </div>
                      <p className="mt-1 text-sm text-stone-600">{diet.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLearnKey(diet.key); }}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                  >
                    Learn more <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </button>
              );
            })}
          </div>

          {/* Additional Restrictions */}
          <div className="mt-6 rounded-2xl ring-1 ring-stone-200">
            <div className="px-4 py-3 text-xs font-semibold text-stone-500">Additional Restrictions</div>
            <div className="divide-y divide-stone-200">
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <div className="text-sm font-medium">Avoid alcohol</div>
                  <div className="text-xs text-stone-500">Flag products containing ethanol or spirits.</div>
                </div>
                <Switch checked={restrictions.alcohol} onChange={(v) => setRestrictions((s) => ({ ...s, alcohol: v }))} label="Avoid alcohol" />
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <div className="text-sm font-medium">Nut-free</div>
                  <div className="text-xs text-stone-500">Highlight peanuts and tree nuts.</div>
                </div>
                <Switch checked={restrictions.nuts} onChange={(v) => setRestrictions((s) => ({ ...s, nuts: v }))} label="Nut-free" />
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <div>
                  <div className="text-sm font-medium">Gluten-free</div>
                  <div className="text-xs text-stone-500">Warn on wheat, barley, rye, or oats.</div>
                </div>
                <Switch checked={restrictions.gluten} onChange={(v) => setRestrictions((s) => ({ ...s, gluten: v }))} label="Gluten-free" />
              </div>
            </div>
          </div>
        </section>

        {/* APPEARANCE */}
        <section className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-stone-500">APPEARANCE</div>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-stone-400" aria-hidden />
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-stone-500">Light, Dark, or follow System</div>
              </div>
            </div>
            <Segmented value={theme} onChange={handleChangeTheme} />
          </div>
        </section>

        {/* DATA & PRIVACY */}
        <section className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-stone-500">DATA & PRIVACY</div>
          <Link href="/history" className="group flex items-center justify-between py-4 border-b last:border-0 hover:bg-stone-50 rounded-xl px-3 -mx-3 transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-stone-400" aria-hidden />
              <div>
                <div className="text-sm font-medium">Scan History</div>
                <div className="text-xs text-stone-500">{historyCount} scans</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden />
          </Link>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleClearCache}
              className="rounded-xl bg-stone-200 text-stone-700 px-4 py-3 text-sm font-medium hover:bg-stone-300 transition"
            >
              Clear Cache
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-xl bg-red-100 text-red-700 px-4 py-3 text-sm font-semibold hover:bg-red-200 transition"
            >
              Clear All Data
            </button>
          </div>
        </section>

        {/* ABOUT */}
        <section className="mb-24 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-1 text-xs font-semibold text-stone-500">ABOUT</div>

          <div className="divide-y divide-stone-200 rounded-xl ring-1 ring-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm text-stone-600">App version</span>
              <span className="text-sm font-medium">v{appVersion}</span>
            </div>
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50">
              <span className="text-sm text-stone-600">Data source</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">Open Food Facts <ExternalLink className="h-4 w-4" aria-hidden /></span>
            </a>
            <a href="https://github.com/maitreyapatel/greendotv3/blob/main/LICENSE" target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-4 hover:bg-stone-50">
              <span className="text-sm text-stone-600">License</span>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-800">MIT <ExternalLink className="h-4 w-4" aria-hidden /></span>
            </a>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm text-stone-600">Privacy</span>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="h-4 w-4" aria-hidden /> No data collection</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <a href="https://apps.apple.com" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-stone-50 transition cursor-pointer">
              <div className="flex items-center gap-3 text-stone-800"><Star className="h-5 w-5 text-stone-400" aria-hidden /> <span className="text-sm font-medium">Rate on App Store</span></div>
              <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden />
            </a>
            <a href="mailto:?subject=VegWise%20Feedback" className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-stone-50 transition cursor-pointer">
              <div className="flex items-center gap-3 text-stone-800"><Mail className="h-5 w-5 text-stone-400" aria-hidden /> <span className="text-sm font-medium">Report Issue</span></div>
              <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden />
            </a>
            <a href="https://github.com/maitreyapatel/greendotv3" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-stone-50 transition cursor-pointer">
              <div className="flex items-center gap-3 text-stone-800"><Github className="h-5 w-5 text-stone-400" aria-hidden /> <span className="text-sm font-medium">GitHub Repository</span></div>
              <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden />
            </a>
          </div>
        </section>
      </div>

      {/* Diet Learn More Modal */}
      <AnimatePresence>
        {learnKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setLearnKey(null)}
          >
            <motion.div
              initial={{ y: 24, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 24, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-stone-600" aria-hidden />
                <div className="font-semibold">About {DIETS.find((d) => d.key === learnKey)?.label}</div>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
                {DIETS.find((d) => d.key === learnKey)?.details.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setLearnKey(null)} className="rounded-xl bg-stone-900 px-4 py-2 text-sm text-white">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Clear All Data */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setConfirmOpen(false)}
          >
            <div className="absolute inset-0 flex items-end sm:items-center justify-center">
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-auto sm:max-w-md sm:rounded-2xl bg-white p-5 shadow-2xl sm:mx-0 mx-2 rounded-t-2xl"
              >
                <div className="text-base font-semibold">Clear all data?</div>
                <div className="mt-1 text-sm text-stone-600">This resets preferences and removes local history.</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" className="rounded-xl bg-stone-100 px-4 py-2 text-sm" onClick={() => setConfirmOpen(false)}>Cancel</button>
                  <button type="button" className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white" onClick={handleClearAllData}>Yes, clear</button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

