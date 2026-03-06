import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Volume2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SoundUploader({ session, actions }) {
  const startRef = useRef(null);
  const endRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpload = async (file, type) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === "start") {
      actions.updateSettings({ roundStartSound: file_url });
    } else {
      actions.updateSettings({ roundEndSound: file_url });
    }
    // Save to user profile
    await base44.auth.updateMe({
      roundStartSound: type === "start" ? file_url : session.roundStartSound,
      roundEndSound: type === "end" ? file_url : session.roundEndSound
    });
  };

  const saveDefaults = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        roundStartSound: session.roundStartSound || "",
        roundEndSound: session.roundEndSound || ""
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const loadUserSounds = async () => {
      const user = await base44.auth.me();
      if (user?.roundStartSound || user?.roundEndSound) {
        actions.updateSettings({
          roundStartSound: user.roundStartSound,
          roundEndSound: user.roundEndSound
        });
      }
    };
    loadUserSounds();
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/50">Upload your own sounds or download and use the examples provided below.</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-white/70">Round Start Sound</Label>
          <a href="https://drive.google.com/file/d/16QcTwPfL0Zqs93fafEM1v8rQ_77cKjIm/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
            Download Example
          </a>
        </div>
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
        <div className="flex items-center justify-between">
          <Label className="text-white/70">Round End Sound</Label>
          <a href="https://drive.google.com/file/d/1lNxGH_JUmQ4LV5VmNWQvF0Bks716SVfa/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
            Download Example
          </a>
        </div>
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
          disabled={isSaving}
          className="bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/30 gap-1"
          >
          {isSaving ? "Saving..." : "Save to Profile"}
          </Button>
          </div>
          </div>
          );
          }