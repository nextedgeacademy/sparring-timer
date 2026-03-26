import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function newBlock() {
  return {
    id: Math.random().toString(36).slice(2),
    title: "New Block",
    work_seconds: 30,
    rest_seconds: 15,
    repeat_count: 1,
    notes: "",
    enabled: true,
  };
}

function TimeInput({ label, value, onChange }) {
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return (
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">{label}</Label>
      <div className="flex gap-1 items-center">
        <Input
          type="number"
          min={0}
          value={mins}
          onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + secs)}
          className="bg-white/10 border-white/20 text-white text-center w-14 px-1"
        />
        <span className="text-white/40 text-xs">m</span>
        <Input
          type="number"
          min={0}
          max={59}
          value={secs}
          onChange={(e) => onChange(mins * 60 + (parseInt(e.target.value) || 0))}
          className="bg-white/10 border-white/20 text-white text-center w-14 px-1"
        />
        <span className="text-white/40 text-xs">s</span>
      </div>
    </div>
  );
}

export default function TemplateEditor({ template, onBack }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template.name || "");
  const [blocks, setBlocks] = useState(template.blocks || []);
  const [skipLastRest, setSkipLastRest] = useState(template.skip_last_rest ?? true);
  const [autoStartSegments, setAutoStartSegments] = useState(template.auto_start_segments ?? true);
  const [autoStartRoundRobin, setAutoStartRoundRobin] = useState(template.auto_start_round_robin ?? true);
  const [expandedId, setExpandedId] = useState(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      base44.entities.WarmupTemplate.update(template.id, {
        name,
        blocks,
        skip_last_rest: skipLastRest,
        auto_start_segments: autoStartSegments,
        auto_start_round_robin: autoStartRoundRobin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmup-templates"] });
      onBack();
    },
  });

  const updateBlock = (id, field, value) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const addBlock = () => {
    const b = newBlock();
    setBlocks((prev) => [...prev, b]);
    setExpandedId(b.id);
  };

  const removeBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBlocks(reordered);
  };

  function calcTotalTime() {
    const enabledBlocks = blocks.filter((b) => b.enabled !== false);
    let total = 0;
    enabledBlocks.forEach((block, idx) => {
      const repeats = block.repeat_count || 1;
      const isLast = idx === enabledBlocks.length - 1;
      for (let r = 0; r < repeats; r++) {
        total += block.work_seconds || 0;
        const isLastCycle = r === repeats - 1;
        if (!(isLast && isLastCycle && skipLastRest)) {
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

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/10 border-white/20 text-white font-black text-2xl flex-1 h-auto py-2"
          />
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold shrink-0"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        {/* Estimated time */}
        <div className="text-white/40 text-sm text-center">
          ~{formatTime(calcTotalTime())} total warm-up time · {blocks.filter((b) => b.enabled !== false).length} enabled blocks
        </div>

        {/* Blocks */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="blocks">
            {(provided) => (
              <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`rounded-2xl border transition-colors ${
                          snapshot.isDragging
                            ? "bg-white/15 border-white/30 shadow-lg"
                            : block.enabled !== false
                            ? "bg-white/5 border-white/10"
                            : "bg-white/2 border-white/5 opacity-50"
                        }`}
                      >
                        {/* Block header */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-white/25 hover:text-white/50 shrink-0"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="text-white/40 text-xs font-mono w-5">{index + 1}</span>
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === block.id ? null : block.id)}
                          >
                            <div className="text-white font-bold">{block.title || "Untitled"}</div>
                            <div className="text-white/40 text-xs">
                              {formatTime(block.work_seconds || 0)} work · {formatTime(block.rest_seconds || 0)} rest
                              {block.repeat_count > 1 ? ` × ${block.repeat_count}` : ""}
                            </div>
                          </div>
                          <Switch
                            checked={block.enabled !== false}
                            onCheckedChange={(v) => updateBlock(block.id, "enabled", v)}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeBlock(block.id)}
                            className="text-white/25 hover:text-red-400 h-7 w-7 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Expanded editor */}
                        {expandedId === block.id && (
                          <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                            <div>
                              <Label className="text-white/50 text-xs">Block Title</Label>
                              <Input
                                value={block.title}
                                onChange={(e) => updateBlock(block.id, "title", e.target.value)}
                                className="bg-white/10 border-white/20 text-white mt-1"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <TimeInput
                                label="Work Duration"
                                value={block.work_seconds || 0}
                                onChange={(v) => updateBlock(block.id, "work_seconds", v)}
                              />
                              <TimeInput
                                label="Rest Duration"
                                value={block.rest_seconds || 0}
                                onChange={(v) => updateBlock(block.id, "rest_seconds", v)}
                              />
                              <div className="space-y-1">
                                <Label className="text-white/50 text-xs">Repeats</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={block.repeat_count || 1}
                                  onChange={(e) => updateBlock(block.id, "repeat_count", parseInt(e.target.value) || 1)}
                                  className="bg-white/10 border-white/20 text-white text-center"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-white/50 text-xs">Notes (optional)</Label>
                              <Textarea
                                value={block.notes || ""}
                                onChange={(e) => updateBlock(block.id, "notes", e.target.value)}
                                placeholder="Coaching cues, technique reminders…"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/25 mt-1 min-h-[60px] text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Button
          onClick={addBlock}
          variant="outline"
          className="w-full bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Add Block
        </Button>

        {/* Settings */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-4">
          <h3 className="text-white font-bold">Settings</h3>
          {[
            { label: "Skip rest after final block", value: skipLastRest, set: setSkipLastRest },
            { label: "Auto-advance segments", value: autoStartSegments, set: setAutoStartSegments },
            { label: "Auto-start round robin after warm-up", value: autoStartRoundRobin, set: setAutoStartRoundRobin },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-white/70 text-sm">{label}</span>
              <Switch checked={value} onCheckedChange={set} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}