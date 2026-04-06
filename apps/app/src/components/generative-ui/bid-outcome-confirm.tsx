"use client";

import { ReactNode } from "react";
import { CheckCircleIcon, ChevronRightIcon, TrophyIcon, BarChart3Icon } from "lucide-react";

interface BidOutcomeConfirmProps {
  status: "inProgress" | "pending" | "executing" | "complete";
  respond: (data: any) => void;
  contractName: string;
  buyer: string;
  outcome: "win" | "loss";
  value?: number;
  year?: number;
  role?: string;
}

export function BidOutcomeConfirm({
  status,
  respond,
  contractName,
  buyer,
  outcome,
  value,
  year,
  role,
}: BidOutcomeConfirmProps) {
  const isWin = outcome === "win";

  const handleConfirm = () => {
    respond({
      confirmed: true,
      contractName,
      buyer,
      outcome,
      value,
      year,
      role,
    });
  };

  const handleCancel = () => {
    respond({ confirmed: false });
  };

  if (status === "complete") {
    return (
      <div className="p-5 rounded-xl border flex items-center justify-between"
        style={{
          borderColor: isWin ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
          backgroundColor: isWin ? "rgba(34, 197, 94, 0.05)" : "rgba(239, 68, 68, 0.05)",
        }}>
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" style={{ color: isWin ? "#22c55e" : "#ef4444" }} />
          <div>
            <p className="font-medium m-0" style={{ color: "var(--color-text-primary)" }}>
              {isWin ? "Win" : "Loss"} Added to Skills Graph
            </p>
            <p className="text-sm opacity-70 m-0" style={{ color: "var(--color-text-secondary)" }}>
              {contractName} • {buyer}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden mb-3"
      style={{ borderColor: "var(--color-border-tertiary)" }}>
      
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between"
        style={{
          borderColor: "var(--color-border-tertiary)",
          background: isWin 
            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)"
            : "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)",
        }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isWin ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            }}>
            <span className="text-xl">{isWin ? "🏆" : "📊"}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold m-0" style={{ color: "var(--color-text-primary)" }}>
              Confirm Bid {isWin ? "Win" : "Loss"}
            </h3>
            <p className="text-sm opacity-70 m-0" style={{ color: "var(--color-text-secondary)" }}>
              Add to your skills graph
            </p>
          </div>
        </div>
        {status === "pending" && (
          <span className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.15)",
              color: "#f59e0b",
            }}>
            Waiting for confirmation
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-3">
        <div className="grid gap-3">
          <DetailRow label="Contract" value={contractName} />
          <DetailRow label="Buyer" value={buyer} />
          <DetailRow 
            label="Outcome" 
            value={
              <span className="font-semibold" style={{ color: isWin ? "#22c55e" : "#ef4444" }}>
                {isWin ? "WIN" : "LOSS"}
              </span>
            } 
          />
          {value && <DetailRow label="Value" value={`£${value.toLocaleString()}`} />}
          {year && <DetailRow label="Year" value={year.toString()} />}
          {role && <DetailRow label="Your Role" value={role} />}
        </div>

        <div className="p-3 rounded-lg"
          style={{
            backgroundColor: "var(--color-background-tertiary, rgba(0,0,0,0.03))",
            border: "1px solid var(--color-border-tertiary)",
          }}>
          <p className="text-xs m-0" style={{ color: "var(--color-text-secondary)" }}>
            This will be added to your Zep skills graph to track your bid history and win rate.
            {isWin ? " Wins appear as green nodes." : " Losses appear as red hollow nodes."}
          </p>
        </div>
      </div>

      {/* Actions */}
      {status === "pending" && (
        <div className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: "var(--color-border-tertiary)" }}>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: isWin ? "#22c55e" : "#ef4444",
              color: "white",
            }}>
            Add to Graph
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: "transparent",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-tertiary)",
            }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm opacity-70 min-w-[80px]" style={{ color: "var(--color-text-secondary)" }}>
        {label}:
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}