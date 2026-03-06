import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const GymContext = createContext();

export function GymProvider({ children }) {
  const [gymId, setGymId] = useState(null);
  const [gymName, setGymName] = useState(null);
  const [divisionNames, setDivisionNames] = useState(["Division 1", "Division 2", "Division 3"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initGym = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          // For now, use user's role or a default gym - in production, add gym_id to User entity
          const storedGymId = localStorage.getItem("gym_id");
          if (storedGymId) {
            setGymId(storedGymId);
            const divSettings = await base44.entities.DivisionSettings.filter({
              gym_id: storedGymId,
            });
            if (divSettings.length > 0) {
              setDivisionNames(divSettings[0].division_names);
              const gym = await base44.entities.Gym.filter({ id: storedGymId });
              if (gym.length > 0) {
                setGymName(gym[0].name);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load gym context:", err);
      } finally {
        setLoading(false);
      }
    };

    initGym();
  }, []);

  const updateDivisionNames = async (names) => {
    if (!gymId) return;
    try {
      const divSettings = await base44.entities.DivisionSettings.filter({
        gym_id: gymId,
      });
      if (divSettings.length > 0) {
        await base44.entities.DivisionSettings.update(divSettings[0].id, {
          division_names: names,
        });
        setDivisionNames(names);
      }
    } catch (err) {
      console.error("Failed to update division names:", err);
    }
  };

  return (
    <GymContext.Provider
      value={{
        gymId,
        setGymId,
        gymName,
        setGymName,
        divisionNames,
        updateDivisionNames,
        loading,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error("useGym must be used within GymProvider");
  }
  return context;
}