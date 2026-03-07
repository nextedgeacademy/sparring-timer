import React, { useEffect, useRef } from "react";
import { useSessionState } from "../components/sparring/useSessionState";
import SetupPanel from "../components/sparring/SetupPanel";
import SessionControls from "../components/sparring/SessionControls";
import MatchupGrid from "../components/sparring/MatchupGrid";
import TimerDisplay from "../components/sparring/TimerDisplay";
import GoalDisplay from "../components/sparring/GoalDisplay";
import SoundUploader from "../components/sparring/SoundUploader";
import BracketsPreview from "../components/sparring/BracketsPreview";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { session, actions } = useSessionState();
  const prevStatusRef = useRef(session.status);
  const prevPhaseRef = useRef(session.phase);
  
  const isActive = session.status === "running" || session.status === "rest" || session.status === "paused" || session.status === "warmup";
  const isComplete = session.status === "complete";

  // Sound playback on state changes
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevPhase = prevPhaseRef.current;

    // Warmup ended -> round started
    if (prevStatus === "warmup" && session.status === "running") {
      if (session.roundStartSound) {
        try {
          const audio = new Audio(session.roundStartSound);
          audio.play().catch(() => {});
        } catch (e) {}
      }
    }

    // Round ended -> rest started
    if (prevPhase === "round" && session.phase === "rest") {
      if (session.roundEndSound) {
        try {
          const audio = new Audio(session.roundEndSound);
          audio.play().catch(() => {});
        } catch (e) {}
      }
    }

    // Rest ended -> new round started
    if (prevPhase === "rest" && session.phase === "round" && session.status === "running") {
      if (session.roundStartSound) {
        try {
          const audio = new Audio(session.roundStartSound);
          audio.play().catch(() => {});
        } catch (e) {}
      }
    }

    prevStatusRef.current = session.status;
    prevPhaseRef.current = session.phase;
  }, [session.status, session.phase, session.roundStartSound, session.roundEndSound]);

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
          <h1 className="text-5xl font-black text-white">SESSION COMPLETE</h1>
          <p className="text-white/50 text-lg">Great work today!</p>
          <Button onClick={actions.clearSession} size="lg" className="bg-white text-gray-950 hover:bg-gray-100 font-bold gap-2">
            <RotateCcw className="w-5 h-5" /> New Session
          </Button>
        </motion.div>
      </div>
    );
  }

  if (session.status === "brackets_preview") {
    return <BracketsPreview session={session} actions={actions} />;
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex justify-end p-4 gap-2">
          <Link to={createPageUrl("GoalSettings")}>
           <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 font-semibold gap-1">
             <Settings className="w-3 h-3" /> Goals & Settings
           </Button>
          </Link>
        </div>
        {/* Logo and Title */}
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aaefa79c043dbf1a24d5c7/cb5e094d8_SparringTimerLogoBlackBackground.png" alt="Combat Sports Logo" className="w-32 h-32" />
        </div>
        {/* Sound Uploader in setup */}
        <div className="max-w-4xl mx-auto px-6">
          <SetupPanel session={session} actions={actions} />
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mt-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Sound Upload</h2>
            <SoundUploader session={session} actions={actions} />
          </div>
        </div>
      </div>
    );
  }

  // Active session view (Admin/Control) or Warmup
  const isWarmup = session.status === "warmup";
  const displayMatchups = session.phase === "rest" ? (session.nextMatchups.length > 0 ? session.nextMatchups : session.matchups) : session.matchups;
  const displayBoxing = session.phase === "rest" ? (session.nextBoxingGoal || session.boxingGoal) : session.boxingGoal;
  const displayMuayThai = session.phase === "rest" ? (session.nextMuayThaiGoal || session.muayThaiGoal) : session.muayThaiGoal;
  const displayRound = session.phase === "rest" ? session.globalRound + 1 : session.globalRound;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header - Round, Goals */}
      <div className="p-4 flex items-center justify-between gap-4 border-b border-white/5 whitespace-nowrap">
        <div className="text-3xl md:text-4xl font-black text-white">
          {isWarmup ? "WARMING UP" : (session.phase === "rest" ? "REST — UP NEXT" : `ROUND ${displayRound} —`)}
        </div>
        <div className="flex-1 mx-4">
          <GoalDisplay boxingGoal={displayBoxing} muayThaiGoal={displayMuayThai} large={true} />
        </div>
        {session.status === "paused" && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full animate-pulse">
            PAUSED
          </span>
        )}
      </div>

      {/* Timer */}
      <div className="flex justify-center py-4 border-b border-white/5">
        <TimerDisplay timeLeft={session.timeLeft} phase={session.phase} />
      </div>

      {/* Matchups */}
      <div className="flex-1 p-4 overflow-auto">
        <AnimatePresence mode="wait">
          <MatchupGrid matchups={displayMatchups} />
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-white/5">
        <SessionControls session={session} actions={actions} />
      </div>
    </div>
  );
}