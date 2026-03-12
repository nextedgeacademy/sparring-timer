import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Trash2, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";

export default function SetupPanel({ session, actions }) {
  const divisionTexts = session.divisionTexts || ["", "", ""];
  const divisionCount = session.divisionCount || 1;
  const roundTime = session.roundTime || 180;
  const restTime = session.restTime || 60;

  const [doBoxing, setDoBoxing] = useState(false);
  const [doMuayThai, setDoMuayThai] = useState(false);
  const [activeDivision, setActiveDivision] = useState(0);

  // Load active athletes from DB
  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes-active"],
    queryFn: () => base44.entities.Athlete.filter({ active: true }, "name"),
  });

  // Compute which athletes are already assigned to any division
  const assignedNames = new Set(
    divisionTexts.flatMap((text) =>
      text.split("\n").map((n) => n.trim()).filter(Boolean)
    )
  );

  const availableAthletes = athletes.filter((a) => !assignedNames.has(a.name));

  const setDivisionCount = (count) => {
    actions.updateSettings({ divisionCount: count });
  };

  const setDivisionTexts = (texts) => {
    actions.updateDivisionTexts(texts);
  };

  const setRoundTime = (mins, secs) => {
    const current = roundTime;
    const currentMins = Math.floor(current / 60);
    const currentSecs = current % 60;
    const newMins = mins !== undefined ? mins : currentMins;
    const newSecs = secs !== undefined ? secs : currentSecs;
    actions.updateSettings({ roundTime: newMins * 60 + newSecs });
  };

  const setRestTime = (mins, secs) => {
    const current = restTime;
    const currentMins = Math.floor(current / 60);
    const currentSecs = current % 60;
    const newMins = mins !== undefined ? mins : currentMins;
    const newSecs = secs !== undefined ? secs : currentSecs;
    actions.updateSettings({ restTime: newMins * 60 + newSecs });
  };

  const handleAddAthlete = (athleteName) => {
    const copy = [...divisionTexts];
    const lines = copy[activeDivision]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.includes(athleteName)) return; // prevent duplicate
    copy[activeDivision] = lines.concat(athleteName).join("\n");
    setDivisionTexts(copy);
  };

  const handleCreateBrackets = () => {
    const divisions = divisionTexts.map((text) =>
      text.split("\n").map((n) => n.trim()).filter((n) => n.length > 0)
    );
    actions.createBrackets(divisions, divisionCount, "", "", doBoxing, doMuayThai);
  };

  const roundMins = Math.floor(roundTime / 60);
  const roundSecs = roundTime % 60;
  const restMins = Math.floor(restTime / 60);
  const restSecs = restTime % 60;

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
                <Input
                  type="number"
                  min={0}
                  value={roundMins}
                  onChange={(e) => setRoundTime(parseInt(e.target.value) || 0, undefined)}
                  className="bg-white/10 border-white/20 text-white text-center text-lg"
                />
                <span className="text-white/40 text-xs">min</span>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={roundSecs}
                  onChange={(e) => setRoundTime(undefined, parseInt(e.target.value) || 0)}
                  className="bg-white/10 border-white/20 text-white text-center text-lg"
                />
                <span className="text-white/40 text-xs">sec</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Rest Duration</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  value={restMins}
                  onChange={(e) => setRestTime(parseInt(e.target.value) || 0, undefined)}
                  className="bg-white/10 border-white/20 text-white text-center text-lg"
                />
                <span className="text-white/40 text-xs">min</span>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={restSecs}
                  onChange={(e) => setRestTime(undefined, parseInt(e.target.value) || 0)}
                  className="bg-white/10 border-white/20 text-white text-center text-lg"
                />
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
          <Select value={String(divisionCount)} onValueChange={(v) => setDivisionCount(parseInt(v))}>
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

        {/* Two-column layout: Quick Add | Division Textareas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Quick Add Athletes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/40" />
              <span className="text-white/60 text-sm font-medium">Quick Add Athletes</span>
            </div>
            {divisionCount > 1 && (
              <div className="flex gap-1">
                {Array.from({ length: divisionCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDivision(i)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                      activeDivision === i
                        ? "bg-red-600 text-white"
                        : "bg-white/10 text-white/50 hover:bg-white/20"
                    }`}
                  >
                    Div {i + 1}
                  </button>
                ))}
              </div>
            )}
            {availableAthletes.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {availableAthletes.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleAddAthlete(a.name)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full border border-white/15 hover:border-white/30 transition-all"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
                {divisionCount > 1 && (
                  <p className="text-white/30 text-xs">
                    Adding to Division {activeDivision + 1}
                  </p>
                )}
              </>
            ) : (
              <p className="text-white/30 text-sm">No athletes in database yet.</p>
            )}
          </div>

          {/* Right: Division Textareas */}
          <div className="space-y-3">
            {divisionCount > 1 && (
              <p className="text-white/40 text-xs italic">
                If you are using more than 1 Division please click the division then the name
              </p>
            )}
            <div className="grid gap-4">
              {Array.from({ length: divisionCount }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Label
                    className={`font-bold cursor-pointer transition-colors ${
                      divisionCount > 1 && activeDivision === i ? "text-red-400" : "text-white/70"
                    }`}
                    onClick={() => setActiveDivision(i)}
                  >
                    Division {i + 1}
                    {divisionCount > 1 && activeDivision === i && (
                      <span className="ml-2 text-xs font-normal text-red-400/70">← active</span>
                    )}
                  </Label>
                  <Textarea
                    placeholder={"One name per line...\nBruce Hoyer\nJohn Smith\nAdam Lee"}
                    value={divisionTexts[i] || ""}
                    onChange={(e) => {
                      const copy = [...divisionTexts];
                      copy[i] = e.target.value;
                      setDivisionTexts(copy);
                    }}
                    onFocus={() => setActiveDivision(i)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[200px] font-mono"
                  />
                  <p className="text-white/40 text-xs">
                    {(divisionTexts[i] || "").split("\n").filter((n) => n.trim()).length} athletes
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sports Selection */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Sports</h2>
        <p className="text-white/40 text-sm">Select which disciplines will be used this session.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div
            onClick={() => setDoBoxing((v) => !v)}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              doBoxing ? "bg-red-500/15 border-red-500/50" : "bg-white/5 border-white/10 opacity-50"
            }`}
          >
            <span className="text-3xl">🥊</span>
            <div className="flex-1">
              <div className="text-white font-bold">Boxing</div>
              <div className="text-white/40 text-xs">Boxing goals & role switching</div>
            </div>
            <Switch checked={doBoxing} onCheckedChange={setDoBoxing} onClick={(e) => e.stopPropagation()} />
          </div>
          <div
            onClick={() => setDoMuayThai((v) => !v)}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
              doMuayThai ? "bg-blue-500/15 border-blue-500/50" : "bg-white/5 border-white/10 opacity-50"
            }`}
          >
            <span className="text-3xl">🦵</span>
            <div className="flex-1">
              <div className="text-white font-bold">Muay Thai</div>
              <div className="text-white/40 text-xs">Muay Thai goals & role switching</div>
            </div>
            <Switch checked={doMuayThai} onCheckedChange={setDoMuayThai} onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      </div>

      {/* Repeat Mode */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Schedule Loop</h2>
        <Select
          value={session.repeatMode || "same"}
          onValueChange={(v) => actions.updateSettings({ repeatMode: v })}
        >
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
        <Button
          onClick={handleCreateBrackets}
          disabled={!doBoxing && !doMuayThai}
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg px-8 gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" /> Create Brackets
        </Button>
        <Button
          onClick={actions.clearSetup}
          size="lg"
          variant="outline"
          className="bg-transparent border-white/20 text-white/60 hover:text-white hover:bg-white/10 font-bold gap-2"
        >
          <Trash2 className="w-4 h-4" /> Clear Setup
        </Button>
        <Link to="/AthleteManager">
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent border-white/20 text-white/60 hover:text-white hover:bg-white/10 font-bold gap-2"
          >
            <Users className="w-4 h-4" /> Manage Athletes
          </Button>
        </Link>
      </div>
    </div>
  );
}