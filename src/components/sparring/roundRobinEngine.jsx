// Round Robin Schedule Generator
// Uses the "circle method" for round-robin tournament scheduling

export function generateRoundRobin(athletes) {
  if (!athletes || athletes.length < 2) return [];
  
  const list = [...athletes];
  const hasOdd = list.length % 2 !== 0;
  if (hasOdd) list.push("__REST__");
  
  const n = list.length;
  const rounds = [];
  const fixed = list[0];
  const rotating = list.slice(1);
  
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    const current = [fixed, ...rotating];
    
    for (let i = 0; i < n / 2; i++) {
      const a = current[i];
      const b = current[n - 1 - i];
      round.push({ athlete1: a, athlete2: b });
    }
    
    rounds.push(round);
    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop());
  }
  
  return rounds;
}

export function generateAllDivisionSchedules(divisions) {
  const schedules = {};
  divisions.forEach((athletes, divIndex) => {
    if (athletes.length >= 2) {
      schedules[divIndex] = generateRoundRobin(athletes);
    }
  });
  return schedules;
}

export function getMergedRound(schedules, roundIndices) {
  const allMatchups = [];
  
  Object.keys(schedules).forEach(divIndex => {
    const divSchedule = schedules[divIndex];
    if (divSchedule.length === 0) return;
    
    const roundIdx = roundIndices[divIndex] % divSchedule.length;
    const round = divSchedule[roundIdx];
    
    round.forEach(match => {
      allMatchups.push({
        ...match,
        division: parseInt(divIndex),
        isRest: match.athlete1 === "__REST__" || match.athlete2 === "__REST__"
      });
    });
  });
  
  return allMatchups;
}

export function addLateArrival(schedules, divIndex, playerName, currentRoundIndices) {
  const divSchedule = schedules[divIndex];
  if (!divSchedule) return schedules;

  const currentRound = currentRoundIndices[divIndex] || 0;

  // Collect all existing athletes in this division
  const existingAthletes = new Set();
  divSchedule.forEach(round => {
    round.forEach(match => {
      if (match.athlete1 !== "__REST__") existingAthletes.add(match.athlete1);
      if (match.athlete2 !== "__REST__") existingAthletes.add(match.athlete2);
    });
  });
  existingAthletes.add(playerName);

  // Fully regenerate the schedule with the new player included,
  // so they participate in ALL future rounds (including looped cycles).
  const newSchedule = generateRoundRobin([...existingAthletes]);

  // Keep already-completed rounds, replace everything from current round onward
  const kept = divSchedule.slice(0, currentRound + 1);
  schedules[divIndex] = [...kept, ...newSchedule];

  return { ...schedules };
}

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}