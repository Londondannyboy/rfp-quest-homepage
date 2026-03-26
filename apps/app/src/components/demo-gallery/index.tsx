"use client";

import { useState } from "react";
import { DEMO_EXAMPLES, type DemoCategory, type DemoItem } from "./demo-data";
import { DemoCard } from "./demo-card";
import { CategoryFilter } from "./category-filter";

export type { DemoItem } from "./demo-data";

interface DemoGalleryProps {
  open: boolean;
  onClose: () => void;
  onTryDemo: (demo: DemoItem) => void;
}

export function DemoGallery({ open, onClose, onTryDemo }: DemoGalleryProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<DemoCategory | null>(null);

  const filtered = selectedCategory
    ? DEMO_EXAMPLES.filter((d) => d.category === selectedCategory)
    : DEMO_EXAMPLES;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: 480,
          maxWidth: "90vw",
          transform: open ? "translateX(0)" : "translateX(100%)",
          background: "var(--surface-primary, #fff)",
          borderLeft: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
          boxShadow: open ? "-8px 0 30px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{
            borderBottom:
              "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--text-secondary, #666)" }}
            >
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary, #1a1a1a)" }}
            >
              Demo Gallery
            </h2>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-background-secondary, #f5f5f5)",
                color: "var(--text-secondary, #666)",
              }}
            >
              {DEMO_EXAMPLES.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-150 cursor-pointer"
            style={{ color: "var(--text-secondary, #666)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Category filter */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <CategoryFilter
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {filtered.map((demo) => (
              <DemoCard key={demo.id} demo={demo} onTry={onTryDemo} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary, #666)" }}
              >
                No demos in this category
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
