"use client";

import React from "react";
import type { DietMode } from "@/types";
import { Leaf, Sprout, Hand } from "lucide-react";

type Props = {
  value: DietMode;
  onChange: (next: DietMode) => void;
  size?: "sm" | "md";
  className?: string;
};

const segments: Array<{ key: DietMode; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { key: "vegan", label: "Vegan", Icon: Leaf },
  { key: "vegetarian", label: "Vegetarian", Icon: Sprout },
  { key: "jain", label: "Jain", Icon: Hand },
];

export default function DietToggle({ value, onChange, size = "md", className }: Props) {
  const height = size === "sm" ? "h-9" : "h-10";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`inline-flex items-center gap-1 rounded-xl bg-white/70 backdrop-blur ring-1 ring-stone-200 shadow-sm ${height} p-1 ${className ?? ""}`} role="tablist" aria-label="Diet mode">
      {segments.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 ${height} ${text} transition-all ${
              active ? "bg-emerald-600 text-white shadow" : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            <Icon size={16} className={active ? "opacity-100" : "opacity-80"} />
            <span className="font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}


