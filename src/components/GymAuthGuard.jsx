import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";

export default function GymAuthGuard({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        // Check if user has a gym assigned (this would be set during signup/login)
        let gymId = localStorage.getItem("gym_id");
        if (!gymId) {
          // Try to find or create a default gym for the user
          // In production, this would be set during signup/login
          const gyms = await base44.entities.Gym.filter({});
          if (gyms.length > 0) {
            gymId = gyms[0].id;
            localStorage.setItem("gym_id", gymId);
          }
        }

        setAuthenticated(true);
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    // Redirect to login - Base44 handles this automatically
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Please log in to continue.</div>
      </div>
    );
  }

  return children;
}