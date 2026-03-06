import React from "react";

const typeConfig = {
  bjj: { emoji: "🥋", label: "BJJ", color: "text-purple-400" },
  boxing: { emoji: "🥊", label: "Boxing", color: "text-red-400" },
  mma: { emoji: "🤜", label: "MMA", color: "text-orange-400" },
  muay_thai: { emoji: "🦵", label: "Muay Thai", color: "text-blue-400" },
};

export default function GoalDisplay({ goals = {}, large = false }) {
  return (
    <div className={`flex flex-wrap gap-4 justify-center ${large ? "gap-8" : ""}`}>
      {Object.entries(goals).map(([type, goal]) => {
        const config = typeConfig[type];
        if (!goal || !config) return null;
        return (
          <div key={type} className="flex items-center gap-2">
            <span className={`font-bold ${config.color} uppercase tracking-wider ${large ? "text-2xl" : "text-xs"}`}>
              {config.emoji} {config.label}:
            </span>
            <span className={`text-white/90 ${large ? "text-2xl font-semibold" : "text-sm"}`}>
              {goal}
            </span>
          </div>
        );
      })}
    </div>
  );
}