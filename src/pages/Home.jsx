import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSessionState } from "../components/sparring/useSessionState";
import SetupPanel from "../components/sparring/SetupPanel";
import SessionControls from "../components/sparring/SessionControls";
import MatchupGrid from "../components/sparring/MatchupGrid";
import TimerDisplay from "../components/sparring/TimerDisplay";
import GoalDisplay from "../components/sparring/GoalDisplay";
import SoundUploader from "../components/sparring/SoundUploader";
import BracketsPreview from "../components/sparring/BracketsPreview";

import { Button } from "@/components/ui/button";
import { Settings, Monitor, Maximize, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

function HomeContent() {
  const [isAuthed, setIsAuthed] = React.useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          base44.auth.redirectToLogin();
          return;
        }
        if (user?.gym_id) {
          localStorage.setItem("gym_id", user.gym_id);
        }
        setIsAuthed(true);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    checkAuth();
  }, []);

  if (isAuthed === null) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  const { session, actions } = useSessionState();
  const isActive = session.status === "running" || session.status === "rest" || session.status === "paused" || session.status === "warmup";
  const isComplete = session.status === "complete";

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
  const displayGoals = session.phase === "rest" ? session.nextGoals : session.goals;
  const displayRound = session.phase === "rest" ? session.globalRound + 1 : session.globalRound;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header with Goals and TV Buttons */}
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex-1 mx-6">
          <GoalDisplay goals={displayGoals} large={true} />
        </div>
        {session.status === "paused" && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full animate-pulse mr-4">
            PAUSED
          </span>
        )}
        <div className="flex gap-2">
         <Button
           variant="outline"
           size="sm"
           className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 font-semibold gap-1"
           onClick={() => window.open(createPageUrl("TVMode"), "_blank")}
         >
           <Monitor className="w-3 h-3" /> TV
         </Button>
         <Button
           variant="outline"
           size="sm"
           className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 font-semibold gap-1"
           onClick={() => window.open(createPageUrl("TVMode") + "?fullscreen=true", "_blank")}
         >
           <Maximize className="w-3 h-3" /> Fullscreen
         </Button>
        </div>
      </div>

      {/* Timer with Round */}
      <div className="flex justify-center items-center py-4 gap-8">
        <div className="text-4xl md:text-5xl font-black text-white">
          {isWarmup ? "WARMING UP..." : (session.phase === "rest" ? "REST — UP NEXT" : `ROUND ${displayRound}`)}
        </div>
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

export default function Home() {
  return <HomeContent />;
}