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

export function useSessionState() {
  const [session, setSession] = useState(() => {
    const saved = loadFromStorage();
    return (
      saved || {
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
        pendingSwitchSound: null, // null | "boxing" | "muay_thai" | "both"

        repeatMode: "same",
        matchups: [],
        nextMatchups: [],
        allBoxingGoals: [],
        allMuayThaiGoals: [],
      }
    );
  });

  const timerRef = useRef(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const boxingGoals = await base44.entities.SparringGoal.filter({
          type: "boxing",
          enabled: true,
        });

        const muayThaiGoals = await base44.entities.SparringGoal.filter({
          type: "muay_thai",
          enabled: true,
        });

        setSession((prev) => ({
          ...prev,
          allBoxingGoals: boxingGoals.map((g) => ({
            text: g.text,
            isNeutral:
              g.is_neutral === false || g.is_neutral === "false" ? false : true,
          })),
          allMuayThaiGoals: muayThaiGoals.map((g) => ({
            text: g.text,
            isNeutral:
              g.is_neutral === false || g.is_neutral === "false" ? false : true,
          })),
        }));
      } catch (e) {
        /* ignore */
      }
    };

    fetchGoals();
  }, []);

  const getRandomGoal = useCallback((goals) => {
    if (!goals || goals.length === 0) return null;
    return goals[Math.floor(Math.random() * goals.length)];
  }, []);

  useEffect(() => {
    saveToStorage(session);
  }, [session]);

  const getNextRoundData = useCallback(
    (state) => {
      const newIndices = { ...state.roundIndices };

      Object.keys(state.schedules).forEach((div) => {
        newIndices[div] = (state.roundIndices[div] || 0) + 1;

        const divSchedule = state.schedules[div];
        if (divSchedule && newIndices[div] >= divSchedule.length) {
          newIndices[div] = newIndices[div] % divSchedule.length;
        }
      });

      const matchups = getMergedRound(state.schedules, newIndices);
      const nextBoxingGoal = getRandomGoal(state.allBoxingGoals);
      const nextMuayThaiGoal = getRandomGoal(state.allMuayThaiGoals);

      return {
        matchups,
        roundIndices: newIndices,
        boxingGoal: nextBoxingGoal?.text || "",
        muayThaiGoal: nextMuayThaiGoal?.text || "",
        boxingGoalIsNeutral: nextBoxingGoal?.isNeutral ?? true,
        muayThaiGoalIsNeutral: nextMuayThaiGoal?.isNeutral ?? true,
      };
    },
    [getRandomGoal]
  );

  function advanceRound(prev) {
    const newIndices = { ...prev.roundIndices };
    let needsReshuffle = false;

    Object.keys(prev.schedules).forEach((div) => {
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

    return {
      ...prev,
      status: "running",
      phase: "round",
      timeLeft: prev.roundTime,
      roundIndices: newIndices,
      globalRound: prev.globalRound + 1,
      matchups,
      schedules,

      boxingGoal: prev.nextBoxingGoal || "",
      muayThaiGoal: prev.nextMuayThaiGoal || "",
      boxingGoalIsNeutral: prev.nextBoxingGoalIsNeutral ?? true,
      muayThaiGoalIsNeutral: prev.nextMuayThaiGoalIsNeutral ?? true,

      boxingRolesFlipped: false,
      muayThaiRolesFlipped: false,
      pendingSwitchSound: null,

      nextMatchups: [],
    };
  }

  useEffect(() => {
    if (
      session.status === "running" ||
      session.status === "rest" ||
      session.status === "warmup"
    ) {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          if (prev.timeLeft <= 1) {
            clearInterval(timerRef.current);

            if (prev.status === "warmup") {
              return {
                ...prev,
                status: "running",
                phase: "round",
                timeLeft: prev.roundTime,
                boxingRolesFlipped: false,
                muayThaiRolesFlipped: false,
                pendingSwitchSound: null,
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
                nextBoxingGoal: nextData.boxingGoal || prev.nextBoxingGoal,
                nextMuayThaiGoal: nextData.muayThaiGoal || prev.nextMuayThaiGoal,
                nextBoxingGoalIsNeutral: nextData.boxingGoalIsNeutral,
                nextMuayThaiGoalIsNeutral: nextData.muayThaiGoalIsNeutral,
              };
            }

            return advanceRound(prev);
          }

          const nextTimeLeft = prev.timeLeft - 1;
          const midpoint = Math.ceil(prev.roundTime / 2);

          const boxingNeedsSwitch =
            prev.phase === "round" &&
            !prev.boxingGoalIsNeutral &&
            !prev.boxingRolesFlipped &&
            nextTimeLeft === midpoint;

          const muayThaiNeedsSwitch =
            prev.phase === "round" &&
            !prev.muayThaiGoalIsNeutral &&
            !prev.muayThaiRolesFlipped &&
            nextTimeLeft === midpoint;

          let pendingSwitchSound = null;

          if (boxingNeedsSwitch && muayThaiNeedsSwitch) {
            pendingSwitchSound = "both";
          } else if (boxingNeedsSwitch) {
            pendingSwitchSound = "boxing";
          } else if (muayThaiNeedsSwitch) {
            pendingSwitchSound = "muay_thai";
          }

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

    createBrackets: (divisions, divisionCount, boxingGoal, muayThaiGoal) => {
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
      const randomBoxingGoal = getRandomGoal(session.allBoxingGoals);
      const randomMuayThaiGoal = getRandomGoal(session.allMuayThaiGoals);

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

        boxingGoal: randomBoxingGoal?.text || boxingGoal,
        muayThaiGoal: randomMuayThaiGoal?.text || muayThaiGoal,
        boxingGoalIsNeutral: randomBoxingGoal?.isNeutral ?? true,
        muayThaiGoalIsNeutral: randomMuayThaiGoal?.isNeutral ?? true,

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
      setSession((prev) => ({
        ...prev,
        status: "paused",
      }));
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
            nextBoxingGoal: nextData.boxingGoal || prev.nextBoxingGoal,
            nextMuayThaiGoal: nextData.muayThaiGoal || prev.nextMuayThaiGoal,
            nextBoxingGoalIsNeutral: nextData.boxingGoalIsNeutral,
            nextMuayThaiGoalIsNeutral: nextData.muayThaiGoalIsNeutral,
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

        return {
          ...prev,
          status: "running",
          phase: "round",
          timeLeft: prev.roundTime,
          roundIndices: newIndices,
          globalRound: Math.max(1, prev.globalRound - 1),
          matchups,
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
      setSession((prev) => ({
        ...prev,
        status: "complete",
      }));
    },

    setGoals: (boxingGoal, muayThaiGoal) => {
      setSession((prev) => ({
        ...prev,
        nextBoxingGoal: boxingGoal,
        nextMuayThaiGoal: muayThaiGoal,
      }));
    },

    clearPendingSwitchSound: () => {
      setSession((prev) => ({
        ...prev,
        pendingSwitchSound: null,
      }));
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
      });
    },
  };

  return { session, actions };
}