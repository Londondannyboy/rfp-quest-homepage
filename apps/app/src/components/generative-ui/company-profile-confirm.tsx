"use client";

import React, { useState } from "react";
import { CheckCircleIcon, PencilIcon, BuildingIcon } from "lucide-react";

interface CompanyProfileConfirmProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  companyName: string;
  domain: string;
  description: string;
  sectors: string;
  contractRange: string;
  isSme: boolean;
  certifications: string;
  capabilities: string;
  expertise: string;
}

export function CompanyProfileConfirm({
  status,
  respond,
  companyName,
  domain,
  description,
  sectors,
  contractRange,
  isSme,
  certifications,
  capabilities,
  expertise,
}: CompanyProfileConfirmProps) {
  const [decided, setDecided] = useState(false);
  const [action, setAction] = useState<"save" | "edit" | null>(null);

  const handleAction = (choice: "save" | "edit") => {
    setAction(choice);
    setDecided(true);
    if (choice === "save") {
      respond?.(`CONFIRMED — save company profile for ${companyName}`);
    } else {
      respond?.(`EDIT — user wants to change profile details for ${companyName}`);
    }
  };

  if (decided && action === "save") {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-8 h-8 text-green-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Profile Saved
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {companyName} is now registered on RFP.quest
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (decided && action === "edit") {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <PencilIcon className="w-8 h-8 text-amber-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Editing Profile
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tell me what you'd like to change
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { label: "Company", value: companyName },
    { label: "Website", value: domain },
    { label: "Description", value: description },
    { label: "Sectors", value: sectors },
    { label: "Contract Range", value: contractRange },
    { label: "SME", value: isSme ? "Yes" : "No" },
    { label: "Certifications", value: certifications || "None" },
    { label: "Capabilities", value: capabilities || "None" },
    { label: "Expertise", value: expertise || "—" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <BuildingIcon className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Company Profile</h2>
          </div>
          <p className="text-indigo-100">Review and confirm your details</p>
        </div>

        <div className="p-8">
          <div className="space-y-3 mb-6">
            {fields.map((field) => (
              <div key={field.label} className="flex border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="w-36 text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">
                  {field.label}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {field.value || "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleAction("save")}
              className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Save Profile
            </button>
            <button
              onClick={() => handleAction("edit")}
              className="flex-1 py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <PencilIcon className="w-5 h-5" />
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
