"use client";

import React, { useState } from "react";
import { CheckCircleIcon, LayoutGridIcon } from "lucide-react";

const DOS_CATEGORIES = [
  { id: "performance-data", label: "Performance & Data", description: "Analytics, data science, statistical modelling" },
  { id: "security", label: "Security", description: "Cyber security, penetration testing, risk management" },
  { id: "service-delivery", label: "Service Delivery", description: "Agile, product management, business analysis" },
  { id: "software-dev", label: "Software Development", description: "API, cloud, mobile, machine learning" },
  { id: "support-ops", label: "Support & Operations", description: "Hosting, monitoring, incident management" },
  { id: "testing", label: "Testing & Auditing", description: "Accessibility, load testing, security auditing" },
  { id: "ux-design", label: "UX & Design", description: "Content design, interaction design, service design" },
  { id: "user-research", label: "User Research", description: "Personas, usability testing, journey mapping" },
];

interface CapabilitySelectorProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  prompt: string;
}

export function CapabilitySelector({
  status,
  respond,
  prompt,
}: CapabilitySelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSubmit = () => {
    const labels = DOS_CATEGORIES
      .filter((c) => selected.has(c.id))
      .map((c) => c.label);
    setSubmitted(true);
    respond?.(labels.length > 0 ? `Selected capabilities: ${labels.join(", ")}` : "No capabilities selected");
  };

  if (submitted) {
    const labels = DOS_CATEGORIES.filter((c) => selected.has(c.id)).map((c) => c.label);
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-8 h-8 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Capabilities Confirmed
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {labels.length > 0 ? labels.join(", ") : "None selected"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <LayoutGridIcon className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Core Capabilities</h2>
          </div>
          <p className="text-violet-100">Select the Digital Outcomes categories your company covers</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {DOS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggle(cat.id)}
                className={`text-left p-4 rounded-lg border-2 transition-all duration-150 cursor-pointer ${
                  selected.has(cat.id)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selected.has(cat.id) ? "border-blue-500 bg-blue-500" : "border-gray-300"
                  }`}>
                    {selected.has(cat.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{cat.label}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{cat.description}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Confirm Capabilities ({selected.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
}
