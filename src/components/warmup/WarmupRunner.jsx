import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SkipForward, Pause, Play, SkipBack, Flag } from "lucide-react";

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function WarmupMatchupPreview({ matchups, boxingGoal, muayThaiGoal }) {
  if (!matchups || matchups.length === 0) {
    return (
      <div className="w-full text-center">
        <div className="text-sm text-white/50">No matchups available</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="text-center">
        <div className="text-lg font-bold text-white">ROUND 1</div>
        <div className="text-xs uppercase tracking-wider text-white/40">
          Matchups
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xl md:grid-cols-3 md:text-xl xl:grid-cols-4">
        {matchups.map((match, i) => {
          const a = match?.athlete1 ?? "";
          const b = match?.athlete2 ?? "";

          const isRest =
            a === "__REST__" ||
            b === "__REST__" ||
            a === "REST" ||
            b === "REST";

          if (isRest) {
            const name = a === "__REST__" || a === "REST" ? b : a;

            return (
              <div key={i} className="italic text-amber-400">
                {name} (Rest)
              </div>
            );
          }

          return (
            <div key={i} className="text-white/90">
              {a} vs {b}
            </div>
          );
        })}
      </div>

      {(boxingGoal || muayThaiGoal) && (
        <div className="space-y-1 border-t border-white/10 pt-2 text-center text-xl md:text-2xl">
          {<div className="text-red-400">Boxing: {boxingGoal}</div>}
          {muayThaiGoal && (
            <div className="text-blue-400 font-bold">Muay Thai: {muayThaiGoal}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WarmupRunner({
  segments,
  autoAdvance,
  onComplete,
  onSkipWarmup,
  previewMatchups = [],
  boxingGoal = "",
  muayThaiGoal = "",
}) {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(segments[0]?.duration || 0);
  const [paused, setPaused] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const timerRef = useRef(null);
  const workAudioRef = useRef(
    new Audio("https://nextedgeacademy.b-cdn.net/Audio/Gong3.mp3")
  );
  const restAudioRef = useRef(
    new Audio("https://nextedgeacademy.b-cdn.net/Audio/Gong.mp3")
  );

  const segment = segments[idx] || null;

  const blockLabel = useMemo(() => {
    if (!segment) return "";
    return segment.totalCycles > 1
      ? `Block ${segment.blockIndex + 1} of ${segment.totalBlocks} · Set ${segment.cycleIndex + 1}/${segment.totalCycles}`
      : `Block ${segment.blockIndex + 1} of ${segment.totalBlocks}`;
  }, [segment]);

  useEffect(() => {
    if (!segment) return;

    setTimeLeft(segment.duration);

    if (segment.type === "work") {
      workAudioRef.current.currentTime = 0;
      workAudioRef.current.play().catch(() => {});
    } else {
      restAudioRef.current.currentTime = 0;
      restAudioRef.current.play().catch(() => {});
    }
  }, [idx, segment]);

  useEffect(() => {
    if (paused || transitioning || !segment) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSegmentEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [idx, paused, transitioning, segment]);

  function handleSegmentEnd() {
    const next = idx + 1;

    if (next >= segments.length) {
      onComplete();
      return;
    }

    if (autoAdvance) {
      goTo(next);
    } else {
      setPaused(true);
      setIdx(next);
    }
  }

  function goTo(newIdx) {
    clearInterval(timerRef.current);

    if (newIdx < 0 || newIdx >= segments.length) return;

    setIdx(newIdx);
    setTimeLeft(segments[newIdx].duration);
    setPaused(false);
  }

  if (!segment) return null;

  const isWork = segment.type === "work";
  const progress = segment.duration > 0 ? timeLeft / segment.duration : 1;

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex h-full flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-5xl">
              <div className="mb-5">
                <div className="mb-1 flex justify-between text-[11px] text-white/30">
                  <span>{blockLabel}</span>
                  <span>
                    Segment {idx + 1} / {segments.length}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className={`h-full rounded-full ${
                      isWork ? "bg-red-500" : "bg-blue-500"
                    }`}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="space-y-4 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={segment.type}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`inline-block rounded-full border px-4 py-1.5 text-sm font-black uppercase tracking-widest ${
                      isWork
                        ? "border-red-500/40 bg-red-600/30 text-red-400"
                        : "border-blue-500/40 bg-blue-600/30 text-blue-400"
                    }`}
                  >
                    {isWork ? "WORK" : "REST"}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.h1
                    key={segment.blockTitle + idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-5xl font-black leading-tight text-white md:text-6xl xl:text-7xl"
                  >
                    {segment.blockTitle}
                  </motion.h1>
                </AnimatePresence>

                <motion.div
                  key={timeLeft}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className={`tabular-nums text-[7rem] font-black leading-none md:text-[9rem] xl:text-[11rem] ${
                    timeLeft <= 5 && isWork
                      ? "text-red-400"
                      : timeLeft <= 5
                      ? "text-blue-400"
                      : "text-white"
                  }`}
                >
                  {fmt(timeLeft)}
                </motion.div>

                {!isWork && segments[idx + 1] && (
                  <div className="text-2xl text-white/50 md:text-3xl xl:text-4xl">
                    Up Next:{" "}
                    <span className="font-bold text-white">
                      {segments[idx + 1].blockTitle}
                    </span>
                  </div>
                )}

                {segment.notes && (
                  <p className="mx-auto max-w-2xl text-sm italic text-white/40 md:text-base">
                    {segment.notes}
                  </p>
                )}

                {paused && (
                  <div className="inline-block animate-pulse rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-bold text-amber-400">
                    PAUSED
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full">
            <WarmupMatchupPreview
              matchups={previewMatchups}
              boxingGoal={boxingGoal}
              muayThaiGoal={muayThaiGoal}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {paused ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaused(false)}
              className="gap-1 border-green-700 bg-green-900/50 text-green-300 hover:bg-green-800"
            >
              <Play className="h-3 w-3" /> Resume
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaused(true)}
              className="gap-1 border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
            >
              <Pause className="h-3 w-3" /> Pause
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            className="gap-1 border-amber-700 bg-amber-900/50 text-amber-300 hover:bg-amber-800 disabled:opacity-30"
          >
            <SkipBack className="h-3 w-3" /> Prev
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(idx + 1)}
            disabled={idx >= segments.length - 1}
            className="gap-1 border-amber-700 bg-amber-900/50 text-amber-300 hover:bg-amber-800 disabled:opacity-30"
          >
            <SkipForward className="h-3 w-3" /> Next
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onSkipWarmup}
            className="gap-1 border-red-700 bg-red-900/50 text-red-300 hover:bg-red-800"
          >
            <Flag className="h-3 w-3" /> Skip Warm-Up
          </Button>
        </div>
      </div>
    </div>
  );
}