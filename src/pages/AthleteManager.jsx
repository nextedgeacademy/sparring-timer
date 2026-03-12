import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ArrowLeft, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AthleteManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");

  const { data: athletes = [], isLoading } = useQuery({
    queryKey: ["athletes"],
    queryFn: () => base44.entities.Athlete.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Athlete.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["athletes"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.Athlete.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["athletes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Athlete.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["athletes"] }),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    const data = { name: newName.trim(), active: true };
    if (newWeight) data.weight = parseFloat(newWeight);
    createMutation.mutate(data);
    setNewName("");
    setNewWeight("");
  };

  const activeCount = athletes.filter((a) => a.active !== false).length;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/Home">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white">Athlete Manager</h1>
            <p className="text-white/40 text-sm mt-1">
              {activeCount} active athlete{activeCount !== 1 ? "s" : ""} — active athletes appear in the setup panel for quick add.
            </p>
          </div>
        </div>

        {/* Add athlete */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-400" /> Add Athlete
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Athlete name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
            />
            <Input
              type="number"
              placeholder="Weight (lbs)"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 w-36"
            />
            <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 gap-1" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>

        {/* Athlete list */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">All Athletes ({athletes.length})</h2>

          {isLoading && <p className="text-white/40 text-sm">Loading...</p>}

          {!isLoading && athletes.length === 0 && (
            <p className="text-white/30 text-sm text-center py-6">No athletes yet — add some above.</p>
          )}

          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
                athlete.active !== false
                  ? "bg-white/5 border-white/10"
                  : "bg-white/2 border-white/5 opacity-50"
              }`}
            >
              <div>
                <span className={`font-medium ${athlete.active !== false ? "text-white" : "text-white/40"}`}>
                  {athlete.name}
                </span>
                {athlete.weight && (
                  <span className="ml-2 text-white/40 text-sm">{athlete.weight} lbs</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={athlete.active !== false}
                    onCheckedChange={(checked) => updateMutation.mutate({ id: athlete.id, active: checked })}
                  />
                  <span className="text-white/40 text-xs w-14">
                    {athlete.active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                  onClick={() => deleteMutation.mutate(athlete.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}