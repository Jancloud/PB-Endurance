const planService = require("../services/plan");
const raceService = require("../services/race");

function buildProfileViewModel() {
  const plan = planService.getUserPlanConfig();
  const completion =
    plan && plan.templateName ? planService.getCompletionStats(plan.templateName, plan.startDate) : null;
  const targetRaces = raceService.listTargetRaces();
  const planName = (plan && plan.templateName) || "未设置";
  const completionText = completion ? `${completion.percent}%` : "--";
  const completedDaysText = completion ? `${completion.completed}/${completion.total}` : "--";
  const targetRaceCountText = `${(targetRaces || []).length}场`;

  return {
    planName,
    planStartDate: (plan && plan.startDate) || "--",
    completionText,
    completedDaysText,
    targetRaceCountText,
    runnerTitle: planName === "未设置" ? "备赛档案" : `${planName} 跑者`,
    runnerSubtitle: `已完成 ${completedDaysText} · ${completionText}`,
    profileMetaText: `开训 ${((plan && plan.startDate) || "--")} · 目标赛事 ${targetRaceCountText}`,
  };
}

module.exports = {
  buildProfileViewModel,
};
