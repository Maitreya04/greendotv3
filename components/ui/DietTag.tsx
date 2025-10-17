"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export type TagState = "pass" | "fail" | "unknown";

export function DietTag({
  icon,
  label,
  state = "unknown",
  subtle = false,
}: { icon: React.ReactNode; label: string; state?: TagState; subtle?: boolean }) {
  const tone = state === "pass"
    ? { bg: subtle ? "bg-emerald-50" : "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-200" }
    : state === "fail"
    ? { bg: subtle ? "bg-red-50" : "bg-red-100", text: "text-red-800", ring: "ring-red-200" }
    : { bg: subtle ? "bg-amber-50" : "bg-amber-100", text: "text-amber-800", ring: "ring-amber-200" };

  const StateIcon = state === "pass" ? CheckCircle2 : state === "fail" ? XCircle : AlertTriangle;

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
      <span className="grid place-items-center" aria-hidden>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      <StateIcon size={16} className="opacity-80" aria-hidden />
    </span>
  );
}



