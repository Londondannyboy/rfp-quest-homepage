"use client";

import React, { useState } from "react";
import { CheckCircleIcon, LayoutListIcon } from "lucide-react";

const SECTORS = [
  { id: "nhs", label: "NHS / Healthcare" },
  { id: "construction", label: "Construction" },
  { id: "it", label: "IT & Digital" },
  { id: "education", label: "Education" },
  { id: "defence", label: "Defence" },
  { id: "facilities", label: "Facilities Management" },
  { id: "transport", label: "Transport" },
  { id: "police", label: "Police / Justice" },
  { id: "finance", label: "Financial Services" },
  { id: "energy", label: "Energy & Utilities" },
  { id: "social-care", label: "Social Care" },
  { id: "consulting", label: "Consulting / Professional Services" },
  { id: "central-gov", label: "Central Government" },
  { id: "local-gov", label: "Local Government" },
];

interface SectorSelectorProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
}

export function SectorSelector({ status, respond }: SectorSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSubmit = () => {
    const labels = SECTORS.filter((s) => selected.has(s.id)).map((s) => s.label);
    setSubmitted(true);
    respond?.(labels.length > 0 ? `Sectors: ${labels.join(", ")}` : "No sectors selected");
  };

  if (submitted) {
    const labels = SECTORS.filter((s) => selected.has(s.id)).map((s) => s.label);
    return (
      <div className="w-full max-w-2xl mx-auto p-5 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-7 h-7 text-green-500" />
          <p className="text-sm text-gray-700 dark:text-gray-300">Sectors: <strong>{labels.join(", ") || "None"}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <LayoutListIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Sectors</h3>
          </div>
          <p className="text-rose-100 text-sm mt-1">Tap each sector your company works in</p>
        </div>
        <div className="p-4 pb-20 relative">
          <div className="grid grid-cols-2 gap-2">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => toggle(sector.id)}
                className={`p-3 rounded-lg border-2 transition-all cursor-pointer text-left flex items-center gap-2 ${
                  selected.has(sector.id)
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-rose-300 hover:bg-rose-50/50"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selected.has(sector.id) ? "border-rose-500 bg-rose-500" : "border-gray-300 bg-white dark:bg-gray-800"
                }`}>
                  {selected.has(sector.id) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{sector.label}</span>
              </button>
            ))}
          </div>
          <div className="sticky bottom-0 left-0 right-0 pt-4 pb-2 mt-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900">
            <button
              onClick={handleSubmit}
              className="w-full py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Confirm Sectors ({selected.size} selected)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
