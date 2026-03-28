import React, { useEffect, useRef, useCallback, useState } from "react";
import { useSessionState } from "../components/sparring/useSessionState";
import SetupPanel from "../components/sparring/SetupPanel";
import SessionControls from "../components/sparring/SessionControls";
import MatchupGrid from "../components/sparring/MatchupGrid";
import GoalDisplay from "../components/sparring/GoalDisplay";
import BracketsPreview from "../components/sparring/BracketsPreview";
import WarmupRunner from "../components/warmup/WarmupRunner";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { buildSegments } from "../components/warmup/warmupUtils";

export default function Home() {
  const { session, actions } = useSessionState();
  const prevStatusRef = useRef(session.status);
  const prevPhaseRef = useRef(session.phase);
  const [warmupSegments, setWarmupSegments] = useState(null);
  const [showTransition, setShowTransition] = useState(false);

  const roundStartAudioRef = useRef(null);
  const roundEndAudioRef = useRef(null);
  const boxingSwitchAudioRef = useRef(null);
  const muayThaiSwitchAudioRef = useRef(null);
  const bothSwitchAudioRef = useRef(null);

  const isActive =
    session.status === "running" ||
    session.status === "rest" ||
    session.status === "paused" ||
    session.status === "warmup";

  const stopAllAudio = useCallback(() => {
    [
      roundStartAudioRef,
      roundEndAudioRef,
      boxingSwitchAudioRef,
      muayThaiSwitchAudioRef,
      bothSwitchAudioRef,
    ].forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isActive) {
        stopAllAudio();
        actions.complete();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isActive, actions, stopAllAudio]);

  const isComplete = session.status === "complete";

  useEffect(() => {
    const createAudio = (url) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      return audio;
    };

    roundStartAudioRef.current = createAudio(
      "https://nextedgeacademy.b-cdn.net/Audio/Gong3.mp3"
    );

    roundEndAudioRef.current = createAudio(
      "https://nextedgeacademy.b-cdn.net/Audio/Gong.mp3"
    );

    boxingSwitchAudioRef.current = createAudio(
      "https://nextedgeacademy.b-cdn.net/Audio/boxingswitch.mp3"
    );

    muayThaiSwitchAudioRef.current = createAudio(
      "https://nextedgeacademy.b-cdn.net/Audio/muaythaiswitch.mp3"
    );

    bothSwitchAudioRef.current = createAudio(
      "https://nextedgeacademy.b-cdn.net/Audio/Beep.mp3"
    );
  }, []);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevPhase = prevPhaseRef.current;

    if (prevStatus === "warmup" && session.status === "running") {
      roundStartAudioRef.current?.play().catch(() => {});
    }

    if (prevPhase === "round" && session.phase === "rest") {
      roundEndAudioRef.current?.play().catch(() => {});
    }

    if (
      prevPhase === "rest" &&
      session.phase === "round" &&
      session.status === "running"
    ) {
      roundStartAudioRef.current?.play().catch(() => {});
    }

    prevStatusRef.current = session.status;
    prevPhaseRef.current = session.phase;
  }, [session.status, session.phase]);

  useEffect(() => {
    if (!session.pendingSwitchSound) return;

    const playSwitchSound = async () => {
      try {
        if (session.pendingSwitchSound === "boxing") {
          await boxingSwitchAudioRef.current?.play();
        } else if (session.pendingSwitchSound === "muay_thai") {
          await muayThaiSwitchAudioRef.current?.play();
        } else if (session.pendingSwitchSound === "both") {
          await bothSwitchAudioRef.current?.play();
        }
      } catch (e) {
        // ignore playback errors
      } finally {
        actions.clearPendingSwitchSound?.();
      }
    };

    playSwitchSound();
  }, [session.pendingSwitchSound, actions]);

  useEffect(() => {
    if (
      session.status === "brackets_preview" &&
      session.useWarmup &&
      session.selectedWarmupId &&
      !warmupSegments
    ) {
      base44.entities.WarmupTemplate.list()
        .then((all) => {
          const template = all.find((t) => t.id === session.selectedWarmupId);
          if (template) {
            const segs = buildSegments(template);
            if (segs.length > 0) {
              setWarmupSegments(segs);
            }
          }
        })
        .catch(() => {});
    }
  }, [
    session.status,
    session.useWarmup,
    session.selectedWarmupId,
    warmupSegments,
  ]);

  function handleWarmupComplete() {
    setWarmupSegments(null);
    setShowTransition(true);
    setTimeout(() => {
      setShowTransition(false);
      actions.startWarmup();
    }, 3000);
  }

  function handleSkipWarmup() {
    setWarmupSegments(null);
    actions.startWarmup();
  }

  function handleBackToWarmup() {
    if (session.useWarmup && session.selectedWarmupId) {
      base44.entities.WarmupTemplate.list()
        .then((all) => {
          const template = all.find((t) => t.id === session.selectedWarmupId);
          if (template) {
            const segs = buildSegments(template);
            if (segs.length > 0) {
              setWarmupSegments(segs);
            }
          }
        })
        .catch(() => {});
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <h1 className="text-5xl font-black text-white">SESSION COMPLETE</h1>
          <p className="text-lg text-white/50">Great work today!</p>
          <Button
            onClick={actions.clearSession}
            size="lg"
            className="gap-2 bg-white font-bold text-gray-950 hover:bg-gray-100"
          >
            <RotateCcw className="h-5 w-5" /> New Session
          </Button>
        </motion.div>
      </div>
    );
  }

  if (session.status === "brackets_preview" && warmupSegments) {
    return (
      <WarmupRunner
        segments={warmupSegments}
        autoAdvance={true}
        onComplete={handleWarmupComplete}
        onSkipWarmup={handleSkipWarmup}
        previewMatchups={session.matchups}
        boxingGoal={session.doBoxing ? session.boxingGoal || "" : ""}
        muayThaiGoal={session.doMuayThai ? session.muayThaiGoal || "" : ""}
        onAddPlayer={actions.addPlayer}
        divisionCount={session.divisionCount || 1}
      />
    );
  }

  if (showTransition) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4 text-center"
        >
          <div className="text-6xl font-black text-white">GET READY</div>
          <div className="text-xl text-white/40">Round Robin Starting…</div>
        </motion.div>
      </div>
    );
  }

  if (session.status === "brackets_preview") {
    return (
      <BracketsPreview
        session={session}
        actions={actions}
        onBackToWarmup={
          session.useWarmup && session.selectedWarmupId
            ? handleBackToWarmup
            : null
        }
      />
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex justify-end gap-2 p-4">
          <Link to={createPageUrl("GoalSettings")}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-gray-600 bg-gray-700 font-semibold text-white hover:bg-gray-600"
            >
              <Settings className="h-3 w-3" /> Goals & Settings
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aaefa79c043dbf1a24d5c7/cb5e094d8_SparringTimerLogoBlackBackground.png"
            alt="Combat Sports Logo"
            className="h-48 w-48"
          />
        </div>

        <div className="mx-auto max-w-4xl px-6">
          <SetupPanel session={session} actions={actions} />
        </div>
      </div>
    );
  }

  const isWarmup = session.status === "warmup";

  const displayMatchups =
    session.phase === "rest"
      ? session.nextMatchups.length > 0
        ? session.nextMatchups
        : session.matchups
      : session.matchups;

  const displayBoxing =
    session.phase === "rest"
      ? session.nextBoxingGoal || session.boxingGoal || ""
      : session.boxingGoal || session.nextBoxingGoal || "";

  const displayMuayThai =
    session.phase === "rest"
      ? session.nextMuayThaiGoal || session.muayThaiGoal || ""
      : session.muayThaiGoal || session.nextMuayThaiGoal || "";

  const displayRound =
    session.phase === "rest" ? session.globalRound + 1 : session.globalRound;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between gap-4 whitespace-nowrap border-b border-white/5 p-4">
        <div className="text-3xl font-black text-white md:text-4xl">
          {isWarmup
            ? "WARMING UP"
            : session.phase === "rest"
            ? "REST — UP NEXT"
            : `ROUND ${displayRound}`}
        </div>

        <div className="mx-4 flex-1">
          <GoalDisplay
            boxingGoal={displayBoxing}
            muayThaiGoal={displayMuayThai}
            large={true}
          />
        </div>

        {session.status === "paused" && (
          <span className="animate-pulse rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
            PAUSED
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          <MatchupGrid
            matchups={displayMatchups}
            timerProps={{
              timeLeft: session.timeLeft,
              phase: session.phase,
              status: session.status,
              roundNumber: displayRound,
              boxingGoal: displayBoxing,
              muayThaiGoal: displayMuayThai,
            }}
          />
        </AnimatePresence>
      </div>

      <div className="border-t border-white/5 p-4">
        <SessionControls
          session={session}
          actions={actions}
          onComplete={() => {
            stopAllAudio();
            actions.complete();
          }}
        />
      </div>
    </div>
  );
}