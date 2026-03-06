import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useSessionState } from "../components/sparring/useSessionState";
import MatchupGrid from "../components/sparring/MatchupGrid";
import TimerDisplay from "../components/sparring/TimerDisplay";
import GoalDisplay from "../components/sparring/GoalDisplay";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, Pause, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TVMode() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        setIsAuthed(true);
      } catch (err) {
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    checkAuth();
  }, []);

  const { session, actions } = useSessionState();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef(null);
  const controlTimer = useRef(null);

  // Auto-enter fullscreen if URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fullscreen") === "true") {
      enterFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const enterFullscreen = () => {
    const el = containerRef.current || document.documentElement;
    el.requestFullscreen?.().catch(() => {});
  };

  const exitFullscreen = () => {
    document.exitFullscreen?.().catch(() => {});
  };

  // Show controls on mouse move, auto-hide after 3s
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlTimer.current) clearTimeout(controlTimer.current);
    controlTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  if (!isAuthed) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  const isActive = session.status === "running" || session.status === "rest" || session.status === "paused" || session.status === "warmup" || session.status === "brackets_preview";
  const isComplete = session.status === "complete";
  const isWarmup = session.status === "warmup";

  const displayMatchups = session.phase === "rest"
    ? (session.nextMatchups?.length > 0 ? session.nextMatchups : session.matchups)
    : session.matchups;
  const displayGoals = session.phase === "rest" ? session.nextGoals : session.goals;
  const displayRound = session.phase === "rest" ? session.globalRound + 1 : session.globalRound;

  if (!isActive && !isComplete) {
    return (
      <div
        ref={containerRef}
        className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8"
      >
        <h1 className="text-4xl font-black text-white/30 mb-6">WAITING FOR SESSION</h1>
        <p className="text-white/20 text-lg mb-8">Start a session from the admin view</p>
        {!isFullscreen && (
          <Button onClick={enterFullscreen} className="bg-white/10 text-white border border-white/20 hover:bg-white/20 gap-2">
            <Maximize className="w-4 h-4" /> Enter Fullscreen
          </Button>
        )}
      </div>
    );
  }

  if (isComplete) {
    return (
      <div ref={containerRef} className="min-h-screen bg-black flex items-center justify-center">
        <h1 className="text-6xl font-black text-white">SESSION COMPLETE</h1>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black flex flex-col cursor-none select-none"
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      {/* Header bar - all on one line */}
      <div className="px-6 py-3 flex items-center justify-between gap-4 whitespace-nowrap">
        <div className={`text-2xl font-bold uppercase tracking-widest ${isWarmup ? "text-yellow-400" : (session.phase === "rest" ? "text-amber-400" : "text-white/50")}`}>
          {isWarmup ? "WARMING UP" : (session.phase === "rest" ? "REST — UP NEXT" : `ROUND ${displayRound}`)}
        </div>
        {session.status === "paused" && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full animate-pulse">
            PAUSED
          </span>
        )}
        <div className="flex items-center gap-6 flex-1 justify-center">
          <GoalDisplay goals={displayGoals} large />
        </div>
        <div className="text-3xl font-black font-mono text-white" style={{ minWidth: "80px", textAlign: "right" }}>
          {Math.floor(session.timeLeft / 60)}:{(session.timeLeft % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {/* Matchups - takes most space */}
      <div className="flex-1 px-6 pb-6 flex items-center">
        <AnimatePresence mode="wait">
          <MatchupGrid matchups={displayMatchups} large />
        </AnimatePresence>
      </div>

      {/* Minimal overlay controls (on hover) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 right-4 flex gap-2 cursor-default"
          >
            {isFullscreen ? (
              <Button
                size="sm"
                variant="outline"
                onClick={exitFullscreen}
                className="bg-black/80 border-white/20 text-white/70 hover:bg-black gap-1"
              >
                <Minimize className="w-3 h-3" /> Exit Fullscreen
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={enterFullscreen}
                className="bg-black/80 border-white/20 text-white/70 hover:bg-black gap-1"
              >
                <Maximize className="w-3 h-3" /> Fullscreen
              </Button>
            )}
            {session.status === "paused" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={actions.resume}
                className="bg-green-900/80 border-green-700 text-green-300 hover:bg-green-800 gap-1"
              >
                <Play className="w-3 h-3" /> Resume
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={actions.pause}
                className="bg-black/80 border-white/20 text-white/70 hover:bg-black gap-1"
              >
                <Pause className="w-3 h-3" /> Pause
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}