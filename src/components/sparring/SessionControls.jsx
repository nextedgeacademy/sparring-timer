import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pause, Play, Square, SkipForward, SkipBack, UserPlus, Flag } from "lucide-react";

export default function SessionControls({ session, actions }) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerDiv, setNewPlayerDiv] = useState("0");

  const isPaused = session.status === "paused";
  const isActive = session.status === "running" || session.status === "rest" || session.status === "paused";

  if (!isActive) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {isPaused ? (
          <Button size="sm" variant="outline" onClick={actions.resume} className="gap-1 bg-green-900/50 border-green-700 text-green-300 hover:bg-green-800">
            <Play className="w-3 h-3" /> Resume
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={actions.pause} className="gap-1 bg-white/5 border-white/20 text-white/70 hover:bg-white/10">
            <Pause className="w-3 h-3" /> Pause
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={actions.stop} className="gap-1 bg-white/5 border-white/20 text-white/70 hover:bg-white/10">
          <Square className="w-3 h-3" /> Stop
        </Button>
        <Button size="sm" variant="outline" onClick={actions.prevRound} className="gap-1 bg-white/5 border-white/20 text-white/70 hover:bg-white/10">
          <SkipBack className="w-3 h-3" /> Prev
        </Button>
        <Button size="sm" variant="outline" onClick={actions.nextRound} className="gap-1 bg-white/5 border-white/20 text-white/70 hover:bg-white/10">
          <SkipForward className="w-3 h-3" /> Next
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAddPlayer(true)} className="gap-1 bg-white/5 border-white/20 text-white/70 hover:bg-white/10">
          <UserPlus className="w-3 h-3" /> Add Player
        </Button>
        <Button size="sm" variant="outline" onClick={actions.complete} className="gap-1 bg-red-900/50 border-red-700 text-red-300 hover:bg-red-800">
          <Flag className="w-3 h-3" /> Sparring Complete
        </Button>
      </div>

      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Late Arrival</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Full Name"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <Select value={newPlayerDiv} onValueChange={setNewPlayerDiv}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: session.divisionCount }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {session.divisionNames?.[i] || `Division ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (newPlayerName.trim()) {
                  actions.addPlayer(newPlayerName.trim(), parseInt(newPlayerDiv));
                  setNewPlayerName("");
                  setShowAddPlayer(false);
                }
              }}
              className="bg-white text-black hover:bg-gray-200"
            >
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}