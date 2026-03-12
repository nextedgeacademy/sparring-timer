import React from "react";
import { motion } from "framer-motion";

export default function TimerTile({ timeLeft, phase, status }) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const isRest = phase === "rest";
  const isWarmup = status === "warmup";
  const isPaused = status === "paused";

  let bgClass = "bg-white/5 border-white/10";
  let timeColor = "text-white";
  let label = "ROUND";

  if (isWarmup) {
    bgClass = "bg-blue-950/40 border-blue-700/30";
    timeColor = "text-blue-300";
    label = "WARMUP";
  } else if (isRest) {
    bgClass = "bg-amber-950/40 border-amber-700/30";
    timeColor = "text-amber-400";
    label = "REST";
  } else if (isPaused) {
    bgClass = "bg-white/5 border-white/10";
    timeColor = "text-white/60";
    label = "PAUSED";
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border flex flex-col items-center justify-center p-4 text-center min-h-[90px] ${bgClass}`}
    >
      <div className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1">
        {label}
      </div>
      <div className={`font-mono font-black tabular-nums tracking-tight text-5xl md:text-6xl lg:text-7xl ${timeColor}`}>
        {formatted}
      </div>
      {isPaused && (
        <div className="mt-1 text-amber-400 text-xs font-bold tracking-widest animate-pulse">
          PAUSED
        </div>
      )}
    </motion.div>
  );
}