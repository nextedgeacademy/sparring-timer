import React from "react";
import { motion } from "framer-motion";

export default function MatchupTile({ match, large = false }) {
  const isRest = match.isRest;
  const name1 = match.athlete1 === "__REST__" ? match.athlete2 : match.athlete1;
  const name2 = match.athlete2 === "__REST__" ? "Rest Round" : (match.athlete1 === "__REST__" ? "Rest Round" : match.athlete2);
  const isRestDisplay = match.athlete1 === "__REST__" || match.athlete2 === "__REST__";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`
        rounded-2xl border flex flex-col items-center justify-center p-4 text-center
        ${isRestDisplay
          ? "bg-amber-950/40 border-amber-700/30"
          : "bg-green-950/30 border-green-600/50"
        }
        ${large ? "min-h-[120px]" : "min-h-[90px]"}
      `}
    >
      <span className={`font-bold text-white leading-tight ${large ? "text-3xl md:text-4xl lg:text-5xl" : "text-xl md:text-2xl"}`}>
        {name1}
      </span>
      <span className={`font-light tracking-widest uppercase my-1 ${large ? "text-lg" : "text-sm"} ${isRestDisplay ? "text-amber-400" : "text-green-400"}`}>
        {isRestDisplay ? "" : "vs"}
      </span>
      <span className={`font-bold leading-tight ${large ? "text-3xl md:text-4xl lg:text-5xl" : "text-xl md:text-2xl"} ${isRestDisplay ? "text-amber-400 italic" : "text-white"}`}>
        {name2}
      </span>
    </motion.div>
  );
}