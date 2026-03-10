import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Play, Monitor, Maximize } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from "@/utils";

export default function SetupPanel({ session, actions }) {
  const [divisionCount, setDivisionCount] = useState(session.divisionCount || 1);
  const [divTexts, setDivTexts] = useState(["", "", ""]);
  const [roundTime, setRoundTime] = useState(Math.floor(session.roundTime / 60));
  const [restTime, setRestTime] = useState(Math.floor(session.restTime / 60));
  const [roundTimeSec, setRoundTimeSec] = useState(session.roundTime % 60);
  const [restTimeSec, setRestTimeSec] = useState(session.restTime % 60);
  const [doBoxing, setDoBoxing] = useState(true);
  const [doMuayThai, setDoMuayThai] = useState(true);

  const { data: goals = [] } = useQuery({
    queryKey: ["sparring-goals"],
    queryFn: () => base44.entities.SparringGoal.list(),
  });

  const pickRandomGoal = (type) => {
    const enabled = goals.filter(g => g.type === type && g.enabled !== false);
    if (enabled.length === 0) return "";
    return enabled[Math.floor(Math.random() * enabled.length)].text;
  };

  const handleCreateBrackets = () => {
    const divisions = divTexts.map(text =>
      text.split("\n").map(n => n.trim()).filter(n => n.length > 0)
    );

    const totalRoundTime = roundTime * 60 + (roundTimeSec || 0);
    const totalRestTime = restTime * 60 + (restTimeSec || 0);

    actions.updateSettings({
      roundTime: totalRoundTime,
      restTime: totalRestTime,
      repeatMode: session.repeatMode || "same",
    });

    const boxingGoal = doBoxing ? pickRandomGoal("boxing") : "";
    const muayThaiGoal = doMuayThai ? pickRandomGoal("muay_thai") : "";
    const nextBoxing = doBoxing ? pickRandomGoal("boxing") : "";
    const nextMuayThai = doMuayThai ? pickRandomGoal("muay_thai") : "";

    actions.updateSettings({ nextBoxingGoal: nextBoxing, nextMuayThaiGoal: nextMuayThai });

    setTimeout(() => {
  actions.createBrackets(
  divisions,
  divisionCount,
  boxingGoal,
  muayThaiGoal,
  doBoxing,
  doMuayThai
);
    }, 50);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">COMBAT SPORTS - SPARRING TIMER</h1>
        <p className="text-white/50 text-sm">Round Robin Timer</p>
      </div>

      {/* Timer Settings */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Timer Settings</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-white/70">Round Duration</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input type="number" min={0} value={roundTime} onChange={e => setRoundTime(parseInt(e.target.value) || 0)} className="bg-white/10 border-white/20 text-white text-center text-lg" />
                <span className="text-white/40 text-xs">min</span>
              </div>
              <div className="flex-1">
                <Input type="number" min={0} max={59} value={roundTimeSec} onChange={e => setRoundTimeSec(parseInt(e.target.value) || 0)} className="bg-white/10 border-white/20 text-white text-center text-lg" />
                <span className="text-white/40 text-xs">sec</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Rest Duration</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input type="number" min={0} value={restTime} onChange={e => setRestTime(parseInt(e.target.value) || 0)} className="bg-white/10 border-white/20 text-white text-center text-lg" />
                <span className="text-white/40 text-xs">min</span>
              </div>
              <div className="flex-1">
                <Input type="number" min={0} max={59} value={restTimeSec} onChange={e => setRestTimeSec(parseInt(e.target.value) || 0)} className="bg-white/10 border-white/20 text-white text-center text-lg" />
                <span className="text-white/40 text-xs">sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Division Setup */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Divisions</h2>
          <Select value={String(divisionCount)} onValueChange={v => setDivisionCount(parseInt(v))}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Division</SelectItem>
              <SelectItem value="2">2 Divisions</SelectItem>
              <SelectItem value="3">3 Divisions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${divisionCount}, 1fr)` }}>
          {Array.from({ length: divisionCount }, (_, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-white/70">Division {i + 1} Athletes</Label>
              <Textarea
                placeholder={"One name per line...\nBruce Hoyer\nJohn Smith\nAdam Lee"}
                value={divTexts[i]}
                onChange={e => {
                  const copy = [...divTexts];
                  copy[i] = e.target.value;
                  setDivTexts(copy);
                }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[200px] font-mono"
              />
              <p className="text-white/40 text-xs">
                {divTexts[i].split("\n").filter(n => n.trim()).length} athletes
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sports Selection */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Sports</h2>
        <p className="text-white/40 text-sm">Select which disciplines will be used this session.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div
            onClick={() => setDoBoxing(v => !v)}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              doBoxing
                ? "bg-red-500/15 border-red-500/50"
                : "bg-white/5 border-white/10 opacity-50"
            }`}
          >
            <span className="text-3xl">🥊</span>
            <div className="flex-1">
              <div className="text-white font-bold">Boxing</div>
              <div className="text-white/40 text-xs">Boxing goals & role switching</div>
            </div>
            <Switch checked={doBoxing} onCheckedChange={setDoBoxing} onClick={e => e.stopPropagation()} />
          </div>

          <div
            onClick={() => setDoMuayThai(v => !v)}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              doMuayThai
                ? "bg-blue-500/15 border-blue-500/50"
                : "bg-white/5 border-white/10 opacity-50"
            }`}
          >
            <span className="text-3xl">🦵</span>
            <div className="flex-1">
              <div className="text-white font-bold">Muay Thai</div>
              <div className="text-white/40 text-xs">Muay Thai goals & role switching</div>
            </div>
            <Switch checked={doMuayThai} onCheckedChange={setDoMuayThai} onClick={e => e.stopPropagation()} />
          </div>
        </div>
      </div>

      {/* Repeat Mode */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Schedule Loop</h2>
        <Select value={session.repeatMode || "same"} onValueChange={v => actions.updateSettings({ repeatMode: v })}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="same">Repeat Same Order</SelectItem>
            <SelectItem value="reshuffle">Reshuffle Each Cycle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={handleCreateBrackets} size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-8 gap-2">
          <Play className="w-5 h-5" /> Create Brackets
        </Button>
      </div>
    </div>
  );
}