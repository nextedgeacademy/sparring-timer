import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Volume2, X, Volume } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STORAGE_DEFAULTS_KEY = "sparring_sound_defaults";

export default function SoundUploader({ session, actions }) {
  const startRef = useRef(null);
  const endRef = useRef(null);
  const [defaults, setDefaults] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DEFAULTS_KEY);
      return saved ? JSON.parse(saved) : { startSound: "", endSound: "" };
    } catch {
      return { startSound: "", endSound: "" };
    }
  });

  const handleUpload = async (file, type) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === "start") {
      actions.updateSettings({ roundStartSound: file_url });
    } else {
      actions.updateSettings({ roundEndSound: file_url });
    }
  };

  const saveDefaults = () => {
    const newDefaults = {
      startSound: session.roundStartSound || "",
      endSound: session.roundEndSound || ""
    };
    localStorage.setItem(STORAGE_DEFAULTS_KEY, JSON.stringify(newDefaults));
    setDefaults(newDefaults);
  };

  const loadDefaults = () => {
    if (defaults.startSound || defaults.endSound) {
      actions.updateSettings({
        roundStartSound: defaults.startSound,
        roundEndSound: defaults.endSound
      });
    }
  };

  useEffect(() => {
    loadDefaults();
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white/70">Round Start Sound</Label>
        <div className="flex items-center gap-2">
          <input
            ref={startRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => {
              if (e.target.files[0]) handleUpload(e.target.files[0], "start");
            }}
          />
          <Button size="sm" variant="outline" onClick={() => startRef.current?.click()} className="bg-white/5 border-white/20 text-white/70 gap-1">
            <Upload className="w-3 h-3" /> Upload
          </Button>
          {session.roundStartSound && (
            <>
              <Volume2 className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs">Uploaded</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40" onClick={() => actions.updateSettings({ roundStartSound: null })}>
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-white/70">Round End Sound</Label>
        <div className="flex items-center gap-2">
          <input
            ref={endRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => {
              if (e.target.files[0]) handleUpload(e.target.files[0], "end");
            }}
          />
          <Button size="sm" variant="outline" onClick={() => endRef.current?.click()} className="bg-white/5 border-white/20 text-white/70 gap-1">
            <Upload className="w-3 h-3" /> Upload
          </Button>
          {session.roundEndSound && (
            <>
              <Volume2 className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs">Uploaded</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-white/40" onClick={() => actions.updateSettings({ roundEndSound: null })}>
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
          </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex gap-2">
          <Button
          size="sm"
          variant="outline"
          onClick={saveDefaults}
          className="bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/30 gap-1"
          >
          <Volume className="w-3 h-3" /> Save as Defaults
          </Button>
          {(defaults.startSound || defaults.endSound) && (
          <span className="text-blue-400 text-xs flex items-center">Defaults saved</span>
          )}
          </div>
          </div>
          );
          }