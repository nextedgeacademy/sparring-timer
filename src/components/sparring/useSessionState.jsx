import { useState, useEffect, useCallback, useRef } from "react";
import { generateRoundRobin, getMergedRound, addLateArrival, shuffleArray } from "./roundRobinEngine";

const STORAGE_KEY = "sparring_session";

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
}

export function useSessionState() {
  const [session, setSession] = useState(() => {
    const saved = loadFromStorage();
    return saved || {
      status: "idle", // idle | setup | brackets_preview | warmup | running | paused | rest | complete
      divisions: [[], [], []],
      divisionCount: 1,
      schedules: {},
      roundIndices: {},
      globalRound: 1,
      roundTime: 180,
      restTime: 60,
      timeLeft: 180,
      phase: "round", // round | rest
      selectedSparringTypes: [], // array of selected sparring types
      goals: {}, // { "boxing": "Jabs Only", "muay_thai": "Body Kicks Only" }
      nextGoals: {},
      roundStartSound: null,
      roundEndSound: null,
      repeatMode: "same", // same | reshuffle
      matchups: [],
      nextMatchups: [],
      divisionNames: ["Division 1", "Division 2", "Division 3"],
    };
  });

  const timerRef = useRef(null);
  const roundEndAudioRef = useRef(null);
  const roundStartAudioRef = useRef(null);

  // Persist state
  useEffect(() => {
    saveToStorage(session);
  }, [session]);

  // Timer logic
  useEffect(() => {
    if (session.status === "running" || session.status === "rest" || session.status === "warmup") {
      timerRef.current = setInterval(() => {
        setSession(prev => {
          if (prev.timeLeft <= 1) {
            clearInterval(timerRef.current);
            if (prev.status === "warmup") {
              // Warmup ended - play start sound and begin round
              if (prev.roundStartSound) {
                try {
                  const audio = new Audio(prev.roundStartSound);
                  audio.play().catch(() => {});
                } catch (e) {}
              }
              return {
                ...prev,
                status: "running",
                phase: "round",
                timeLeft: prev.roundTime,
              };
            }
            if (prev.phase === "round") {
              // Round ended - play end sound, switch to rest or next round
              if (prev.roundEndSound) {
                try {
                  const audio = new Audio(prev.roundEndSound);
                  audio.play().catch(() => {});
                } catch (e) {}
              }
              if (prev.restTime === 0) {
                // No rest - go directly to next round
                return advanceRound(prev);
              }
              // Prepare next round matchups during rest
              const nextData = getNextRoundData(prev);
              return {
                ...prev,
                status: "rest",
                phase: "rest",
                timeLeft: prev.restTime,
                nextMatchups: nextData.matchups,
              };
            } else {
              // Rest ended - play start sound, begin next round
              if (prev.roundStartSound) {
                try {
                  const audio = new Audio(prev.roundStartSound);
                  audio.play().catch(() => {});
                } catch (e) {}
              }
              return advanceRound(prev);
            }
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.status, session.phase]);

  const getNextRoundData = useCallback((state) => {
    const newIndices = { ...state.roundIndices };
    Object.keys(state.schedules).forEach(div => {
      newIndices[div] = (state.roundIndices[div] || 0) + 1;
      // Loop if finished
      const divSchedule = state.schedules[div];
      if (divSchedule && newIndices[div] >= divSchedule.length) {
        if (state.repeatMode === "reshuffle") {
          // Will regenerate on advance
        }
        newIndices[div] = newIndices[div] % divSchedule.length;
      }
    });
    const matchups = getMergedRound(state.schedules, newIndices);
    return { matchups, roundIndices: newIndices };
  }, []);

  function advanceRound(prev) {
    const newIndices = { ...prev.roundIndices };
    let needsReshuffle = false;
    
    Object.keys(prev.schedules).forEach(div => {
      newIndices[div] = (prev.roundIndices[div] || 0) + 1;
      const divSchedule = prev.schedules[div];
      if (divSchedule && newIndices[div] >= divSchedule.length) {
        if (prev.repeatMode === "reshuffle") {
          needsReshuffle = true;
        }
        newIndices[div] = newIndices[div] % divSchedule.length;
      }
    });

    let schedules = prev.schedules;
    if (needsReshuffle) {
      const newSchedules = { ...prev.schedules };
      Object.keys(newSchedules).forEach(div => {
        if (newIndices[div] === 0) {
          const athletes = new Set();
          newSchedules[div].forEach(round => {
            round.forEach(m => {
              if (m.athlete1 !== "__REST__") athletes.add(m.athlete1);
              if (m.athlete2 !== "__REST__") athletes.add(m.athlete2);
            });
          });
          newSchedules[div] = generateRoundRobin(shuffleArray([...athletes]));
        }
      });
      schedules = newSchedules;
    }

    const matchups = getMergedRound(schedules, newIndices);
    
    return {
      ...prev,
      status: "running",
      phase: "round",
      timeLeft: prev.roundTime,
      roundIndices: newIndices,
      globalRound: prev.globalRound + 1,
      matchups,
      schedules,
      goals: prev.nextGoals,
      nextGoals: {},
      nextMatchups: [],
    };
  }

  const actions = {
    updateSettings: (updates) => {
      setSession(prev => ({ ...prev, ...updates }));
    },

    createBrackets: (divisions, divisionCount, goals, selectedTypes) => {
      const activeDivisions = divisions.slice(0, divisionCount);
      const schedules = {};
      const roundIndices = {};
      
      activeDivisions.forEach((athletes, i) => {
        if (athletes.length >= 2) {
          schedules[i] = generateRoundRobin(athletes);
          roundIndices[i] = 0;
        }
      });

      const matchups = getMergedRound(schedules, roundIndices);
      
      setSession(prev => ({
        ...prev,
        status: "brackets_preview",
        phase: "round",
        divisions: divisions,
        divisionCount,
        schedules,
        roundIndices,
        globalRound: 1,
        timeLeft: 20, // 20 second warmup
        matchups,
        goals,
        selectedSparringTypes: selectedTypes,
        nextGoals: {},
        nextMatchups: [],
      }));
    },

    startWarmup: () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSession(prev => ({
        ...prev,
        status: "warmup",
        timeLeft: 20,
      }));
    },

    pause: () => {
      setSession(prev => ({
        ...prev,
        status: "paused",
      }));
    },

    resume: () => {
      setSession(prev => ({
        ...prev,
        status: prev.phase === "rest" ? "rest" : "running",
      }));
    },

    stop: () => {
      setSession(prev => ({
        ...prev,
        status: "idle",
        globalRound: 1,
        matchups: [],
        nextMatchups: [],
        roundIndices: {},
        schedules: {},
      }));
    },

    nextRound: () => {
      setSession(prev => {
        if (timerRef.current) clearInterval(timerRef.current);
        // If currently on a live round, go to rest first
        if (prev.phase === "round") {
          if (prev.restTime === 0) {
            // No rest configured, go directly to next live round
            return advanceRound(prev);
          }
          // Prepare next round matchups during rest
          const nextData = getNextRoundData(prev);
          return {
            ...prev,
            status: "running",
            phase: "rest",
            timeLeft: prev.restTime,
            nextMatchups: nextData.matchups,
          };
        }
        // If currently in rest phase, advance to next live round
        return advanceRound(prev);
      });
    },

    prevRound: () => {
      setSession(prev => {
        if (timerRef.current) clearInterval(timerRef.current);
        // If currently on a live round, go to rest first
        if (prev.phase === "round") {
          if (prev.restTime === 0) {
            // No rest configured, go directly to previous live round
            const newIndices = { ...prev.roundIndices };
            Object.keys(prev.schedules).forEach(div => {
              newIndices[div] = Math.max(0, (prev.roundIndices[div] || 0) - 1);
            });
            const matchups = getMergedRound(prev.schedules, newIndices);
            return {
              ...prev,
              status: "running",
              phase: "round",
              timeLeft: prev.roundTime,
              roundIndices: newIndices,
              globalRound: Math.max(1, prev.globalRound - 1),
              matchups,
            };
          }
          // Show rest round before previous live round
          // Need to prepare previous round's matchups
          const prevIndices = { ...prev.roundIndices };
          Object.keys(prev.schedules).forEach(div => {
            prevIndices[div] = Math.max(0, (prev.roundIndices[div] || 0) - 1);
          });
          const prevMatchups = getMergedRound(prev.schedules, prevIndices);
          return {
            ...prev,
            status: "running",
            phase: "rest",
            timeLeft: prev.restTime,
            nextMatchups: prevMatchups,
          };
        }
        // If currently in rest phase, advance to the live round we were preparing for
        return advanceRound(prev);
      });
    },

    addPlayer: (name, divIndex) => {
      setSession(prev => {
        const newSchedules = addLateArrival(
          { ...prev.schedules },
          divIndex,
          name,
          prev.roundIndices
        );
        return { ...prev, schedules: newSchedules };
      });
    },

    complete: () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSession(prev => ({
        ...prev,
        status: "complete",
      }));
    },

    setGoals: (goals) => {
      setSession(prev => ({ ...prev, nextGoals: goals }));
    },

    clearSession: () => {
      localStorage.removeItem(STORAGE_KEY);
      setSession({
        status: "idle",
        divisions: [[], [], []],
        divisionCount: 1,
        schedules: {},
        roundIndices: {},
        globalRound: 1,
        roundTime: 180,
        restTime: 60,
        timeLeft: 180,
        phase: "round",
        selectedSparringTypes: [],
        goals: {},
        nextGoals: {},
        roundStartSound: null,
        roundEndSound: null,
        repeatMode: "same",
        matchups: [],
        nextMatchups: [],
        divisionNames: ["Division 1", "Division 2", "Division 3"],
      });
    },
  };

  return { session, actions };
}