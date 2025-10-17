"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { typography } from "@/lib/typography";
import { AnimatePresence, motion } from "framer-motion";
import { Info, Check } from "lucide-react";

type DietKey = "vegetarian" | "vegan" | "jain";

type OnboardingState = {
  diets: DietKey[];
  allergies: string[];
  notes: string;
};

const STORAGE_KEY = "greendot.onboarding";

const defaultState: OnboardingState = {
  diets: [],
  allergies: [],
  notes: "",
};

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
    scale: 0.98,
  }),
};

const spring = { type: "spring", stiffness: 500, damping: 40, mass: 1.2 };

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (raw) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

const DietCard = ({
  icon,
  title,
  description,
  badge,
  gradient,
  selected,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  gradient: string; // tailwind gradient classes
  selected: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full rounded-2xl p-5 text-left transition-all ${
        selected
          ? "shadow-xl border-2 border-emerald-500 ring-2 ring-emerald-300/40"
          : "shadow-md border-2 border-stone-200"
      } ${gradient}`}
      style={{ minHeight: 124 }}
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl select-none" aria-hidden>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-stone-800">{title}</div>
            {badge ? (
              <span className="text-xs rounded-full bg-stone-900/10 text-stone-900/70 px-2 py-0.5">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="text-sm text-stone-600 mt-1">{description}</div>
        </div>
        <motion.div
          initial={false}
          animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.9 }}
          transition={spring}
          className="absolute top-3 right-3 h-7 w-7 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg"
        >
          <Check size={16} />
        </motion.div>
      </div>
    </motion.button>
  );
};

const Chip = ({ label, selected, onToggle, colorClasses }: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  colorClasses: string; // background/text classes for selected
}) => {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.96 }}
      animate={{ scale: selected ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 20 }}
      className={`min-h-12 px-6 py-3 rounded-full text-sm font-medium transition-all border ${
        selected ? `${colorClasses} border-transparent` : "bg-transparent border-stone-300 text-stone-600"
      }`}
    >
      {label}
    </motion.button>
  );
};

const Dot = ({ active }: { active: boolean }) => (
  <span
    className={`h-2 w-2 rounded-full ${active ? "bg-emerald-600" : "bg-stone-300"}`}
  />
);

export default function Onboarding({ onComplete }: { onComplete?: (state: OnboardingState) => void }) {
  const [state, setState] = usePersistentState<OnboardingState>(STORAGE_KEY, defaultState);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showJainInfo, setShowJainInfo] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    let isDown = false;
    const threshold = 40;
    const onStart = (x: number) => {
      isDown = true;
      startX = x;
    };
    const onMove = (x: number) => {
      if (!isDown) return;
      const dx = x - startX;
      if (dx > threshold) {
        isDown = false;
        prev();
      } else if (dx < -threshold) {
        isDown = false;
        next();
      }
    };
    const onEnd = () => {
      isDown = false;
    };
    const touchStart = (e: TouchEvent) => onStart(e.touches[0].clientX);
    const touchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const mouseDown = (e: MouseEvent) => onStart(e.clientX);
    const mouseMove = (e: MouseEvent) => onMove(e.clientX);
    el.addEventListener("touchstart", touchStart);
    el.addEventListener("touchmove", touchMove);
    el.addEventListener("touchend", onEnd);
    el.addEventListener("mousedown", mouseDown);
    el.addEventListener("mousemove", mouseMove);
    el.addEventListener("mouseup", onEnd);
    return () => {
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("mousedown", mouseDown);
      el.removeEventListener("mousemove", mouseMove);
      el.removeEventListener("mouseup", onEnd);
    };
  }, []);

  const canContinue = useMemo(() => {
    if (page === 1) return state.diets.length > 0;
    return true;
  }, [page, state.diets.length]);

  function next() {
    setDirection(1);
    setPage((p) => Math.min(p + 1, 2));
  }
  function prev() {
    setDirection(-1);
    setPage((p) => Math.max(p - 1, 0));
  }

  function toggleDiet(key: DietKey) {
    setState((s) => {
      const exists = s.diets.includes(key);
      const diets = exists ? s.diets.filter((d) => d !== key) : [...s.diets, key];
      return { ...s, diets };
    });
  }
  function toggleAllergy(label: string) {
    setState((s) => {
      const exists = s.allergies.includes(label);
      const allergies = exists ? s.allergies.filter((a) => a !== label) : [...s.allergies, label];
      return { ...s, allergies };
    });
  }

  function handleComplete() {
    onComplete?.(state);
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[100dvh] w-full overflow-hidden">
      {/* Skip */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={handleComplete}
          className="text-sm text-stone-600 hover:text-stone-800 underline underline-offset-4"
        >
          Skip
        </button>
      </div>

      {/* Pages */}
      <div className="h-full">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ ...spring, opacity: { duration: 0.2 } }}
            className="h-full"
          >
            {page === 0 && (
              <div className="h-full flex flex-col p-8 items-center justify-center">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50" />
                {/* Playful 3D veggies using CSS transforms */}
                <div className="absolute inset-0 pointer-events-none">
                  <motion.div
                    className="absolute -top-6 -left-6 text-7xl select-none"
                    animate={{ y: [0, 10, 0], rotate: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  >
                    🥕
                  </motion.div>
                  <motion.div
                    className="absolute bottom-10 right-6 text-8xl select-none"
                    animate={{ y: [0, -12, 0], rotate: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
                  >
                    🥬
                  </motion.div>
                  <motion.div
                    className="absolute top-24 right-20 text-6xl select-none"
                    animate={{ y: [0, 14, 0], rotate: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
                  >
                    🍅
                  </motion.div>
                </div>
                <div className="relative z-10 max-w-md text-center space-y-4">
                  <h1 className={`${typography.h1} text-stone-900`}>Know what you're eating</h1>
                  <p className={`${typography.body} text-stone-600`}>Instant dietary verification for every product</p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={next}
                      className="min-h-12 px-6 py-3 rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg transition font-semibold"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            )}

            {page === 1 && (
              <div className="h-full flex flex-col p-8">
                <h2 className={`${typography.h2} text-stone-900 mt-8`}>What do you follow?</h2>
                <div className="mt-6 grid grid-cols-1 gap-4">
                  <DietCard
                    icon="🥕"
                    title="Vegetarian"
                    description="No meat, fish, or eggs"
                    gradient="bg-gradient-to-br from-emerald-50 to-green-50"
                    selected={state.diets.includes("vegetarian")}
                    onClick={() => toggleDiet("vegetarian")}
                  />
                  <DietCard
                    icon="🌱"
                    title="Vegan"
                    description="Plant-based, no animal products"
                    gradient="bg-gradient-to-br from-lime-50 to-green-50"
                    selected={state.diets.includes("vegan")}
                    onClick={() => toggleDiet("vegan")}
                  />
                  <div className="relative">
                    <DietCard
                      icon="🙏"
                      title="Jain"
                      description="Ahiṁsā-based diet"
                      badge="Includes roots & fungi restrictions"
                      gradient="bg-gradient-to-br from-amber-50 to-orange-50"
                      selected={state.diets.includes("jain")}
                      onClick={() => toggleDiet("jain")}
                    />
                    <button
                      type="button"
                      aria-label="More info about Jain diet"
                      onClick={() => setShowJainInfo(true)}
                      className="absolute top-3 right-12 p-1 text-stone-600 hover:text-stone-800"
                    >
                      <Info size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between">
                    <button
                    type="button"
                    onClick={prev}
                      className={`${typography.label} text-stone-600 hover:text-stone-800`}
                  >
                    Back
                  </button>
                    <button
                    type="button"
                    disabled={!canContinue}
                    onClick={next}
                      className={`min-h-12 px-6 py-3 rounded-2xl text-white shadow-lg transition font-semibold ${
                      canContinue ? "bg-emerald-600 hover:bg-emerald-700" : "bg-stone-300 cursor-not-allowed"
                    }`}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {page === 2 && (
              <div className="h-full flex flex-col p-8">
                <h2 className={`${typography.h2} text-stone-900 mt-8`}>Any allergies or restrictions?</h2>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Chip
                    label="Gluten-free"
                    selected={state.allergies.includes("Gluten-free")}
                    onToggle={() => toggleAllergy("Gluten-free")}
                    colorClasses="bg-yellow-100 text-amber-900"
                  />
                  <Chip
                    label="Dairy-free"
                    selected={state.allergies.includes("Dairy-free")}
                    onToggle={() => toggleAllergy("Dairy-free")}
                    colorClasses="bg-blue-100 text-blue-900"
                  />
                  <Chip
                    label="Nut allergies"
                    selected={state.allergies.includes("Nut allergies")}
                    onToggle={() => toggleAllergy("Nut allergies")}
                    colorClasses="bg-pink-100 text-pink-900"
                  />
                  <Chip
                    label="Soy-free"
                    selected={state.allergies.includes("Soy-free")}
                    onToggle={() => toggleAllergy("Soy-free")}
                    colorClasses="bg-green-100 text-green-900"
                  />
                  <Chip
                    label="Shellfish"
                    selected={state.allergies.includes("Shellfish")}
                    onToggle={() => toggleAllergy("Shellfish")}
                    colorClasses="bg-orange-100 text-orange-900"
                  />
                </div>

                <div className="mt-6">
                  <label className={`block ${typography.label} text-stone-700 mb-2`}>Other dietary notes (optional)</label>
                  <textarea
                    placeholder="Anything else we should know?"
                    value={state.notes}
                    onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={prev}
                    className={`${typography.label} text-stone-600 hover:text-stone-800`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="min-h-12 px-6 py-3 rounded-2xl text-white shadow-lg transition bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-semibold"
                  >
                    Start Scanning
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2">
        <Dot active={page === 0} />
        <Dot active={page === 1} />
        <Dot active={page === 2} />
      </div>

      {/* Jain info modal */}
      <AnimatePresence>
        {showJainInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/40 grid place-items-center p-6"
            onClick={() => setShowJainInfo(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={spring}
              className="max-w-md w-full rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <div className="text-xl">🙏</div>
                <div className="font-semibold text-stone-900">About Jain dietary principles</div>
              </div>
              <p className={`${typography.bodySmall} text-stone-700 mt-3`}>
                Jain cuisine emphasizes ahiṁsā (non‑violence). In addition to vegetarianism, many
                followers avoid root vegetables (e.g., onion, garlic, potatoes) and fungi to
                minimize harm to microorganisms and entire plants.
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowJainInfo(false)}
                  className="min-h-10 px-4 py-2 rounded-xl bg-stone-900 text-white font-medium"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


