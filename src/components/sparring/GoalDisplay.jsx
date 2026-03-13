import React from "react";

export default function GoalDisplay({ boxingGoal, muayThaiGoal, large = false }) {
  return (
    <div className={`flex flex-wrap gap-4 justify-center ${large ? "gap-8" : ""}`}>
      {boxingGoal && (
        <div className="flex items-center gap-2">
          <span className={`font-bold text-red-400 uppercase tracking-wider ${large ? "text-3xl" : "text-xs"}`}>
            🥊 Boxing:
          </span>
          <span className={`text-white/90 ${large ? "text-3xl font-semibold" : "text-sm"}`}>
            {boxingGoal}
          </span>
        </div>
      )}
      {muayThaiGoal && (
        <div className="flex items-center gap-2">
          <span className={`font-bold text-blue-400 uppercase tracking-wider ${large ? "text-3xl" : "text-xs"}`}>
            🦵 MMA/Muay Thai:
          </span>
          <span className={`text-white/90 ${large ? "text-3xl font-semibold" : "text-sm"}`}>
            {muayThaiGoal}
          </span>
        </div>
      )}
    </div>
  );
}