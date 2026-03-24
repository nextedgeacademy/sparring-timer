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

// Goals are already filtered/sorted before being stored in state.
// This helper safely wraps the index.
function getGoalAtIndex(goals, index) {
  if (!goals || goals.length === 0) {
    return { text: "", isNeutral: true };
  }
  const idx = ((index % goals.length) + goals.length) % goals.length;
  return goals[idx];
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

  boxingGoalIndex: 0,
  muayThaiGoalIndex: 0,
  nextBoxingGoalIndex: undefined,
  nextMuayThaiGoalIndex: undefined,

  timerKey: 0,
};

export function useSessionState() {
  const [session, setSession] = useState(() => {
    const saved = loadFromStorage();
    return saved || DEFAULT_STATE;
  });

  const timerRef = useRef(null);
  const timerKeyRef = useRef(0);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const [boxingGoals, muayThaiGoals] = await Promise.all([
          base44.entities.BoxingGoal.filter({ enabled: true }, "sort_order"),
          base44.entities.MuayThaiGoal.filter({ enabled: true }, "sort_order"),
        ]);

        const mapGoal = (g) => ({
          text: g.text ?? "",
          isNeutral:
            g.is_neutral === false || g.is_neutral === "false" ? false : true,
          sort_order: g.sort_order ?? 0,
        });

        const sortGoals = (list) =>
          [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(mapGoal);

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

  const buildQueuedNextRoundData = useCallback((state) => {
    const newIndices = { ...state.roundIndices };

    Object.keys(state.schedules).forEach((div) => {
      const divSchedule = state.schedules[div];
      const nextIdx = (state.roundIndices[div] ?? 0) + 1;
      newIndices[div] =
        divSchedule && divSchedule.length > 0 ? nextIdx % divSchedule.length : 0;
    });

    const matchups = getMergedRound(state.schedules, newIndices);

    const nextBoxingGoalIndex =
      state.nextBoxingGoalIndex !== undefined
        ? state.nextBoxingGoalIndex
        : (state.boxingGoalIndex ?? 0) + 1;

    const nextMuayThaiGoalIndex =
      state.nextMuayThaiGoalIndex !== undefined
        ? state.nextMuayThaiGoalIndex
        : (state.muayThaiGoalIndex ?? 0) + 1;

    const nextBoxingGoalObj = state.doBoxing
      ? getGoalAtIndex(state.allBoxingGoals, nextBoxingGoalIndex)
      : { text: "", isNeutral: true };

    const nextMuayThaiGoalObj = state.doMuayThai
      ? getGoalAtIndex(state.allMuayThaiGoals, nextMuayThaiGoalIndex)
      : { text: "", isNeutral: true };

    return {
      matchups,
      roundIndices: newIndices,
      nextBoxingGoalIndex,
      nextMuayThaiGoalIndex,
      boxingGoal: nextBoxingGoalObj.text || "",
      muayThaiGoal: nextMuayThaiGoalObj.text || "",
      boxingGoalIsNeutral: nextBoxingGoalObj.isNeutral ?? true,
      muayThaiGoalIsNeutral: nextMuayThaiGoalObj.isNeutral ?? true,
    };
  }, []);

  function advanceRound(prev) {
    const newIndices = { ...prev.roundIndices };
    let needsReshuffle = false;

    Object.keys(prev.schedules).forEach((div) => {
      newIndices[div] = (prev.roundIndices[div] ?? 0) + 1;
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

    const currentMatchups =
      prev.nextMatchups && prev.nextMatchups.length > 0
        ? prev.nextMatchups
        : getMergedRound(schedules, newIndices);

    const followingIndices = { ...newIndices };
    Object.keys(schedules).forEach((div) => {
      const divSchedule = schedules[div];
      followingIndices[div] =
        divSchedule && divSchedule.length > 0
          ? ((newIndices[div] ?? 0) + 1) % divSchedule.length
          : 0;
    });

    const followingMatchups = getMergedRound(schedules, followingIndices);

    const currentBoxingGoalIndex =
      prev.nextBoxingGoalIndex !== undefined
        ? prev.nextBoxingGoalIndex
        : (prev.boxingGoalIndex ?? 0) + 1;

    const currentMuayThaiGoalIndex =
      prev.nextMuayThaiGoalIndex !== undefined
        ? prev.nextMuayThaiGoalIndex
        : (prev.muayThaiGoalIndex ?? 0) + 1;

    const currentBoxingGoalObj = prev.doBoxing
      ? getGoalAtIndex(prev.allBoxingGoals, currentBoxingGoalIndex)
      : { text: "", isNeutral: true };

    const currentMuayThaiGoalObj = prev.doMuayThai
      ? getGoalAtIndex(prev.allMuayThaiGoals, currentMuayThaiGoalIndex)
      : { text: "", isNeutral: true };

    const followingBoxingGoalIndex = currentBoxingGoalIndex + 1;
    const followingMuayThaiGoalIndex = currentMuayThaiGoalIndex + 1;

    const followingBoxingGoalObj = prev.doBoxing
      ? getGoalAtIndex(prev.allBoxingGoals, followingBoxingGoalIndex)
      : { text: "", isNeutral: true };

    const followingMuayThaiGoalObj = prev.doMuayThai
      ? getGoalAtIndex(prev.allMuayThaiGoals, followingMuayThaiGoalIndex)
      : { text: "", isNeutral: true };

    return {
      ...prev,
      status: "running",
      phase: "round",
      timeLeft: prev.roundTime,
      roundIndices: newIndices,
      globalRound: prev.globalRound + 1,
      matchups: currentMatchups,
      nextMatchups: followingMatchups,
      schedules,

      boxingGoalIndex: currentBoxingGoalIndex,
      muayThaiGoalIndex: currentMuayThaiGoalIndex,
      nextBoxingGoalIndex: followingBoxingGoalIndex,
      nextMuayThaiGoalIndex: followingMuayThaiGoalIndex,

      boxingGoal: prev.doBoxing ? currentBoxingGoalObj.text || "" : "",
      muayThaiGoal: prev.doMuayThai ? currentMuayThaiGoalObj.text || "" : "",

      boxingGoalIsNeutral: prev.doBoxing
        ? currentBoxingGoalObj.isNeutral ?? true
        : true,
      muayThaiGoalIsNeutral: prev.doMuayThai
        ? currentMuayThaiGoalObj.isNeutral ?? true
        : true,

      nextBoxingGoal: prev.doBoxing ? followingBoxingGoalObj.text || "" : "",
      nextMuayThaiGoal: prev.doMuayThai ? followingMuayThaiGoalObj.text || "" : "",

      nextBoxingGoalIsNeutral: prev.doBoxing
        ? followingBoxingGoalObj.isNeutral ?? true
        : true,
      nextMuayThaiGoalIsNeutral: prev.doMuayThai
        ? followingMuayThaiGoalObj.isNeutral ?? true
        : true,

      boxingRolesFlipped: false,
      muayThaiRolesFlipped: false,
      pendingSwitchSound: null,
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

              const nextData = buildQueuedNextRoundData(prev);

              return {
                ...prev,
                status: "rest",
                phase: "rest",
                timeLeft: prev.restTime,
                nextMatchups: nextData.matchups,
                nextBoxingGoalIndex: nextData.nextBoxingGoalIndex,
                nextMuayThaiGoalIndex: nextData.nextMuayThaiGoalIndex,
                nextBoxingGoal: nextData.boxingGoal || "",
                nextMuayThaiGoal: nextData.muayThaiGoal || "",
                nextBoxingGoalIsNeutral: nextData.boxingGoalIsNeutral ?? true,
                nextMuayThaiGoalIsNeutral: nextData.muayThaiGoalIsNeutral ?? true,
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
            boxingRolesFlipped: boxingNeedsSwitch ? true : prev.boxingRolesFlipped,
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
  }, [session.status, session.phase, session.timerKey, buildQueuedNextRoundData]);

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
        : { text: "", isNeutral: true };

      const startMuayThaiGoal = doMuayThai
        ? getGoalAtIndex(session.allMuayThaiGoals, 0)
        : { text: "", isNeutral: true };

      const queuedNextBoxingGoal = doBoxing
        ? getGoalAtIndex(session.allBoxingGoals, 1)
        : { text: "", isNeutral: true };

      const queuedNextMuayThaiGoal = doMuayThai
        ? getGoalAtIndex(session.allMuayThaiGoals, 1)
        : { text: "", isNeutral: true };

      const round2Indices = {};
      Object.keys(schedules).forEach((div) => {
        round2Indices[div] = 1 % schedules[div].length;
      });
      const nextMatchups = getMergedRound(schedules, round2Indices);

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
        nextMatchups,

        doBoxing,
        doMuayThai,

        boxingGoalIndex: 0,
        muayThaiGoalIndex: 0,
        nextBoxingGoalIndex: 1,
        nextMuayThaiGoalIndex: 1,

        boxingGoal: doBoxing ? startBoxingGoal.text || boxingGoal || "" : "",
        muayThaiGoal: doMuayThai ? startMuayThaiGoal.text || muayThaiGoal || "" : "",

        boxingGoalIsNeutral: doBoxing ? startBoxingGoal.isNeutral ?? true : true,
        muayThaiGoalIsNeutral: doMuayThai
          ? startMuayThaiGoal.isNeutral ?? true
          : true,

        nextBoxingGoal: doBoxing ? queuedNextBoxingGoal.text || "" : "",
        nextMuayThaiGoal: doMuayThai ? queuedNextMuayThaiGoal.text || "" : "",

        nextBoxingGoalIsNeutral: doBoxing
          ? queuedNextBoxingGoal.isNeutral ?? true
          : true,
        nextMuayThaiGoalIsNeutral: doMuayThai
          ? queuedNextMuayThaiGoal.isNeutral ?? true
          : true,

        boxingRolesFlipped: false,
        muayThaiRolesFlipped: false,
        pendingSwitchSound: null,
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
      if (timerRef.current) clearInterval(timerRef.current);
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
      if (timerRef.current) clearInterval(timerRef.current);
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
          if (prev.restTime === 0) {
            return advanceRound(prev);
          }

          const nextData = buildQueuedNextRoundData(prev);

          return {
            ...prev,
            status: "rest",
            phase: "rest",
            timeLeft: prev.restTime,
            nextMatchups: nextData.matchups,
            nextBoxingGoalIndex: nextData.nextBoxingGoalIndex,
            nextMuayThaiGoalIndex: nextData.nextMuayThaiGoalIndex,
            nextBoxingGoal: nextData.boxingGoal || "",
            nextMuayThaiGoal: nextData.muayThaiGoal || "",
            nextBoxingGoalIsNeutral: nextData.boxingGoalIsNeutral ?? true,
            nextMuayThaiGoalIsNeutral: nextData.muayThaiGoalIsNeutral ?? true,
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
          const divSchedule = prev.schedules[div];
          if (divSchedule && divSchedule.length > 0) {
            newIndices[div] =
              ((prev.roundIndices[div] ?? 0) - 1 + divSchedule.length) %
              divSchedule.length;
          } else {
            newIndices[div] = 0;
          }
        });

        const matchups = getMergedRound(prev.schedules, newIndices);

        const prevBoxingIdx = prev.doBoxing
          ? Math.max(0, (prev.boxingGoalIndex ?? 0) - 1)
          : 0;

        const prevMuayThaiIdx = prev.doMuayThai
          ? Math.max(0, (prev.muayThaiGoalIndex ?? 0) - 1)
          : 0;

        const prevBoxingGoalObj = prev.doBoxing
          ? getGoalAtIndex(prev.allBoxingGoals, prevBoxingIdx)
          : { text: "", isNeutral: true };

        const prevMuayThaiGoalObj = prev.doMuayThai
          ? getGoalAtIndex(prev.allMuayThaiGoals, prevMuayThaiIdx)
          : { text: "", isNeutral: true };

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
          nextBoxingGoalIndex: prevBoxingIdx + 1,
          nextMuayThaiGoalIndex: prevMuayThaiIdx + 1,

          boxingGoal: prev.doBoxing ? prevBoxingGoalObj.text || "" : "",
          muayThaiGoal: prev.doMuayThai ? prevMuayThaiGoalObj.text || "" : "",

          boxingGoalIsNeutral: prev.doBoxing
            ? prevBoxingGoalObj.isNeutral ?? true
            : true,
          muayThaiGoalIsNeutral: prev.doMuayThai
            ? prevMuayThaiGoalObj.isNeutral ?? true
            : true,

          nextBoxingGoal: prev.doBoxing
            ? getGoalAtIndex(prev.allBoxingGoals, prevBoxingIdx + 1).text || ""
            : "",
          nextMuayThaiGoal: prev.doMuayThai
            ? getGoalAtIndex(prev.allMuayThaiGoals, prevMuayThaiIdx + 1).text || ""
            : "",

          nextBoxingGoalIsNeutral: prev.doBoxing
            ? getGoalAtIndex(prev.allBoxingGoals, prevBoxingIdx + 1).isNeutral ?? true
            : true,
          nextMuayThaiGoalIsNeutral: prev.doMuayThai
            ? getGoalAtIndex(prev.allMuayThaiGoals, prevMuayThaiIdx + 1).isNeutral ?? true
            : true,

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
        pendingSwitchSound: null,
      }));
    },

    clearPendingSwitchSound: () => {
      setSession((prev) => ({ ...prev, pendingSwitchSound: null }));
    },

    clearSession: () => {
      localStorage.removeItem(STORAGE_KEY);
      if (timerRef.current) clearInterval(timerRef.current);
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