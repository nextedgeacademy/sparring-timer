import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GoalSettings() {
  const queryClient = useQueryClient();
  const [newBoxingGoal, setNewBoxingGoal] = useState("");
  const [newMuayThaiGoal, setNewMuayThaiGoal] = useState("");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["sparring-goals"],
    queryFn: () => base44.entities.SparringGoal.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SparringGoal.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SparringGoal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.SparringGoal.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  const toggleSwitchMutation = useMutation({
    mutationFn: ({ id, hasSwitch }) => base44.entities.SparringGoal.update(id, { hasSwitch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sparring-goals"] }),
  });

  const boxingGoals = goals.filter(g => g.type === "boxing");
  const muayThaiGoals = goals.filter(g => g.type === "muay_thai");

  const handleAdd = (type, text, setter) => {
    if (!text.trim()) return;
    createMutation.mutate({ text: text.trim(), type, enabled: true });
    setter("");
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-white">Goal Management</h1>
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
              onChange={e => setNewBoxingGoal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd("boxing", newBoxingGoal, setNewBoxingGoal)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
            <Button onClick={() => handleAdd("boxing", newBoxingGoal, setNewBoxingGoal)} className="bg-red-600 hover:bg-red-700 gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {boxingGoals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <span className="text-white">{goal.text}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={goal.hasSwitch !== false}
                      onCheckedChange={checked => toggleSwitchMutation.mutate({ id: goal.id, hasSwitch: checked })}
                    />
                    <Label className="text-white/50 text-xs">
                      {goal.hasSwitch !== false ? "Switch" : "No Switch"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={goal.enabled !== false}
                      onCheckedChange={checked => toggleMutation.mutate({ id: goal.id, enabled: checked })}
                    />
                    <Label className="text-white/50 text-xs">
                      {goal.enabled !== false ? "On" : "Off"}
                    </Label>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 h-8 w-8" onClick={() => deleteMutation.mutate(goal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
              onChange={e => setNewMuayThaiGoal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd("muay_thai", newMuayThaiGoal, setNewMuayThaiGoal)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
            <Button onClick={() => handleAdd("muay_thai", newMuayThaiGoal, setNewMuayThaiGoal)} className="bg-blue-600 hover:bg-blue-700 gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {muayThaiGoals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <span className="text-white">{goal.text}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={goal.hasSwitch !== false}
                      onCheckedChange={checked => toggleSwitchMutation.mutate({ id: goal.id, hasSwitch: checked })}
                    />
                    <Label className="text-white/50 text-xs">
                      {goal.hasSwitch !== false ? "Switch" : "No Switch"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={goal.enabled !== false}
                      onCheckedChange={checked => toggleMutation.mutate({ id: goal.id, enabled: checked })}
                    />
                    <Label className="text-white/50 text-xs">
                      {goal.enabled !== false ? "On" : "Off"}
                    </Label>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 h-8 w-8" onClick={() => deleteMutation.mutate(goal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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