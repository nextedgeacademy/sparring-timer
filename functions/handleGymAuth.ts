import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, gym_name, owner_name } = body;

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a gym assigned
    let gymId = localStorage.getItem("gym_id");

    if (action === "create_gym") {
      // Create new gym for this user
      const gym = await base44.asServiceRole.entities.Gym.create({
        name: gym_name,
        owner_name: owner_name || "",
      });

      // Create division settings
      await base44.asServiceRole.entities.DivisionSettings.create({
        gym_id: gym.id,
        division_names: ["Division 1", "Division 2", "Division 3"],
      });

      // Store gym ID in user profile
      await base44.auth.updateMe({
        gym_id: gym.id,
      });

      return Response.json({ gym_id: gym.id, success: true });
    }

    if (action === "get_gym") {
      // Get current user's gym
      const updatedUser = await base44.auth.me();
      if (updatedUser.gym_id) {
        const gym = await base44.asServiceRole.entities.Gym.filter({
          id: updatedUser.gym_id,
        });
        if (gym.length > 0) {
          return Response.json({ gym_id: gym[0].id, gym_name: gym[0].name });
        }
      }
      return Response.json({ error: 'No gym found' }, { status: 404 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});