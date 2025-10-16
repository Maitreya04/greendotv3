"use client";

import React, { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Optionally log to monitoring service
    // console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-900 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mb-2 text-lg font-semibold">Something went wrong</div>
        <div className="mb-4 text-sm text-gray-600">
          An unexpected error occurred. You can retry or go back to scanning.
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black active:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md bg-white px-4 py-2 text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100 active:bg-gray-200"
          >
            Home
          </a>
        </div>
        {error?.digest && (
          <div className="mt-3 text-xs text-gray-400" aria-live="polite">Ref: {error.digest}</div>
        )}
      </div>
    </div>
  );
}


