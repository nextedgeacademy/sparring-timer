import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

function GoalSection({ title, emoji, entityName, color }) {
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState("");
  const [newIsNeutral, setNewIsNeutral] = useState(true);

  const { data: goals = [] } = useQuery({
    queryKey: [entityName],
    queryFn: () => base44.entities[entityName].list("sort_order"),
  });

  const sorted = [...goals].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
  });

  const handleAdd = () => {
    if (!newText.trim()) return;
    createMutation.mutate({
      text: newText.trim(),
      enabled: true,
      is_neutral: newIsNeutral,
      sort_order: sorted.length,
    });
    setNewText("");
    setNewIsNeutral(true);
  };

  return (
    <div className={`bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4`}>
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span>{emoji}</span> {title} Goals
      </h2>

      <div className="space-y-2">
        {sorted.map((goal) => (
          <div
            key={goal.id}
            className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10"
          >
            <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
            <span className="flex-1 text-white text-sm">{goal.text}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40 text-xs">
                {goal.is_neutral ? "Neutral" : "Roles switch"}
              </span>
              <div className="flex items-center gap-1.5 border border-white/10 rounded-lg px-2 py-1 bg-white/5">
                <span className={`text-xs font-semibold ${goal.enabled ? "text-green-400" : "text-white/30"}`}>
                  {goal.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={!!goal.enabled}
                  onCheckedChange={(v) => updateMutation.mutate({ id: goal.id, data: { enabled: v } })}
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-white/30 hover:text-red-400 h-7 w-7"
                onClick={() => deleteMutation.mutate(goal.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-2 pt-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New goal..."
          className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Label className="text-white/50 text-xs whitespace-nowrap">Neutral</Label>
          <Switch checked={newIsNeutral} onCheckedChange={setNewIsNeutral} />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function GoalSettings() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-white">Goals & Settings</h1>
        </div>

        <GoalSection title="Boxing" emoji="🥊" entityName="BoxingGoal" color="red" />
        <GoalSection title="Muay Thai" emoji="🦵" entityName="MuayThaiGoal" color="blue" />
      </div>
    </div>
  );
}