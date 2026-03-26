"use client";

import type { DemoItem } from "./demo-data";

// Category badge colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "3D / Animation": { bg: "rgba(139,92,246,0.12)", text: "rgba(139,92,246,1)" },
  "Data Visualization": { bg: "rgba(59,130,246,0.12)", text: "rgba(59,130,246,1)" },
  Diagrams: { bg: "rgba(16,185,129,0.12)", text: "rgba(16,185,129,1)" },
  Interactive: { bg: "rgba(245,158,11,0.12)", text: "rgba(245,158,11,1)" },
  "UI Components": { bg: "rgba(236,72,153,0.12)", text: "rgba(236,72,153,1)" },
};

// Emoji background gradients
const EMOJI_GRADIENTS: Record<string, string> = {
  "3D / Animation":
    "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)",
  "Data Visualization":
    "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.06) 100%)",
  Diagrams:
    "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.06) 100%)",
  Interactive:
    "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(236,72,153,0.06) 100%)",
  "UI Components":
    "linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.06) 100%)",
};

interface DemoCardProps {
  demo: DemoItem;
  onTry: (demo: DemoItem) => void;
}

export function DemoCard({ demo, onTry }: DemoCardProps) {
  const categoryColor = CATEGORY_COLORS[demo.category] ?? {
    bg: "rgba(100,100,100,0.12)",
    text: "rgba(100,100,100,1)",
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
        background: "var(--surface-primary, #fff)",
      }}
    >
      {/* Preview area */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 160,
          background:
            EMOJI_GRADIENTS[demo.category] ??
            "var(--color-background-secondary)",
        }}
      >
        <div className="flex items-center justify-center h-full">
          <span className="text-5xl" role="img" aria-label={demo.title}>
            {demo.emoji}
          </span>
        </div>

        {/* Category badge */}
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: categoryColor.bg,
            color: categoryColor.text,
          }}
        >
          {demo.category}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{demo.emoji}</span>
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary, #1a1a1a)" }}
          >
            {demo.title}
          </h3>
        </div>
        <p
          className="text-xs line-clamp-2"
          style={{ color: "var(--text-secondary, #666)" }}
        >
          {demo.description}
        </p>
      </div>

      {/* Action */}
      <div className="p-3 pt-0">
        <button
          onClick={() => onTry(demo)}
          className="w-full text-xs font-medium py-2 rounded-lg transition-all duration-150 hover:scale-[1.02] text-white cursor-pointer"
          style={{
            background:
              "linear-gradient(135deg, var(--color-lilac-dark, #6366f1), var(--color-mint-dark, #10b981))",
          }}
        >
          Try it
        </button>
      </div>
    </div>
  );
}
