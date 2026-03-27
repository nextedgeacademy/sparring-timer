import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SkipForward, Pause, Play, SkipBack, Flag } from "lucide-react";

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function parseRoleGoal(goalText) {
  if (!goalText || typeof goalText !== "string") return null;

  const parts = goalText
    .split(/\s+vs\.?\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 2) return null;

  return {
    leftRole: parts[0],
    rightRole: parts[1],
  };
}

function getPreviewNames(match) {
  const athlete1 = match?.athlete1 ?? "";
  const athlete2 = match?.athlete2 ?? "";

  const isRest =
    athlete1 === "__REST__" ||
    athlete2 === "__REST__" ||
    athlete1 === "REST" ||
    athlete2 === "REST";

  if (isRest) {
    const activeName =
      athlete1 === "__REST__" || athlete1 === "REST" ? athlete2 : athlete1;

    return {
      leftName: activeName || "Rest Round",
      rightName: "Rest Round",
      isRest: true,
    };
  }

  return {
    leftName: athlete1,
    rightName: athlete2,
    isRest: false,
  };
}

function PreviewRoleCard({ title, goalText, accentClass }) {
  const parsed = parseRoleGoal(goalText);

  if (!goalText) return null;

  if (!parsed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className={`mb-2 text-[10px] font-black uppercase tracking-[0.2em] ${accentClass}`}>
          {title}
        </div>
        <div className="text-xs font-semibold leading-snug text-white">
          {goalText}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className={`mb-2 text-[10px] font-black uppercase tracking-[0.2em] ${accentClass}`}>
        {title}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-white/50">
            Left
          </span>
          <span className="text-right font-bold text-white">
            {parsed.leftRole}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl bg-white/5 p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-white/50">
            Right
          </span>
          <span className="text-right font-bold text-white">
            {parsed.rightRole}
          </span>
        </div>
      </div>
    </div>
  );
}

function WarmupMatchupPreview({ matchups, boxingGoal, muayThaiGoal }) {
  if (!matchups || matchups.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-base font-bold text-white/70">Round 1 Preview</div>
        <div className="mt-1 text-xs text-white/40">
          No round robin names available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-3">
        <div className="text-xl font-black leading-none text-white">ROUND 1 PREVIEW</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
          Matchups during warm-up
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {matchups.map((match, i) => {
          const { leftName, rightName, isRest } = getPreviewNames(match);

          return (
            <motion.div
              key={`${leftName}-${rightName}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className={`rounded-2xl border p-3 ${
                isRest
                  ? "border-amber-700/30 bg-amber-950/30"
                  : "border-green-700/30 bg-green-950/20"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70">
                  {i + 1}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  {isRest ? "Rest" : "Match"}
                </div>
              </div>

              <div className="min-w-0">
                <div className="break-words text-base font-bold leading-tight text-white">
                  {leftName}
                </div>

                <div
                  className={`my-1 text-[10px] uppercase tracking-[0.25em] ${
                    isRest ? "text-amber-400" : "text-green-400"
                  }`}
                >
                  {isRest ? "" : "vs"}
                </div>

                <div
                  className={`break-words text-base font-bold leading-tight ${
                    isRest ? "italic text-amber-300" : "text-white"
                  }`}
                >
                  {rightName}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {(boxingGoal || muayThaiGoal) && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <PreviewRoleCard
            title="Boxing roles"
            goalText={boxingGoal}
            accentClass="text-red-400"
          />

          <PreviewRoleCard
            title="Muay Thai roles"
            goalText={muayThaiGoal}
            accentClass="text-blue-400"
          />
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
    <div className="min-h-screen bg-gray-950 flex flex-col">
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
                    className="text-3xl font-black leading-tight text-white md:text-4xl xl:text-5xl"
                  >
                    {segment.blockTitle}
                  </motion.h1>
                </AnimatePresence>

                <motion.div
                  key={timeLeft}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className={`tabular-nums text-[4.5rem] font-black leading-none md:text-[6rem] xl:text-[7rem] ${
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
                  <div className="text-lg text-white/50 md:text-xl xl:text-2xl">
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