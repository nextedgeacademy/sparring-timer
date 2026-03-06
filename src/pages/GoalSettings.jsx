import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";


function GoalSettingsContent() {
  const [isAuthed, setIsAuthed] = useState(null);
  const queryClient = useQueryClient();
  const [newGoals, setNewGoals] = useState({
    bjj: "",
    boxing: "",
    mma: "",
    muay_thai: "",
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["sparring-goals"],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      const gymId = localStorage.getItem("gym_id");
      if (!gymId) return [];
      return base44.entities.SparringGoal.filter({ gym_id: gymId });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const gymId = localStorage.getItem("gym_id");
      return base44.entities.SparringGoal.create({
        ...data,
        gym_id: gymId,
      });
    },
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          base44.auth.redirectToLogin();
          return;
        }
        if (user?.gym_id) {
          localStorage.setItem("gym_id", user.gym_id);
        }
        setIsAuthed(true);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    checkAuth();
  }, []);

  if (isAuthed === null) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  const sparringTypes = [
    { id: "bjj", label: "BJJ", emoji: "🥋", color: "purple" },
    { id: "boxing", label: "Boxing", emoji: "🥊", color: "red" },
    { id: "mma", label: "MMA", emoji: "🤜", color: "orange" },
    { id: "muay_thai", label: "Muay Thai", emoji: "🦵", color: "blue" },
  ];

  const handleAdd = (sparringType) => {
    const text = newGoals[sparringType];
    if (!text.trim()) return;
    const gymId = localStorage.getItem("gym_id");
    if (!gymId) {
      console.error("No gym_id found");
      return;
    }
    createMutation.mutate({ text: text.trim(), sparringType, enabled: true }, {
      onSuccess: () => {
        setNewGoals(prev => ({ ...prev, [sparringType]: "" }));
      }
    });
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

        {sparringTypes.map(type => {
          const typeGoals = goals.filter(g => g.sparringType === type.id);
          return (
            <div key={type.id} className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{
                color: type.color === "purple" ? "#c084fc" : type.color === "red" ? "#f87171" : type.color === "orange" ? "#fb923c" : "#60a5fa"
              }}>
                {type.emoji} {type.label} Goals
              </h2>
              <div className="flex gap-2">
                <Input
                  placeholder={`Add a ${type.label} goal...`}
                  value={newGoals[type.id]}
                  onChange={e => setNewGoals(prev => ({ ...prev, [type.id]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleAdd(type.id)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                />
                <Button 
                  onClick={() => handleAdd(type.id)} 
                  className="gap-1"
                  disabled={!newGoals[type.id].trim() || createMutation.isPending}
                  style={{
                    backgroundColor: type.color === "purple" ? "#9333ea" : type.color === "red" ? "#dc2626" : type.color === "orange" ? "#ea580c" : "#2563eb",
                    opacity: !newGoals[type.id].trim() || createMutation.isPending ? 0.5 : 1
                  }}
                >
                  <Plus className="w-4 h-4" /> {createMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
              <div className="space-y-2">
                {typeGoals.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <span className="text-white">{goal.text}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={goal.enabled !== false}
                          onCheckedChange={checked => toggleMutation.mutate({ id: goal.id, enabled: checked })}
                        />
                        <Label className="text-white/50 text-xs">
                          {goal.enabled !== false ? "On" : "Off"}
                        </Label>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        style={{
                          color: type.color === "purple" ? "rgba(192, 132, 252, 0.5)" : type.color === "red" ? "rgba(248, 113, 113, 0.5)" : type.color === "orange" ? "rgba(251, 146, 60, 0.5)" : "rgba(96, 165, 250, 0.5)"
                        }}
                        onClick={() => deleteMutation.mutate(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {typeGoals.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-4">No {type.label} goals yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GoalSettings() {
  return <GoalSettingsContent />;
}