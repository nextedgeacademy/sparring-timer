import React from "react";
import { Button } from "@/components/ui/button";
import { Play, ArrowLeft, Flame } from "lucide-react";
import MatchupGrid from "./MatchupGrid";
import GoalDisplay from "./GoalDisplay";
import { motion } from "framer-motion";

export default function BracketsPreview({ session, actions, onBackToWarmup }) {
  const isWarmup = session.status === "warmup";

  if (session.status !== "brackets_preview" && !isWarmup) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header with Goals */}
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <h1 className="text-xl font-bold text-white">ROUND 1 BRACKETS</h1>
        <div className="flex-1 mx-6">
          <GoalDisplay
            boxingGoal={session.boxingGoal}
            muayThaiGoal={session.muayThaiGoal}
            large={true}
          />
        </div>
      </div>

      {/* Warmup Timer or Matchups */}
      {isWarmup ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="text-6xl font-black text-yellow-400 font-mono">
            {Math.floor(session.timeLeft / 60)}:
            {(session.timeLeft % 60).toString().padStart(2, "0")}
          </div>
          <div className="text-white/50 text-lg mt-4">Warming Up...</div>
        </div>
      ) : (
        <div className="flex-1 p-6 overflow-auto">
          <MatchupGrid matchups={session.matchups} />
        </div>
      )}

      {/* Start Button */}
      {!isWarmup && (
        <div className="p-6 border-t border-white/5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-3 flex-wrap"
          >
            <Button
              onClick={actions.clearSession}
              size="lg"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 gap-2 px-6"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </Button>

            {onBackToWarmup && (
              <Button
                onClick={onBackToWarmup}
                size="lg"
                variant="outline"
                className="border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 gap-2 px-6"
              >
                <Flame className="w-5 h-5" />
                Back to Warm-Up
              </Button>
            )}

            <Button
              onClick={actions.startWarmup}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 gap-2"
            >
              <Play className="w-5 h-5" />
              Start (20s Warmup)
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}