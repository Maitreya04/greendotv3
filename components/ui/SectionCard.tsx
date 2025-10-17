"use client";

import React from "react";
import { typography } from "@/lib/typography";

type Props = {
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
};

export default function SectionCard({ title, subtitle, className, children, headerRight }: Props) {
  return (
    <section className={`rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-100 bg-white ${className ?? ""}`}>
      {(title || subtitle || headerRight) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            {title && <div className={`${typography.label} text-stone-900`}>{title}</div>}
            {subtitle && <div className={`${typography.caption} text-stone-600`}>{subtitle}</div>}
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </section>
  );
}



