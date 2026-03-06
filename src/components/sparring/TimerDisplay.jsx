import React from "react";

export default function TimerDisplay({ timeLeft, phase, large = false }) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  
  const isRest = phase === "rest";

  return (
    <div className={`font-mono font-black tabular-nums tracking-tight ${large ? "text-6xl md:text-7xl lg:text-8xl" : "text-4xl md:text-5xl"} ${isRest ? "text-amber-400" : "text-white"}`}>
      {formatted}
    </div>
  );
}