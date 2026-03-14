import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  generateRoundRobin,
  getMergedRound,
  addLateArrival,
  shuffleArray,
} from "./roundRobinEngine";

const STORAGE_KEY = "sparring_session";

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* ignore */
  }
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Get the goal at a specific sequence index (skips disabled, loops)
function getGoalAtIndex(goals, index) {
  if (!goals || goals.length === 0) return null;
  return goals[index % goals.length];
}

const DEFAULT_STATE = {
  status: "idle",
  divisions: [[], [], []],
  divisionCount: 1,
  divisionTexts: ["", "", ""],
  schedules: {},
  roundIndices: {},
  globalRound: 1,
  roundTime: 180,
  restTime: 30,
  timeLeft: 180,
  phase: "round",

  doBoxing: false,
  doMuayThai: false,

  boxingGoal: "",
  muayThaiGoal: "",
  boxingGoalIsNeutral: true,
  muayThaiGoalIsNeutral: true,

  nextBoxingGoal: "",
  nextMuayThaiGoal: "",
  nextBoxingGoalIsNeutral: true,
  nextMuayThaiGoalIsNeutral: true,

  boxingRolesFlipped: false,
  muayThaiRolesFlipped: false,
  pendingSwitchSound: null,

  repeatMode: "same",
  matchups: [],
  nextMatchups: [],
  allBoxingGoals: [],
  allMuayThaiGoals: [],

  // Sequential goal indices
  boxingGoalIndex: 0,
  muayThaiGoalIndex: 0,
};

export function useSessionState() {
  const [session, setSession] = useState(() => {
    const saved = loadFromStorage();
    return saved || DEFAULT_STATE;
  });

  const timerRef = useRef(null);
  const timerKeyRef = useRef(0);

  // Fetch and store ordered, enabled goals on mount
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const [boxingGoals, muayThaiGoals] = await Promise.all([
          base44.entities.SparringGoal.filter({ type: "boxing", enabled: true }),
          base44.entities.SparringGoal.filter({ type: "muay_thai", enabled: true }),
        ]);

        const mapGoal = (g) => ({
          text: g.text,
          isNeutral: g.is_neutral === false || g.is_neutral === "false" ? false : true,
        });

        const sortGoals = (list) =>
          [...list]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(mapGoal);

        setSession((prev) => ({
          ...prev,
          allBoxingGoals: sortGoals(boxingGoals),
          allMuayThaiGoals: sortGoals(muayThaiGoals),
        }));
      } catch (e) {
        /* ignore */
      }
    };

    fetchGoals();
  }, []);

  useEffect(() => {
    saveToStorage(session);
  }, [session]);

  const getNextRoundData = useCallback((state) => {
    const newIndices = { ...state.roundIndices };

    Object.keys(state.schedules).forEach((div) => {
      newIndices[div] = (state.roundIndices[div] || 0) + 1;
      const divSchedule = state.schedules[div];
      if (divSchedule && newIndices[div] >= divSchedule.length) {
        newIndices[div] = newIndices[div] % divSchedule.length;
      }
    });

    const matchups = getMergedRound(state.schedules, newIndices);

    const nextBoxingIdx = state.boxingGoalIndex + 1;
    const nextMuayThaiIdx = state.muayThaiGoalIndex + 1;

    const nextBoxingGoal = state.doBoxing
      ? getGoalAtIndex(state.allBoxingGoals, nextBoxingIdx)
      : null;

    const nextMuayThaiGoal = state.doMuayThai
      ? getGoalAtIndex(state.allMuayThaiGoals, nextMuayThaiIdx)
      : null;

    return {
      matchups,
      roundIndices: newIndices,
      nextBoxingGoalIndex: nextBoxingIdx,
      nextMuayThaiGoalIndex: nextMuayThaiIdx,
      boxingGoal: nextBoxingGoal?.text || "",
      muayThaiGoal: nextMuayThaiGoal?.text || "",
      boxingGoalIsNeutral: nextBoxingGoal?.isNeutral ?? true,
      muayThaiGoalIsNeutral: nextMuayThaiGoal?.isNeutral ?? true,
    };
  }, []);

  function advanceRound(prev) {
    const newIndices = { ...prev.roundIndices };
    let needsReshuffle = false;

    Object.keys(prev.schedules).forEach((div) => {
      newIndices[div] = (prev.roundIndices[div] || 0) + 1;
      const divSchedule = prev.schedules[div];

      if (divSchedule && newIndices[div] >= divSchedule.length) {
        if (prev.repeatMode === "reshuffle") needsReshuffle = true;
        newIndices[div] = newIndices[div] % divSchedule.length;
      }
    });

    let schedules = prev.schedules;

    if (needsReshuffle) {
      const newSchedules = { ...prev.schedules };
      Object.keys(newSchedules).forEach((div) => {
        if (newIndices[div] === 0) {
          const athletes = new Set();
          newSchedules[div].forEach((round) => {
            round.forEach((m) => {
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

    const newBoxingGoalIndex =
      prev.nextBoxingGoalIndex ?? prev.boxingGoalIndex + 1;
    const newMuayThaiGoalIndex =
      prev.nextMuayThaiGoalIndex ?? prev.muayThaiGoalIndex + 1;

    return {
      ...prev,
      status: "running",
      phase: "round",
      timeLeft: prev.roundTime,
      roundIndices: newIndices,
      globalRound: prev.globalRound + 1,
      matchups,
      schedules,

      boxingGoalIndex: newBoxingGoalIndex,
      muayThaiGoalIndex: newMuayThaiGoalIndex,
      nextBoxingGoalIndex: undefined,
      nextMuayThaiGoalIndex: undefined,

      boxingGoal: prev.doBoxing
        ? prev.nextBoxingGoal || prev.boxingGoal || ""
        : "",
      muayThaiGoal: prev.doMuayThai
        ? prev.nextMuayThaiGoal || prev.muayThaiGoal || ""
        : "",

      boxingGoalIsNeutral: prev.doBoxing
        ? prev.nextBoxingGoalIsNeutral ?? prev.boxingGoalIsNeutral ?? true
        : true,
      muayThaiGoalIsNeutral: prev.doMuayThai
        ? prev.nextMuayThaiGoalIsNeutral ?? prev.muayThaiGoalIsNeutral ?? true
        : true,

      boxingRolesFlipped: false,
      muayThaiRolesFlipped: false,
      pendingSwitchSound: null,

      nextBoxingGoal: "",
      nextMuayThaiGoal: "",
      nextBoxingGoalIsNeutral: true,
      nextMuayThaiGoalIsNeutral: true,
      nextMatchups: [],
      timerKey: timerKeyRef.current,
    };
  }

  useEffect(() => {
    if (
      session.status === "running" ||
      session.status === "rest" ||
      session.status === "warmup"
    ) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          if (prev.timeLeft <= 1) {
            clearInterval(timerRef.current);
            timerKeyRef.current += 1;

            if (prev.status === "warmup") {
              return {
                ...prev,
                status: "running",
                phase: "round",
                timeLeft: prev.roundTime,
                boxingRolesFlipped: false,
                muayThaiRolesFlipped: false,
                pendingSwitchSound: null,
                timerKey: timerKeyRef.current,
              };
            }

            if (prev.phase === "round") {
              if (prev.restTime === 0) {
                return advanceRound(prev);
              }

              const nextData = getNextRoundData(prev);

              return {
                ...prev,
                status: "rest",
                phase: "rest",
                timeLeft: prev.restTime,
                nextMatchups: nextData.matchups,
                nextBoxingGoalIndex: nextData.nextBoxingGoalIndex,
                nextMuayThaiGoalIndex: nextData.nextMuayThaiGoalIndex,
                nextBoxingGoal:
                  nextData.boxingGoal ||
                  prev.nextBoxingGoal ||
                  prev.boxingGoal ||
                  "",
                nextMuayThaiGoal:
                  nextData.muayThaiGoal ||
                  prev.nextMuayThaiGoal ||
                  prev.muayThaiGoal ||
                  "",
                nextBoxingGoalIsNeutral:
                  nextData.boxingGoalIsNeutral ??
                  prev.nextBoxingGoalIsNeutral ??
                  prev.boxingGoalIsNeutral ??
                  true,
                nextMuayThaiGoalIsNeutral:
                  nextData.muayThaiGoalIsNeutral ??
                  prev.nextMuayThaiGoalIsNeutral ??
                  prev.muayThaiGoalIsNeutral ??
                  true,
              };
            }

            return advanceRound(prev);
          }

          const nextTimeLeft = prev.timeLeft - 1;
          const midpoint = Math.ceil(prev.roundTime / 2);

          const boxingNeedsSwitch =
            prev.doBoxing &&
            prev.phase === "round" &&
            !prev.boxingGoalIsNeutral &&
            !prev.boxingRolesFlipped &&
            nextTimeLeft === midpoint;

          const muayThaiNeedsSwitch =
            prev.doMuayThai &&
            prev.phase === "round" &&
            !prev.muayThaiGoalIsNeutral &&
            !prev.muayThaiRolesFlipped &&
            nextTimeLeft === midpoint;

          let pendingSwitchSound = null;
          if (boxingNeedsSwitch && muayThaiNeedsSwitch) pendingSwitchSound = "both";
          else if (boxingNeedsSwitch) pendingSwitchSound = "boxing";
          else if (muayThaiNeedsSwitch) pendingSwitchSound = "muay_thai";

          return {
            ...prev,
            timeLeft: nextTimeLeft,
            boxingRolesFlipped: boxingNeedsSwitch
              ? true
              : prev.boxingRolesFlipped,
            muayThaiRolesFlipped: muayThaiNeedsSwitch
              ? true
              : prev.muayThaiRolesFlipped,
            pendingSwitchSound,
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.status, session.phase, getNextRoundData]);

  const actions = {
    updateSettings: (updates) => {
      setSession((prev) => ({ ...prev, ...updates }));
    },

    createBrackets: (
      divisions,
      divisionCount,
      boxingGoal,
      muayThaiGoal,
      doBoxing = true,
      doMuayThai = true
    ) => {
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

      const startBoxingGoal = doBoxing
        ? getGoalAtIndex(session.allBoxingGoals, 0)
        : null;
      const startMuayThaiGoal = doMuayThai
        ? getGoalAtIndex(session.allMuayThaiGoals, 0)
        : null;

      setSession((prev) => ({
        ...prev,
        status: "brackets_preview",
        phase: "round",
        divisions,
        divisionCount,
        schedules,
        roundIndices,
        globalRound: 1,
        timeLeft: 20,
        matchups,

        doBoxing,
        doMuayThai,

        boxingGoalIndex: 0,
        muayThaiGoalIndex: 0,
        nextBoxingGoalIndex: undefined,
        nextMuayThaiGoalIndex: undefined,

        boxingGoal: doBoxing
          ? startBoxingGoal?.text || boxingGoal || ""
          : "",
        muayThaiGoal: doMuayThai
          ? startMuayThaiGoal?.text || muayThaiGoal || ""
          : "",

        boxingGoalIsNeutral: doBoxing
          ? startBoxingGoal?.isNeutral ?? true
          : true,
        muayThaiGoalIsNeutral: doMuayThai
          ? startMuayThaiGoal?.isNeutral ?? true
          : true,

        nextBoxingGoal: "",
        nextMuayThaiGoal: "",
        nextBoxingGoalIsNeutral: true,
        nextMuayThaiGoalIsNeutral: true,

        boxingRolesFlipped: false,
        muayThaiRolesFlipped: false,
        pendingSwitchSound: null,

        nextMatchups: [],
      }));
    },

    startWarmup: () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setSession((prev) => ({
        ...prev,
        status: "warmup",
        timeLeft: 20,
      }));
    },

    pause: () => {
      setSession((prev) => ({ ...prev, status: "paused" }));
    },

    resume: () => {
      setSession((prev) => ({
        ...prev,
        status: prev.phase === "rest" ? "rest" : "running",
      }));
    },

    stop: () => {
      setSession((prev) => ({
        ...prev,
        status: "idle",
        globalRound: 1,
        matchups: [],
        nextMatchups: [],
        roundIndices: {},
        schedules: {},

        boxingGoalIndex: 0,
        muayThaiGoalIndex: 0,
        nextBoxingGoalIndex: undefined,
        nextMuayThaiGoalIndex: undefined,

        boxingGoal: "",
        muayThaiGoal: "",
        boxingGoalIsNeutral: true,
        muayThaiGoalIsNeutral: true,
        nextBoxingGoal: "",
        nextMuayThaiGoal: "",
        nextBoxingGoalIsNeutral: true,
        nextMuayThaiGoalIsNeutral: true,
        boxingRolesFlipped: false,
        muayThaiRolesFlipped: false,
        pendingSwitchSound: null,
      }));
    },

clearSetup: () => {
  localStorage.removeItem(STORAGE_KEY);
  setSession((prev) => ({
    ...DEFAULT_STATE,
    allBoxingGoals: prev.allBoxingGoals,
    allMuayThaiGoals: prev.allMuayThaiGoals,
  }));
},

    nextRound: () => {
      setSession((prev) => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (prev.phase === "round") {
          const nextData = getNextRoundData(prev);

          return {
            ...prev,
            status: "rest",
            phase: "rest",
            timeLeft: prev.restTime,
            nextMatchups: nextData.matchups,
            nextBoxingGoalIndex: nextData.nextBoxingGoalIndex,
            nextMuayThaiGoalIndex: nextData.nextMuayThaiGoalIndex,
            nextBoxingGoal:
              nextData.boxingGoal ||
              prev.nextBoxingGoal ||
              prev.boxingGoal ||
              "",
            nextMuayThaiGoal:
              nextData.muayThaiGoal ||
              prev.nextMuayThaiGoal ||
              prev.muayThaiGoal ||
              "",
            nextBoxingGoalIsNeutral:
              nextData.boxingGoalIsNeutral ??
              prev.nextBoxingGoalIsNeutral ??
              prev.boxingGoalIsNeutral ??
              true,
            nextMuayThaiGoalIsNeutral:
              nextData.muayThaiGoalIsNeutral ??
              prev.nextMuayThaiGoalIsNeutral ??
              prev.muayThaiGoalIsNeutral ??
              true,
          };
        }

        return advanceRound(prev);
      });
    },

    prevRound: () => {
      setSession((prev) => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (prev.phase === "round") {
          return {
            ...prev,
            status: "rest",
            phase: "rest",
            timeLeft: prev.restTime,
            nextMatchups: prev.matchups,
            nextBoxingGoal: prev.boxingGoal,
            nextMuayThaiGoal: prev.muayThaiGoal,
            nextBoxingGoalIsNeutral: prev.boxingGoalIsNeutral,
            nextMuayThaiGoalIsNeutral: prev.muayThaiGoalIsNeutral,
          };
        }

        const newIndices = { ...prev.roundIndices };
        Object.keys(prev.schedules).forEach((div) => {
          newIndices[div] = Math.max(0, (prev.roundIndices[div] || 0) - 1);
        });

        const matchups = getMergedRound(prev.schedules, newIndices);
        const prevBoxingIdx = Math.max(0, (prev.boxingGoalIndex ?? 0) - 1);
        const prevMuayThaiIdx = Math.max(0, (prev.muayThaiGoalIndex ?? 0) - 1);

        return {
          ...prev,
          status: "running",
          phase: "round",
          timeLeft: prev.roundTime,
          roundIndices: newIndices,
          globalRound: Math.max(1, prev.globalRound - 1),
          matchups,
          boxingGoalIndex: prevBoxingIdx,
          muayThaiGoalIndex: prevMuayThaiIdx,
          boxingGoal: prev.nextBoxingGoal || prev.boxingGoal,
          muayThaiGoal: prev.nextMuayThaiGoal || prev.muayThaiGoal,
          boxingGoalIsNeutral:
            prev.nextBoxingGoalIsNeutral ?? prev.boxingGoalIsNeutral,
          muayThaiGoalIsNeutral:
            prev.nextMuayThaiGoalIsNeutral ?? prev.muayThaiGoalIsNeutral,
          boxingRolesFlipped: false,
          muayThaiRolesFlipped: false,
          pendingSwitchSound: null,
          nextMatchups: [],
        };
      });
    },

    addPlayer: (name, divIndex) => {
      setSession((prev) => {
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
      setSession((prev) => ({ ...prev, status: "complete", pendingSwitchSound: null }));
    },

    clearPendingSwitchSound: () => {
      setSession((prev) => ({ ...prev, pendingSwitchSound: null }));
    },

 clearSession: () => {
  localStorage.removeItem(STORAGE_KEY);
  setSession((prev) => ({
    ...DEFAULT_STATE,
    allBoxingGoals: prev.allBoxingGoals,
    allMuayThaiGoals: prev.allMuayThaiGoals,
  }));
},

    updateDivisionTexts: (divisionTexts) => {
      setSession((prev) => ({ ...prev, divisionTexts }));
    },
  };

  return { session, actions };
}