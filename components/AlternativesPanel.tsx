"use client";

import React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { fetchSuggestions, type SuggestionPrefs, type Suggestion } from "@/lib/suggest";
import type { DietMode } from "@/types";
import { typography } from "@/lib/typography";
import { X, Filter, Crown, Leaf, Sprout, Hand, Droplet, Recycle, BadgeCheck, ChevronRight } from "lucide-react";

type Props = {
  barcode: string;
  initialDiet: DietMode;
  onClose: () => void;
};

export default function AlternativesPanel({ barcode, initialDiet, onClose }: Props) {
  const [diet, setDiet] = useState<DietMode>(initialDiet);
  const [avoidAllergens, setAvoidAllergens] = useState<string[]>([]);
  const [palmFree, setPalmFree] = useState<boolean>(false);
  const [labels, setLabels] = useState<Array<"vegan" | "organic" | "halal" | "kosher">>([]);
  const [sort, setSort] = useState<SuggestionPrefs["sort"]>("balanced");
  const [country, setCountry] = useState<string | undefined>(undefined);

  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prefs: SuggestionPrefs = useMemo(() => ({
    diet,
    avoidAllergens,
    palmOilFree: palmFree,
    requiredLabels: labels,
    countryTag: country,
    limit: 8,
    sort: sort || "balanced",
  }), [diet, avoidAllergens, palmFree, labels, country, sort]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetchSuggestions({ code: barcode }, prefs);
        if (!mounted) return;
        setItems(res);
      } catch (e: any) {
        if (!mounted) return;
        setError("Failed to load suggestions");
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [barcode, prefs.diet, prefs.palmOilFree, JSON.stringify(prefs.requiredLabels), JSON.stringify(prefs.avoidAllergens), prefs.countryTag, prefs.sort]);

  const toggleLabel = useCallback((L: "vegan" | "organic" | "halal" | "kosher") => {
    setLabels((arr) => arr.includes(L) ? arr.filter((x) => x !== L) : [...arr, L]);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full h-[90dvh] sm:h-[80vh] sm:max-w-3xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className={`${typography.h4}`}>Diet‑friendly alternatives</div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-stone-200 hover:bg-stone-100"><X size={16} /></button>
        </div>

        {/* Filters */}
        <div className="px-4 pt-3 pb-2 border-b border-stone-100 bg-white/90">
          <div className="mb-2 flex items-center gap-2 text-stone-600"><Filter size={14} /> <span className={typography.caption}>Filters</span></div>
          <div className="flex flex-wrap gap-2">
            <ToggleChip active={diet === "vegan"} onClick={() => setDiet("vegan")} icon={<Leaf size={14} />}>Vegan</ToggleChip>
            <ToggleChip active={diet === "vegetarian"} onClick={() => setDiet("vegetarian")} icon={<Sprout size={14} />}>Vegetarian</ToggleChip>
            <ToggleChip active={diet === "jain"} onClick={() => setDiet("jain")} icon={<Hand size={14} />}>Jain</ToggleChip>

            <span className="w-px h-6 bg-stone-200 mx-1" />
            <ToggleChip active={palmFree} onClick={() => setPalmFree((v) => !v)} icon={<Droplet size={14} />}>No palm oil</ToggleChip>
            <ToggleChip active={labels.includes("organic")} onClick={() => toggleLabel("organic")} icon={<BadgeCheck size={14} />}>Organic</ToggleChip>
            <ToggleChip active={labels.includes("halal")} onClick={() => toggleLabel("halal")} icon={<Crown size={14} />}>Halal</ToggleChip>
            <ToggleChip active={labels.includes("kosher")} onClick={() => toggleLabel("kosher")} icon={<Crown size={14} />}>Kosher</ToggleChip>
            <ToggleChip active={labels.includes("vegan")} onClick={() => toggleLabel("vegan")} icon={<Leaf size={14} />}>Vegan label</ToggleChip>

            <span className="w-px h-6 bg-stone-200 mx-1" />
            <SortSelect value={sort || "balanced"} onChange={setSort} />
          </div>
        </div>

        {/* Results */}
        <div className="h-full overflow-y-auto px-4 pt-3 pb-24">
          {loading && <SkeletonList />}
          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">{error}</div>
          )}
          {!loading && !error && Array.isArray(items) && items.length === 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 text-stone-700 p-3 text-sm">No suggestions found. Try relaxing filters.</div>
          )}
          {!loading && Array.isArray(items) && items.length > 0 && (
            <ul className="grid gap-3">
              {items.map((it) => (
                <li key={it.code} className="rounded-2xl border border-stone-100 bg-white shadow-sm hover:shadow-md transition">
                  <div className="flex gap-3 p-3">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100">
                      {it.image_url ? (
                        <Image src={it.image_url} alt={it.product_name || "Product"} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-stone-400"><Recycle size={18} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{it.product_name || "Unknown"}</div>
                      <div className="truncate text-xs text-stone-500">{it.brands || ""}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <MiniBadge label={`Nutri ${it.deltas.nutri?.to?.toUpperCase?.() || it.nutrition_grades?.toUpperCase?.() || "?"}`} tone="emerald" />
                        {typeof it.nova_group === "number" && <MiniBadge label={`NOVA ${it.nova_group}`} tone="amber" />}
                        {it.ecoscore_grade && <MiniBadge label={`Eco ${it.ecoscore_grade.toUpperCase()}`} tone="teal" />}
                        {it.badges.palmOilFree && <MiniBadge label="No palm oil" tone="sky" />}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-stone-500">
                        {it.deltas.nutri?.from && it.deltas.nutri?.to && <span>Nutri {String(it.deltas.nutri.from).toUpperCase()} → {String(it.deltas.nutri.to).toUpperCase()}</span>}
                        {typeof it.deltas.nova?.from === "number" && typeof it.deltas.nova?.to === "number" && <span>· NOVA {it.deltas.nova.from} → {it.deltas.nova.to}</span>}
                        {it.deltas.sugars100g?.from !== undefined && it.deltas.sugars100g?.to !== undefined && it.deltas.sugars100g.to < it.deltas.sugars100g.from && <span>· Sugars ↓{Math.round(((it.deltas.sugars100g.from - it.deltas.sugars100g.to) / Math.max(1, it.deltas.sugars100g.from)) * 100)}%</span>}
                      </div>
                    </div>
                    <div className="self-center">
                      <a href={`https://world.openfoodfacts.org/product/${encodeURIComponent(it.code)}`} target="_blank" rel="noopener noreferrer" className="grid h-8 px-2 place-items-center rounded-lg bg-emerald-600 text-white text-xs">
                        Open <ChevronRight size={14} />
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="fixed inset-x-0 bottom-0 z-[90] bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-3">
          <div className="mx-auto w-full max-w-3xl flex items-center justify-between">
            <div className={`${typography.caption} text-stone-500`}>Sourced from Open Food Facts</div>
            <a href={`/alternatives/${encodeURIComponent(barcode)}`} className="rounded-lg bg-white ring-1 ring-stone-300 text-stone-900 px-3 py-1.5 text-sm hover:bg-stone-50">See all</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs ring-1 transition ${active ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-50"}`}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
}

function SortSelect({ value, onChange }: { value: NonNullable<SuggestionPrefs["sort"]>; onChange: (v: NonNullable<SuggestionPrefs["sort"]>) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-stone-600">
      Sort
      <select className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs" value={value} onChange={(e) => onChange(e.target.value as any)}>
        <option value="balanced">Balanced</option>
        <option value="nutri">Nutri‑Score</option>
        <option value="nova">NOVA</option>
        <option value="eco">Eco‑Score</option>
        <option value="sugar">Lowest sugar</option>
        <option value="salt">Lowest salt</option>
      </select>
    </label>
  );
}

function MiniBadge({ label, tone }: { label: string; tone: "emerald"|"amber"|"teal"|"sky" }) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ring-1 ${toneMap[tone]}`}>{label}</span>;
}

function SkeletonList() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-stone-100 bg-white shadow-sm p-3">
          <div className="flex gap-3 items-center">
            <div className="h-16 w-16 rounded-lg bg-stone-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-1/2 bg-stone-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/3 bg-stone-200 rounded animate-pulse" />
              <div className="mt-2 flex gap-2">
                <div className="h-4 w-16 bg-stone-200 rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-stone-200 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}


