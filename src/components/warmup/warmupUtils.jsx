/**
 * Expands a WarmupTemplate into a flat array of segments for runtime playback.
 * Each segment: { blockTitle, type: 'work'|'rest', duration, notes, blockIndex, totalBlocks, cycleIndex, totalCycles }
 */
export function buildSegments(template) {
  if (!template || !template.blocks) return [];

  const enabledBlocks = template.blocks.filter((b) => b.enabled !== false);
  const segments = [];

  enabledBlocks.forEach((block, blockIdx) => {
    const repeats = Math.max(1, block.repeat_count || 1);
    const isLastBlock = blockIdx === enabledBlocks.length - 1;

    for (let r = 0; r < repeats; r++) {
      const isLastCycle = r === repeats - 1;

      segments.push({
        blockTitle: block.title || "Block",
        type: "work",
        duration: block.work_seconds || 0,
        notes: block.notes || "",
        blockIndex: blockIdx,
        totalBlocks: enabledBlocks.length,
        cycleIndex: r,
        totalCycles: repeats,
      });

      // Add rest unless it's the very last segment and skip_last_rest is true
      const shouldSkipRest = isLastBlock && isLastCycle && template.skip_last_rest;
      if (!shouldSkipRest && (block.rest_seconds || 0) > 0) {
        segments.push({
          blockTitle: block.title || "Block",
          type: "rest",
          duration: block.rest_seconds || 0,
          notes: block.notes || "",
          blockIndex: blockIdx,
          totalBlocks: enabledBlocks.length,
          cycleIndex: r,
          totalCycles: repeats,
        });
      }
    }
  });

  return segments;
}

export function calcTotalTime(template) {
  if (!template || !template.blocks) return 0;
  return buildSegments(template).reduce((sum, s) => sum + s.duration, 0);
}

export function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}