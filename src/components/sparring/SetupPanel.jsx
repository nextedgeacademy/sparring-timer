import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Play, Monitor, Maximize } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function SetupPanel({ session, actions }) {
  const [divisionCount, setDivisionCount] = useState(session.divisionCount || 1);
  const [divTexts, setDivTexts] = useState(["", "", ""]);
  const [divisionNames, setDivisionNames] = useState(["Division 1", "Division 2", "Division 3"]);
  const [roundTime, setRoundTime] = useState(Math.floor(session.roundTime / 60));
  const [restTime, setRestTime] = useState(Math.floor(session.restTime / 60));
  const [roundTimeSec, setRoundTimeSec] = useState(session.roundTime % 60);
  const [restTimeSec, setRestTimeSec] = useState(session.restTime % 60);
  const [selectedTypes, setSelectedTypes] = useState(session.selectedSparringTypes || []);

  useEffect(() => {
    const loadDivisionNames = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const gymId = localStorage.getItem("gym_id");
          if (gymId) {
            const divSettings = await base44.entities.DivisionSettings.filter({
              gym_id: gymId,
            });
            if (divSettings.length > 0) {
              setDivisionNames(divSettings[0].division_names);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load division names:", err);
      }
    };
    loadDivisionNames();
  }, []);

  const { data: goals = [] } = useQuery({
    queryKey: ["sparring-goals"],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      const gymId = localStorage.getItem("gym_id");
      if (!gymId) return [];
      return base44.entities.SparringGoal.filter({ gym_id: gymId });
    },
  });

  const sparringTypes = [
    { id: "bjj", label: "BJJ" },
    { id: "boxing", label: "Boxing" },
    { id: "mma", label: "MMA" },
    { id: "muay_thai", label: "Muay Thai" },
  ];

  const toggleType = (typeId) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(t => t !== typeId);
      } else if (prev.length < 2) {
        return [...prev, typeId];
      }
      return prev;
    });
  };

  const pickRandomGoal = (sparringType) => {
    const enabled = goals.filter(g => g.sparringType === sparringType && g.enabled);
    if (enabled.length === 0) {
      console.warn(`No goals found for ${sparringType}. Available goals:`, goals);
      return null;
    }
    return enabled[Math.floor(Math.random() * enabled.length)].text;
  };

  const handleCreateBrackets = async () => {
    if (selectedTypes.length === 0) return;

    const divisions = divTexts.map(text =>
      text.split("\n").map(n => n.trim()).filter(n => n.length > 0)
    );

    const totalRoundTime = roundTime * 60 + (roundTimeSec || 0);
    const totalRestTime = restTime * 60 + (restTimeSec || 0);

    // Save custom division names
    try {
      const gymId = localStorage.getItem("gym_id");
      if (gymId) {
        const divSettings = await base44.entities.DivisionSettings.filter({
          gym_id: gymId,
        });
        if (divSettings.length > 0) {
          await base44.entities.DivisionSettings.update(divSettings[0].id, {
            division_names: divisionNames,
          });
        }
      }
    } catch (err) {
      console.error("Failed to save division names:", err);
    }

    actions.updateSettings({
      roundTime: totalRoundTime,
      restTime: totalRestTime,
      repeatMode: session.repeatMode || "same",
      divisionNames: divisionNames,
    });

    // Pick initial goals based on selected types
    const initialGoals = {};
    selectedTypes.forEach(type => {
      const goal = pickRandomGoal(type);
      if (goal) {
        initialGoals[type] = goal;
      }
    });

    setTimeout(() => {
      actions.createBrackets(divisions, divisionCount, initialGoals, selectedTypes);
    }, 50);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69aaefa79c043dbf1a24d5c7/bcad1fbfb_SparringTimerLogoBlackBackground.png" alt="SparringTimer" className="w-24 h-24 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight">COMBAT SPORTS SPARRING SESSION</h1>
          <p className="text-white/50 text-sm">Round Robin Timer</p>
        </div>
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
          <h2 className="text-lg font-bold text-white">Create Divisions - For Setup Only, Not Shown on Grid.</h2>
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
              <Label className="text-white/70">Division Name</Label>
              <Input
                value={divisionNames[i] || ""}
                onChange={e => {
                  const copy = [...divisionNames];
                  copy[i] = e.target.value;
                  setDivisionNames(copy);
                }}
                placeholder={`e.g., Kids Beginners`}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-3"
              />
              <Label className="text-white/70">Athletes</Label>
              <Textarea
                placeholder={"One name per line...\nBruce Hoyer\nJohn Smith\nAdam Lee"}
                value={divTexts[i]}
                onChange={e => {
                  const copy = [...divTexts];
                  copy[i] = e.target.value;
                  setDivTexts(copy);
                }}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[150px] font-mono"
              />
              <p className="text-white/40 text-xs">
                {divTexts[i].split("\n").filter(n => n.trim()).length} athletes
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sparring Types */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Sparring Types Today</h2>
        <p className="text-white/50 text-sm">Select 1-2 types (required)</p>
        <div className="grid grid-cols-2 gap-3">
          {sparringTypes.map(type => (
            <button
              key={type.id}
              onClick={() => toggleType(type.id)}
              className={`p-4 rounded-xl border-2 transition font-semibold ${
                selectedTypes.includes(type.id)
                  ? "bg-white/20 border-white/50 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Repeat Mode */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Schedule Loop - What should we do when the bracket finishes.</h2>
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
        <Button onClick={handleCreateBrackets} disabled={selectedTypes.length === 0} size="lg" className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-lg px-8 gap-2">
          <Play className="w-5 h-5" /> Create Brackets
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 font-semibold gap-2"
          onClick={() => window.open(createPageUrl("TVMode"), "_blank")}
        >
          <Monitor className="w-5 h-5" /> Open TV Mode
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 font-semibold gap-2"
          onClick={() => window.open(createPageUrl("TVMode") + "?fullscreen=true", "_blank")}
        >
          <Maximize className="w-5 h-5" /> Fullscreen TV
        </Button>
      </div>
    </div>
  );
}