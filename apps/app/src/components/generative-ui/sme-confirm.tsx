"use client";

import React, { useState } from "react";
import { CheckCircleIcon, XCircleIcon, BuildingIcon } from "lucide-react";

interface SmeConfirmProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
}

export function SmeConfirm({ status, respond }: SmeConfirmProps) {
  const [decided, setDecided] = useState(false);
  const [isSme, setIsSme] = useState<boolean | null>(null);

  if (decided && isSme !== null) {
    return (
      <div className="w-full max-w-2xl mx-auto p-5 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-7 h-7 text-green-500" />
          <p className="text-sm text-gray-700 dark:text-gray-300">SME status: <strong>{isSme ? "Yes" : "No"}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <BuildingIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">SME Status</h3>
          </div>
          <p className="text-amber-100 text-sm mt-1">Under 250 employees and €50M turnover?</p>
        </div>
        <div className="p-4 flex gap-3">
          <button
            onClick={() => { setIsSme(true); setDecided(true); respond?.("SME: Yes"); }}
            className="flex-1 py-4 px-4 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border-2 border-green-200 dark:border-green-800 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-300">Yes, we're an SME</span>
          </button>
          <button
            onClick={() => { setIsSme(false); setDecided(true); respond?.("SME: No"); }}
            className="flex-1 py-4 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <XCircleIcon className="w-6 h-6 text-gray-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">No</span>
          </button>
        </div>
      </div>
    </div>
  );
}
