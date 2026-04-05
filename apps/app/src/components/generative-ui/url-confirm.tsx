"use client";

import React, { useState } from "react";
import { CheckCircleIcon, PencilIcon, GlobeIcon } from "lucide-react";

interface UrlConfirmProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  url: string;
  companyName: string;
}

export function UrlConfirm({ status, respond, url, companyName }: UrlConfirmProps) {
  const [decided, setDecided] = useState(false);

  if (decided) {
    return (
      <div className="w-full max-w-2xl mx-auto p-5 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-7 h-7 text-green-500" />
          <p className="text-sm text-gray-700 dark:text-gray-300">Looking up <strong>{url}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <GlobeIcon className="w-5 h-5" />
            <h3 className="text-lg font-bold">Confirm Website</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Is this your company website?</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">{url}</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setDecided(true); respond?.(`CONFIRMED: ${url}`); }}
              className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Yes, that's correct
            </button>
            <button
              onClick={() => { setDecided(true); respond?.("EDIT: user wants a different URL"); }}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <PencilIcon className="w-5 h-5" />
              Different URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
