"use client";

import React from "react";

type ClassValue = string | undefined;

function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Shimmer({ className }: { className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden", className)} aria-hidden>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
    </span>
  );
}

export function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn("relative rounded-md bg-gray-200/80", className)}>
      <Shimmer className="pointer-events-none" />
    </div>
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return <SkeletonBox className={cn("h-4", className)} />;
}

export function ResultSkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <SkeletonText className="h-5 w-48 rounded" />
        <SkeletonBox className="h-6 w-32 rounded-full" />
      </div>
      <SkeletonBox className="mb-3 h-40 w-full rounded" />
      <div className="grid gap-3 md:grid-cols-2">
        <SkeletonBox className="h-20 rounded" />
        <SkeletonBox className="h-20 rounded" />
      </div>
      <SkeletonBox className="mt-4 h-24 rounded" />
    </div>
  );
}

export function HistoryListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 p-3">
          <SkeletonBox className="h-12 w-12 flex-none rounded-md" />
          <div className="min-w-0 flex-1">
            <SkeletonText className="mb-2 h-4 w-40" />
            <SkeletonText className="h-3 w-24" />
          </div>
          <SkeletonBox className="h-5 w-12 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function CameraPulseIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid place-items-center", className)}>
      <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" />
      <div className="relative grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M7 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm5 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
          <circle cx="12" cy="13" r="2.75" />
        </svg>
      </div>
    </div>
  );
}

// Utility class to attach shimmer animation
// We can't define new Tailwind utilities here, so we rely on the keyframes and use a plain className
declare module "react" {
  // no-op module augmentation to keep TS happy if JSX classNames are unknown
}

export default SkeletonBox;


