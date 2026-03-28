"use client";

import React, { useState } from "react";
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, DollarSignIcon, CalendarIcon, BriefcaseIcon } from "lucide-react";

interface BidDecisionProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  tenderTitle: string;
  buyerName: string;
  tenderValue?: string;
  deadline?: string;
  matchScore: number;
  strengths: string[];
  risks: string[];
  recommendation: "bid" | "no-bid" | "review";
}

export function BidDecision({
  status,
  respond,
  tenderTitle,
  buyerName,
  tenderValue,
  deadline,
  matchScore,
  strengths,
  risks,
  recommendation,
}: BidDecisionProps) {
  const [decided, setDecided] = useState(false);
  const [decision, setDecision] = useState<"bid" | "no-bid" | "review" | null>(null);

  const handleDecision = (choice: "bid" | "no-bid" | "review") => {
    setDecision(choice);
    setDecided(true);
    respond?.(`User decision: ${choice.toUpperCase()} - ${tenderTitle}`);
  };

  if (decided && decision) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          {decision === "bid" && <CheckCircleIcon className="w-8 h-8 text-green-500" />}
          {decision === "no-bid" && <XCircleIcon className="w-8 h-8 text-red-500" />}
          {decision === "review" && <AlertTriangleIcon className="w-8 h-8 text-amber-500" />}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Decision Recorded
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {decision === "bid" && "Proceeding with bid preparation"}
              {decision === "no-bid" && "Tender marked as not suitable"}
              {decision === "review" && "Tender flagged for further review"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getRecommendationColor = () => {
    switch (recommendation) {
      case "bid": return "text-green-600 dark:text-green-400";
      case "no-bid": return "text-red-600 dark:text-red-400";
      case "review": return "text-amber-600 dark:text-amber-400";
    }
  };

  const getMatchScoreColor = () => {
    if (matchScore >= 80) return "text-green-600 dark:text-green-400";
    if (matchScore >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl shadow-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
        {/* Certificate Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <BriefcaseIcon className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Bid Decision Required</h2>
          </div>
          <p className="text-blue-100">AI Analysis Complete - Awaiting Your Decision</p>
        </div>

        {/* Tender Details */}
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {tenderTitle}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {buyerName}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {tenderValue && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <DollarSignIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">VALUE</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {tenderValue}
                </p>
              </div>
            )}
            {deadline && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">DEADLINE</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {deadline}
                </p>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <span className="text-xs font-medium">MATCH SCORE</span>
              </div>
              <p className={`text-2xl font-bold ${getMatchScoreColor()}`}>
                {matchScore}%
              </p>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              AI RECOMMENDATION
            </h4>
            <p className={`text-xl font-bold ${getRecommendationColor()}`}>
              {recommendation === "bid" && "RECOMMEND BID"}
              {recommendation === "no-bid" && "RECOMMEND NO-BID"}
              {recommendation === "review" && "NEEDS FURTHER REVIEW"}
            </p>
          </div>

          {/* Strengths and Risks */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                STRENGTHS
              </h4>
              <ul className="space-y-2">
                {strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
                RISKS
              </h4>
              <ul className="space-y-2">
                {risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleDecision("bid")}
              className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Proceed with Bid
            </button>
            <button
              onClick={() => handleDecision("no-bid")}
              className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <XCircleIcon className="w-5 h-5" />
              Decline to Bid
            </button>
            <button
              onClick={() => handleDecision("review")}
              className="flex-1 py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <AlertTriangleIcon className="w-5 h-5" />
              Flag for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}