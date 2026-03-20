import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

function GoalSection({ title, emoji, color, entityName, queryKey, accentClass, btnClass }) {
  const queryClient = useQueryClient();
  const [newGoal, setNewGoal] = useState("");

  const { data: goals = [] } = useQuery({
    queryKey: [queryKey],
    queryFn: () => base44.entities[entityName].list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const sortedGoals = [...goals].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleAdd = () => {
    if (!newGoal.trim()) return;
    createMutation.mutate({
      text: newGoal.trim(),
      enabled: true,
      is_neutral: true,
      sort_order: sortedGoals.length,
    });
    setNewGoal("");
  };

  const handleMove = (list, index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    reordered.forEach((goal, i) => {
      updateMutation.mutate({ id: goal.id, sort_order: i });
    });
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
      <h2 className={`text-xl font-bold flex items-center gap-2 ${accentClass}`}>
        {emoji} {title}
      </h2>

      <div className="flex gap-2">
        <Input
          placeholder={`Add a ${title.toLowerCase()} goal...`}
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
        />
        <Button onClick={handleAdd} className={`${btnClass} gap-1`}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {sortedGoals.map((goal, index) => {
          const isNeutral = goal.is_neutral === false || goal.is_neutral === "false" ? false : true;
          return (
            <div key={goal.id} className="bg-white/5 rounded-xl px-4 py-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                  <button
                    onClick={() => handleMove(sortedGoals, index, -1)}
                    disabled={index === 0}
                    className="text-white/30 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(sortedGoals, index, 1)}
                    disabled={index === sortedGoals.length - 1}
                    className="text-white/30 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

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
        })}
        {sortedGoals.length === 0 && (
          <p className="text-white/30 text-sm text-center py-4">No goals yet</p>
        )}
      </div>
    </div>
  );
}

export default function GoalSettings() {
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

        <GoalSection
          title="Boxing Goals"
          emoji="🥊"
          accentClass="text-red-400"
          btnClass="bg-red-600 hover:bg-red-700"
          entityName="BoxingGoal"
          queryKey="boxing-goals"
        />

        <GoalSection
          title="Muay Thai Goals"
          emoji="🦵"
          accentClass="text-blue-400"
          btnClass="bg-blue-600 hover:bg-blue-700"
          entityName="MuayThaiGoal"
          queryKey="muay-thai-goals"
        />
      </div>
    </div>
  );
}