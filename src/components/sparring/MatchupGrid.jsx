import React from "react";
import MatchupTile from "./MatchupTile";

export default function MatchupGrid({ matchups, large = false }) {
  if (!matchups || matchups.length === 0) return null;

  const count = matchups.length;
  let cols = "grid-cols-2";
  if (count === 1) cols = "grid-cols-1 max-w-lg mx-auto";
  else if (count === 2) cols = "grid-cols-2 max-w-3xl mx-auto";
  else if (count === 3) cols = "grid-cols-3";
  else if (count <= 4) cols = "grid-cols-2 lg:grid-cols-4";
  else if (count <= 6) cols = "grid-cols-2 lg:grid-cols-3";
  else if (count <= 8) cols = "grid-cols-2 lg:grid-cols-4";
  else cols = "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <div className={`grid ${cols} gap-3 ${large ? "gap-4" : ""} w-full`}>
      {matchups.map((match, i) => (
        <MatchupTile key={i} match={match} large={large} />
      ))}
    </div>
  );
}