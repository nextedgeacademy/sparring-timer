import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export default function GoalSettings() {
  const queryClient = useQueryClient();
  const [newBoxingGoal, setNewBoxingGoal] = useState("");
  const [newMuayThaiGoal, setNewMuayThaiGoal] = useState("");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["sparring-goals"],
    queryFn: () => base44.entities.SparringGoal.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.SparringGoal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SparringGoal.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SparringGoal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  // Sort goals by sort_order within each type
  const boxingGoals = goals
    .filter((g) => g.type === "boxing")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const muayThaiGoals = goals
    .filter((g) => g.type === "muay_thai")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleAdd = (type, text, setter, list) => {
    if (!text.trim()) return;
    createMutation.mutate({
      text: text.trim(),
      type,
      enabled: true,
      is_neutral: true,
      sort_order: list.length,
    });
    setter("");
  };

  const handleMove = (list, index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    // Build new ordered array with the two items swapped
    const reordered = [...list];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    // Re-normalize all sort_order values to 0,1,2,... sequentially
    reordered.forEach((goal, i) => {
      updateMutation.mutate({ id: goal.id, sort_order: i });
    });
  };

  const GoalRow = ({ goal, index, list }) => {
    const isNeutral = goal.is_neutral === false || goal.is_neutral === "false" ? false : true;

    return (
      <div className="bg-white/5 rounded-xl px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          {/* Order controls */}
          <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
            <button
              onClick={() => handleMove(list, index, -1)}
              disabled={index === 0}
              className="text-white/30 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleMove(list, index, 1)}
              disabled={index === list.length - 1}
              className="text-white/30 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Order badge + text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white/30 text-xs font-mono tabular-nums w-5 text-right shrink-0">
                {index + 1}.
              </span>
              <div className="text-white font-medium">{goal.text}</div>
            </div>
            <div className="mt-1 ml-7">
              <span className={`text-xs px-2 py-1 rounded-full ${
                isNeutral
                  ? "bg-green-500/15 text-green-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}>
                {isNeutral ? "Neutral" : "Switch Mid-Round"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 shrink-0"
            onClick={() => deleteMutation.mutate(goal.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-6 ml-7">
          <div className="flex items-center gap-2">
            <Switch
              checked={goal.enabled !== false}
              onCheckedChange={(checked) => updateMutation.mutate({ id: goal.id, enabled: checked })}
            />
            <Label className="text-white/70 text-xs">
              {goal.enabled !== false ? "Enabled" : "Disabled"}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isNeutral}
              onCheckedChange={(checked) => updateMutation.mutate({ id: goal.id, is_neutral: checked })}
            />
            <Label className="text-white/70 text-xs">
              {isNeutral ? "Neutral Goal" : "Role Switch Goal"}
            </Label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/Home">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white">Goal Management</h1>
            <p className="text-white/40 text-sm mt-1">
              Goals run in sequence — top to bottom, looping. Disabled goals are skipped. Neutral goals apply to both athletes; Role Switch goals swap offense/defense at the midpoint.
            </p>
          </div>
        </div>

        {/* Boxing Goals */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
            🥊 Boxing Goals
          </h2>

          <div className="flex gap-2">
            <Input
              placeholder="Add a boxing goal..."
              value={newBoxingGoal}
              onChange={(e) => setNewBoxingGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd("boxing", newBoxingGoal, setNewBoxingGoal, boxingGoals)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
            <Button
              onClick={() => handleAdd("boxing", newBoxingGoal, setNewBoxingGoal, boxingGoals)}
              className="bg-red-600 hover:bg-red-700 gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            {boxingGoals.map((goal, index) => (
              <GoalRow key={goal.id} goal={goal} index={index} list={boxingGoals} />
            ))}
            {boxingGoals.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">No boxing goals yet</p>
            )}
          </div>
        </div>

        {/* Muay Thai Goals */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
            🦵 Muay Thai Goals
          </h2>

          <div className="flex gap-2">
            <Input
              placeholder="Add a Muay Thai goal..."
              value={newMuayThaiGoal}
              onChange={(e) => setNewMuayThaiGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd("muay_thai", newMuayThaiGoal, setNewMuayThaiGoal, muayThaiGoals)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
            <Button
              onClick={() => handleAdd("muay_thai", newMuayThaiGoal, setNewMuayThaiGoal, muayThaiGoals)}
              className="bg-blue-600 hover:bg-blue-700 gap-1"
            >
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            {muayThaiGoals.map((goal, index) => (
              <GoalRow key={goal.id} goal={goal} index={index} list={muayThaiGoals} />
            ))}
            {muayThaiGoals.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">No Muay Thai goals yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}