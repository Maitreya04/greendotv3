"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type Props = {
  title: string;
  description: string;
  state: "pass" | "fail" | "unknown";
  className?: string;
  infoAriaLabel?: string;
};

export default function StatusRow({ title, description, state, className, infoAriaLabel }: Props) {
  const tone = state === "pass"
    ? { box: "bg-emerald-50 ring-emerald-200 border-emerald-400", icon: <CheckCircle2 className="text-emerald-600" size={20} aria-hidden /> }
    : state === "fail"
    ? { box: "bg-red-50 ring-red-200 border-red-400", icon: <XCircle className="text-red-600" size={20} aria-hidden /> }
    : { box: "bg-amber-50 ring-amber-200 border-amber-400", icon: <AlertTriangle className="text-amber-600" size={20} aria-hidden /> };

  return (
    <div className={`rounded-2xl p-4 ring-1 border ${tone.box} ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        <div className="mt-[2px]">{tone.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-stone-900">{title}</div>
            <button type="button" className="text-stone-500 hover:text-stone-700" aria-label={infoAriaLabel ?? `More info about ${title}`}>
              <Info size={16} />
            </button>
          </div>
          <div className="text-sm text-stone-700">{description}</div>
        </div>
      </div>
    </div>
  );
}



