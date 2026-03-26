import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SkipForward, Pause, Play, SkipBack, Flag } from "lucide-react";

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function WarmupRunner({ segments, autoAdvance, onComplete, onSkipWarmup }) {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(segments[0]?.duration || 0);
  const [paused, setPaused] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const segment = segments[idx] || null;

  // Reset timer when segment changes
  useEffect(() => {
    if (segment) setTimeLeft(segment.duration);
  }, [idx]);

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
  }, [idx, paused, transitioning]);

  function handleSegmentEnd() {
    const next = idx + 1;
    if (next >= segments.length) {
      // warm-up complete
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
  const progress = segment.duration > 0 ? (timeLeft / segment.duration) : 1;

  // Unique blocks visited (for "Block X of Y" display)
  const blockLabel = segment.totalCycles > 1
    ? `Block ${segment.blockIndex + 1} of ${segment.totalBlocks} · Set ${segment.cycleIndex + 1}/${segment.totalCycles}`
    : `Block ${segment.blockIndex + 1} of ${segment.totalBlocks}`;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Main centered content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Progress bar */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex justify-between text-white/30 text-xs mb-1">
            <span>{blockLabel}</span>
            <span>Segment {idx + 1} / {segments.length}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isWork ? "bg-red-500" : "bg-blue-500"}`}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="w-full max-w-2xl text-center space-y-6">
          {/* WORK / REST badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={segment.type}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`inline-block px-6 py-2 rounded-full font-black text-lg tracking-widest uppercase ${
                isWork
                  ? "bg-red-600/30 text-red-400 border border-red-500/40"
                  : "bg-blue-600/30 text-blue-400 border border-blue-500/40"
              }`}
            >
              {isWork ? "WORK" : "REST"}
            </motion.div>
          </AnimatePresence>

          {/* Block title */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={segment.blockTitle + idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-9xl font-black text-white leading-tight"
            >
              {segment.blockTitle}
            </motion.h1>
          </AnimatePresence>

          {/* Timer */}
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className={`text-[12rem] font-black tabular-nums leading-none ${
              timeLeft <= 5 && isWork ? "text-red-400" : timeLeft <= 5 ? "text-blue-400" : "text-white"
            }`}
          >
            {fmt(timeLeft)}
          </motion.div>

          {/* Up Next (shown during rest) */}
          {!isWork && segments[idx + 1] && (
            <div className="text-white/50 text-xl">
              Up Next: <span className="text-white font-bold">{segments[idx + 1].blockTitle}</span>
            </div>
          )}

          {/* Notes */}
          {segment.notes && (
            <p className="text-white/40 text-lg italic max-w-lg mx-auto">{segment.notes}</p>
          )}

          {/* Paused indicator */}
          {paused && (
            <div className="px-4 py-1.5 bg-amber-500/20 text-amber-400 text-sm font-bold rounded-full inline-block animate-pulse">
              PAUSED
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls — matches SessionControls style */}
      <div className="border-t border-white/5 p-4">
        <div className="flex flex-wrap gap-2 items-center">
          {paused ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaused(false)}
              className="gap-1 bg-green-900/50 border-green-700 text-green-300 hover:bg-green-800"
            >
              <Play className="w-3 h-3" /> Resume
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPaused(true)}
              className="gap-1 bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
            >
              <Pause className="w-3 h-3" /> Pause
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            className="gap-1 bg-amber-900/50 border-amber-700 text-amber-300 hover:bg-amber-800 disabled:opacity-30"
          >
            <SkipBack className="w-3 h-3" /> Prev
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => goTo(idx + 1)}
            disabled={idx >= segments.length - 1}
            className="gap-1 bg-amber-900/50 border-amber-700 text-amber-300 hover:bg-amber-800 disabled:opacity-30"
          >
            <SkipForward className="w-3 h-3" /> Next
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onSkipWarmup}
            className="gap-1 bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800"
          >
            <Flag className="w-3 h-3" /> Skip Warm-Up
          </Button>
        </div>
      </div>
    </div>
  );
}