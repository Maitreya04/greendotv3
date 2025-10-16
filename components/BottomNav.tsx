"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactElement;
};

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5L12 3l9 7.5M5.25 9v10.5A1.5 1.5 0 006.75 21h10.5a1.5 1.5 0 001.5-1.5V9"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.4-1.168 1.95-1.168 2.35 0a1.724 1.724 0 002.573.966c1.06-.613 2.275.602 1.662 1.662a1.724 1.724 0 00.966 2.573c1.168.4 1.168 1.95 0 2.35a1.724 1.724 0 00-.966 2.573c.613 1.06-.602 2.275-1.662 1.662a1.724 1.724 0 00-2.573.966c-.4 1.168-1.95 1.168-2.35 0a1.724 1.724 0 00-2.573-.966c-1.06.613-2.275-.602-1.662-1.662a1.724 1.724 0 00-.966-2.573c-1.168-.4-1.168-1.95 0-2.35.84-.288 1.39-1.09 1.39-1.982 0-.892-.55-1.694-1.39-1.982-1.168-.4-1.168-1.95 0-2.35.613-1.06 2.828-2.275 3.888-1.662.98.567 2.173.07 2.573-.966z"
      />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  const items: NavItem[] = useMemo(
    () => [
      { label: "Scan", href: "/", icon: HomeIcon },
      { label: "History", href: "/history", icon: ClockIcon },
      { label: "Settings", href: "/settings", icon: GearIcon },
    ],
    []
  );

  const vibrate = useCallback((durationMs: number) => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        // Best-effort; ignored on platforms that do not support it
        (navigator as unknown as { vibrate: (pattern: number | number[]) => void }).vibrate(
          durationMs
        );
      }
    } catch {
      // no-op
    }
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom Navigation"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
          const baseColor = isActive ? "text-emerald-600" : "text-gray-400";
          const hoverColor = isActive ? "hover:text-emerald-700" : "hover:text-gray-600";
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                className={`${baseColor} ${hoverColor} group flex flex-col items-center gap-1 rounded-full px-3 py-3 min-h-11 transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40`}
                onClick={(e) => {
                  // Only vibrate when changing to a different tab
                  if (!isActive) {
                    vibrate(15);
                  }
                }}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


