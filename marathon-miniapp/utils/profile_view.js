const planService = require("../services/plan");
const raceService = require("../services/race");

function buildProfileViewModel() {
  const plan = planService.getUserPlanConfig();
  const completion =
    plan && plan.templateName ? planService.getCompletionStats(plan.templateName, plan.startDate) : null;
  const targetRaces = raceService.listTargetRaces();

  return {
    planName: (plan && plan.templateName) || "未设置",
    planStartDate: (plan && plan.startDate) || "--",
    completionText: completion ? `${completion.percent}%` : "--",
    completedDaysText: completion ? `${completion.completed}/${completion.total}` : "--",
    targetRaceCountText: `${(targetRaces || []).length}场`,
  };
}

module.exports = {
  buildProfileViewModel,
};
