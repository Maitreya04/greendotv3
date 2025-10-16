"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Clock, Settings as SettingsIcon } from "lucide-react";
import { get } from "idb-keyval";

type NavItem = {
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactElement;
};

export default function BottomNav() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef<number>(0);
  const isMobile = useRef<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);

  const items: NavItem[] = useMemo(
    () => [
      { label: "Scan", href: "/", icon: (p) => <Camera className={p.className} /> },
      { label: "History", href: "/history", icon: (p) => <Clock className={p.className} /> },
      { label: "Settings", href: "/settings", icon: (p) => <SettingsIcon className={p.className} /> },
    ],
    []
  );

  useEffect(() => {
    // compute mobile flag
    try { isMobile.current = typeof window !== "undefined" && window.innerWidth < 768; } catch {}
    const onScroll = () => {
      if (!isMobile.current) return;
      const y = window.scrollY || 0;
      const dy = y - (lastY.current || 0);
      if (Math.abs(dy) < 4) return; // ignore jitter
      setHidden(dy > 0);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem("history");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setHistoryCount(arr.length);
          return;
        }
      } catch {}
      try {
        const idbData = await get("history");
        if (Array.isArray(idbData)) setHistoryCount(idbData.length);
      } catch {}
    })();
  }, [pathname]);

  const vibrate = useCallback((durationMs: number) => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        (navigator as unknown as { vibrate: (pattern: number | number[]) => void }).vibrate(durationMs);
      }
    } catch {}
  }, []);

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: hidden ? 80 : 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white shadow-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", height: "72px" }}
      aria-label="Bottom Navigation"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-4 h-full">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                aria-label={label}
                className="group relative flex h-full flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                onClick={() => { if (!isActive) vibrate(15); }}
              >
                {/* Active indicator */}
                <div className={`absolute top-0 h-[3px] w-6 rounded-b-full transition-opacity duration-200 ${isActive ? "opacity-100 bg-emerald-600" : "opacity-0"}`} />
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1, color: isActive ? "#059669" : "#a8a29e" }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                >
                  <Icon className="h-6 w-6" />
                </motion.div>
                <span className={`text-xs transition-colors ${isActive ? "text-emerald-600 font-semibold" : "text-stone-400"}`}>{label}</span>
                {label === "History" && historyCount > 0 && (
                  <span className="absolute -top-2 right-6 grid min-w-[18px] place-items-center rounded-full bg-emerald-600 px-1.5 text-[10px] leading-none text-white">
                    {Math.min(historyCount, 99)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}


