"use client";

import React, { useState } from "react";
import { CheckCircleIcon, PoundSterlingIcon } from "lucide-react";

const RANGES = [
  { id: "under-50k", label: "Under £50K", description: "Small contracts" },
  { id: "50k-100k", label: "£50K – £100K", description: "SME sweet spot" },
  { id: "100k-500k", label: "£100K – £500K", description: "Mid-range" },
  { id: "500k-1m", label: "£500K – £1M", description: "Large contracts" },
  { id: "1m-5m", label: "£1M – £5M", description: "Major contracts" },
  { id: "5m-plus", label: "£5M+", description: "Enterprise scale" },
];

interface ContractRangeSelectorProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
}

export function ContractRangeSelector({ status, respond }: ContractRangeSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (id: string) => {
    const range = RANGES.find((r) => r.id === id);
    setSelected(id);
    setSubmitted(true);
    respond?.(range ? `Contract range: ${range.label}` : "No range selected");
  };

  if (submitted && selected) {
    const range = RANGES.find((r) => r.id === selected);
    return (
      <div className="w-full max-w-2xl mx-auto p-5 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-7 h-7 text-green-500" />
          <p className="text-sm text-gray-700 dark:text-gray-300">Contract range: <strong>{range?.label}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <PoundSterlingIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Contract Size Range</h3>
          </div>
          <p className="text-emerald-100 text-sm mt-1">What value contracts do you typically target?</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => handleSelect(range.id)}
              className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer text-left"
            >
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{range.label}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">{range.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
