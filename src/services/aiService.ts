import { dataStore } from './dataStore';
import { AIResponsePayload, Profile } from '../types/database';

export const aiService = {
  async askMapleAI(
    query: string,
    currentProfile: Profile
  ): Promise<AIResponsePayload> {
    // Role-authorized scoping
    const isManager = currentProfile.role === 'manager';
    const isMember = currentProfile.role === 'member';
    const authorizedPodId = (isManager || isMember) ? currentProfile.pod_id : undefined;

    // Simulate network latency for AI intelligence feel
    await new Promise((res) => setTimeout(res, 600));

    let updates = dataStore.getUpdates();
    let blockers = dataStore.getBlockers();

    if (authorizedPodId) {
      updates = updates.filter((u) => u.pod_id === authorizedPodId);
      blockers = blockers.filter((b) => b.pod_id === authorizedPodId);
    }

    const lowerQ = query.toLowerCase();
    let intent = 'DAILY_SUMMARY';

    if (lowerQ.includes('blocker') || lowerQ.includes('blocked') || lowerQ.includes('stuck')) {
      intent = 'BLOCKER_SUMMARY';
    } else if (lowerQ.includes('pending') || lowerQ.includes('who has not submitted') || lowerQ.includes('missed')) {
      intent = 'PENDING_UPDATES';
    } else if (lowerQ.includes('week') || lowerQ.includes('weekly')) {
      intent = 'WEEKLY_SUMMARY';
    } else if (lowerQ.includes('sprint')) {
      intent = 'SPRINT_SUMMARY';
    } else if (lowerQ.includes('kudos') || lowerQ.includes('recognition') || lowerQ.includes('top')) {
      intent = 'KUDOS_SUMMARY';
    } else if (lowerQ.includes('compare') || lowerQ.includes('vs')) {
      intent = 'COMPARISON';
    } else if (
      lowerQ.includes('raghavi') ||
      lowerQ.includes('susan') ||
      lowerQ.includes('liam') ||
      lowerQ.includes('chloe') ||
      lowerQ.includes('harshika') ||
      lowerQ.includes('lucas')
    ) {
      intent = 'PERSON_SUMMARY';
    } else if (
      lowerQ.includes('web') ||
      lowerQ.includes('sales') ||
      lowerQ.includes('marketing') ||
      lowerQ.includes('elearning') ||
      lowerQ.includes('hr')
    ) {
      intent = 'POD_SUMMARY';
    }

    const today = new Date().toISOString().split('T')[0];
    const todayUpdates = updates.filter((u) => u.update_date === today);
    const activeBlockers = blockers.filter((b) => b.status === 'open' || b.status === 'in_progress');

    // Title formulation
    let summaryTitle = 'MapleBot Executive Intelligence Summary';
    if (intent === 'BLOCKER_SUMMARY') summaryTitle = 'Active & Critical Blockers Analysis';
    else if (intent === 'PENDING_UPDATES') summaryTitle = "Standup Submissions & Pending Check-ins";
    else if (intent === 'WEEKLY_SUMMARY') summaryTitle = 'Weekly Milestone & Deliverables Overview';
    else if (intent === 'SPRINT_SUMMARY') summaryTitle = 'Sprint 56 Performance & Goal Velocity';
    else if (intent === 'KUDOS_SUMMARY') summaryTitle = 'Team Kudos & Peer Recognition Pulse';
    else if (intent === 'PERSON_SUMMARY') summaryTitle = 'Individual Contributor Performance Breakdown';
    else if (intent === 'POD_SUMMARY') summaryTitle = 'Pod Standup Health & Active Operations';
    else if (intent === 'COMPARISON') summaryTitle = 'Cross-Pod Participation & Execution Comparison';

    // Structured insights
    const insights: AIResponsePayload['insights'] = [];

    // Blockers insight
    if (activeBlockers.length > 0) {
      insights.push({
        category: 'Blockers & Dependencies',
        type: 'warning',
        points: activeBlockers.map(
          (b) =>
            `${b.title} [${b.severity.toUpperCase()}] — Pod: ${b.pod?.name || 'Team'}. Assigned to: ${b.assignee?.full_name || 'Unassigned'}`
        ),
      });
    } else {
      insights.push({
        category: 'Blockers & Dependencies',
        type: 'success',
        points: ['No active blockers detected. All workflows are progressing smoothly.'],
      });
    }

    // Deliverables insight
    const completedList = todayUpdates
      .filter((u) => u.yesterday && u.yesterday.length > 5)
      .slice(0, 4)
      .map((u) => `${u.profile?.full_name} (${u.pod?.name}): ${u.yesterday}`);

    if (completedList.length > 0) {
      insights.push({
        category: 'Recent Key Deliverables',
        type: 'success',
        points: completedList,
      });
    }

    // Active Focus insight
    const todayList = todayUpdates
      .filter((u) => u.today && u.today.length > 5)
      .slice(0, 4)
      .map((u) => `${u.profile?.full_name}: ${u.today}`);

    if (todayList.length > 0) {
      insights.push({
        category: "Today's Work In-Progress",
        type: 'info',
        points: todayList,
      });
    }

    // Subtle blocker detector
    const flaggedSignals = this.detectSubtleBlockers(updates);

    // Follow-ups
    const followUps: string[] = [];
    if (activeBlockers.length > 0) {
      followUps.push(`Ping blocker owner regarding "${activeBlockers[0].title}".`);
    }
    const atRisk = todayUpdates.filter((u) => u.status === 'at_risk');
    if (atRisk.length > 0) {
      followUps.push(`Check in with ${atRisk[0].profile?.full_name} regarding status risk.`);
    }
    if (followUps.length === 0) {
      followUps.push('Team participation is healthy. No urgent escalations required today.');
    }

    const payload: AIResponsePayload = {
      intent,
      question: query,
      timestamp: new Date().toISOString(),
      summaryTitle,
      metrics: {
        totalAnalyzed: updates.length,
        activeBlockersCount: activeBlockers.length,
        onTrackCount: todayUpdates.filter((u) => u.status === 'on_track').length,
        atRiskCount: atRisk.length,
      },
      insights,
      recommendedFollowUps: followUps,
      flaggedBlockerSignals: flaggedSignals,
    };

    dataStore.logAudit('AI_QUERY_EXECUTED', 'AI', undefined, {
      query,
      role: currentProfile.role,
      intent,
    });

    return payload;
  },

  detectSubtleBlockers(updates = dataStore.getUpdates()) {
    const subtleTriggers = [
      'waiting for access',
      'waiting for client',
      'waiting for approval',
      'delayed by',
      'dependency pending',
      'cannot proceed',
      'need credentials',
      'waiting for response',
      'stuck on',
      'blocked by',
    ];

    const detected: Array<{
      profileName: string;
      podName: string;
      matchedKeyword: string;
      snippet: string;
    }> = [];

    updates.forEach((u) => {
      if (!u.has_blocker) {
        const text = `${u.yesterday || ''} ${u.today || ''}`.toLowerCase();
        for (const trigger of subtleTriggers) {
          if (text.includes(trigger)) {
            detected.push({
              profileName: u.profile?.full_name || 'Member',
              podName: u.pod?.name || 'Pod',
              matchedKeyword: trigger,
              snippet: u.today?.slice(0, 80) || u.yesterday?.slice(0, 80),
            });
            break;
          }
        }
      }
    });

    return detected;
  },
};
