import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Copy, Edit2, Check, X, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import TemplateEditor from "../components/warmup/TemplateEditor";

export default function WarmupBuilder() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["warmup-templates"],
    queryFn: () => base44.entities.WarmupTemplate.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WarmupTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup-templates"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (template) =>
      base44.entities.WarmupTemplate.create({
        ...template,
        name: template.name + " (Copy)",
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup-templates"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WarmupTemplate.create(data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["warmup-templates"] });
      setEditingId(newTemplate.id);
    },
  });

  const handleNew = () => {
    createMutation.mutate({
      name: "New Warm-Up",
      blocks: [],
      skip_last_rest: true,
      auto_start_segments: true,
      auto_start_round_robin: true,
    });
  };

  function calcTotalTime(template) {
    if (!template.blocks || template.blocks.length === 0) return 0;
    const enabledBlocks = template.blocks.filter((b) => b.enabled !== false);
    let total = 0;
    enabledBlocks.forEach((block, idx) => {
      const repeats = block.repeat_count || 1;
      const isLast = idx === enabledBlocks.length - 1;
      for (let r = 0; r < repeats; r++) {
        total += block.work_seconds || 0;
        const isLastCycle = r === repeats - 1;
        if (!(isLast && isLastCycle && template.skip_last_rest)) {
          total += block.rest_seconds || 0;
        }
      }
    });
    return total;
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }

  if (editingId) {
    const template = templates.find((t) => t.id === editingId);
    if (!template) return null;
    return (
      <TemplateEditor
        template={template}
        onBack={() => setEditingId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-white flex-1">Warm-Up Builder</h1>
          <Button
            onClick={handleNew}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
            <p className="text-white/40 text-lg">No warm-up templates yet.</p>
            <p className="text-white/25 text-sm mt-1">Click "New Template" to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const total = calcTotalTime(template);
              const blockCount = (template.blocks || []).filter((b) => b.enabled !== false).length;
              return (
                <div
                  key={template.id}
                  className="bg-white/5 rounded-2xl border border-white/10 p-5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-lg truncate">{template.name}</div>
                    <div className="text-white/40 text-sm mt-0.5">
                      {blockCount} block{blockCount !== 1 ? "s" : ""} · ~{formatTime(total)} total
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setEditingId(template.id)}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateMutation.mutate(template)}
                      className="text-white/40 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(template.id)}
                      className="text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}