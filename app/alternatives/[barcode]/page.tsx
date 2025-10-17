import React from "react";
import { fetchSuggestions, type SuggestionPrefs } from "@/lib/suggest";
import { typography } from "@/lib/typography";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getQueryPref(searchParams: Record<string, string | string[] | undefined>): SuggestionPrefs {
  const diet = (searchParams.diet as string) || "vegetarian";
  const avoid = typeof searchParams.avoid === "string" && searchParams.avoid.length ? (searchParams.avoid as string).split(",").map((s) => s.trim().toLowerCase()) : [];
  const labels = typeof searchParams.labels === "string" && searchParams.labels.length ? (searchParams.labels as string).split(",").map((s) => s.trim().toLowerCase()) as any : [];
  const noPalm = searchParams.noPalm === "1";
  const country = typeof searchParams.country === "string" ? (searchParams.country as string) : undefined;
  const sort = (searchParams.sort as any) || "balanced";
  return {
    diet: diet as any,
    avoidAllergens: avoid,
    requiredLabels: labels,
    palmOilFree: noPalm,
    countryTag: country,
    limit: 24,
    sort,
  };
}

export default async function AlternativesPage({ params, searchParams }: { params: { barcode: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const barcode = params.barcode;
  const prefs = getQueryPref(searchParams);
  const items = await fetchSuggestions({ code: barcode }, prefs);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className={`${typography.h3}`}>Alternatives</h1>
        <Link href={`/`} className="rounded-lg bg-white ring-1 ring-stone-300 text-stone-900 px-3 py-1.5 text-sm hover:bg-stone-50">Back</Link>
      </div>
      <div className="text-sm text-stone-600 mb-4">For product {barcode}. Adjust filters via URL query parameters.</div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 text-stone-700 p-4">No alternatives found for the current filters.</div>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <li key={it.code} className="rounded-2xl border border-stone-100 bg-white shadow-sm hover:shadow-md transition">
              <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-stone-100">
                {it.image_url ? (
                  <Image src={it.image_url} alt={it.product_name || "Product"} fill className="object-cover" />
                ) : null}
              </div>
              <div className="p-3">
                <div className="truncate font-medium text-sm">{it.product_name || "Unknown"}</div>
                <div className="truncate text-xs text-stone-500">{it.brands || ""}</div>
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  {it.nutrition_grades && <span className="rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5">Nutri {it.nutrition_grades.toUpperCase()}</span>}
                  {typeof it.nova_group === "number" && <span className="rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-2 py-0.5">NOVA {it.nova_group}</span>}
                  {it.ecoscore_grade && <span className="rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200 px-2 py-0.5">Eco {it.ecoscore_grade.toUpperCase()}</span>}
                </div>
                <a href={`https://world.openfoodfacts.org/product/${encodeURIComponent(it.code)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-emerald-600 text-white text-xs px-3 py-1.5">Open</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


