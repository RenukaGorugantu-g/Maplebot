import { dataStore } from './dataStore';

export const analyticsService = {
  getDailyAnalytics(podId?: string) {
    const pods = dataStore.getPods();
    const updates = dataStore.getUpdates();
    const today = new Date().toISOString().split('T')[0];
    const todayUpdates = updates.filter((u) => u.update_date === today);

    // Pod Comparison Bar Chart Data
    const podStats = pods.map((p) => {
      const pUpdates = todayUpdates.filter((u) => u.pod_id === p.id);
      const pMembers = dataStore.getProfiles().filter((m) => m.pod_id === p.id && m.status === 'active');
      const rate = pMembers.length > 0 ? Math.round((pUpdates.length / pMembers.length) * 100) : 0;
      const blockers = pUpdates.filter((u) => u.has_blocker).length;
      return {
        name: p.name,
        submitted: pUpdates.length,
        pending: Math.max(0, pMembers.length - pUpdates.length),
        total: pMembers.length,
        rate,
        blockers,
      };
    });

    // Status distribution
    const onTrack = todayUpdates.filter((u) => u.status === 'on_track').length;
    const atRisk = todayUpdates.filter((u) => u.status === 'at_risk').length;
    const blocked = todayUpdates.filter((u) => u.status === 'blocked').length;

    const statusDistribution = [
      { name: 'On Track', value: onTrack, color: '#00DC82' },
      { name: 'At Risk', value: atRisk, color: '#F59E0B' },
      { name: 'Blocked', value: blocked, color: '#EF4444' },
    ];

    // Hourly check-in velocity
    const hourlyVelocity = [
      { time: '08:00', count: 1 },
      { time: '09:00', count: 4 },
      { time: '09:30', count: 7 },
      { time: '10:00', count: 12 },
      { time: '10:30', count: 16 },
      { time: '11:00', count: 18 },
    ];

    return {
      podStats,
      statusDistribution,
      hourlyVelocity,
      totalSubmitted: todayUpdates.length,
      activeBlockersCount: blocked + todayUpdates.filter((u) => u.has_blocker).length,
    };
  },

  getWeeklyAnalytics() {
    return {
      dailySubmissions: [
        { day: 'Mon', submitted: 21, expected: 24, blockers: 3, resolved: 2 },
        { day: 'Tue', submitted: 23, expected: 24, blockers: 1, resolved: 3 },
        { day: 'Wed', submitted: 20, expected: 24, blockers: 2, resolved: 1 },
        { day: 'Thu', submitted: 22, expected: 24, blockers: 2, resolved: 2 },
        { day: 'Fri', submitted: 19, expected: 24, blockers: 0, resolved: 2 },
      ],
      averageSubmissionRate: 89,
      totalSubmissions: 105,
      blockersCreated: 8,
      blockersResolved: 10,
      avgResolutionHours: 14.5,
      atRiskPatternRate: 12,
      kudosGiven: 18,
    };
  },

  getSprintAnalytics() {
    const sprint = dataStore.getSprint();
    return {
      sprint,
      burnupData: [
        { day: 'Day 1', completedPoints: 12, target: 15 },
        { day: 'Day 2', completedPoints: 26, target: 30 },
        { day: 'Day 3', completedPoints: 44, target: 45 },
        { day: 'Day 4', completedPoints: 61, target: 60 },
        { day: 'Day 5', completedPoints: 78, target: 75 },
        { day: 'Day 6', completedPoints: 92, target: 90 },
      ],
      podVelocity: [
        { pod: 'Web & Sales', completed: 32, inProgress: 8, blockers: 1 },
        { pod: 'Marketing', completed: 24, inProgress: 4, blockers: 0 },
        { pod: 'eLearning', completed: 28, inProgress: 6, blockers: 1 },
        { pod: 'HR', completed: 18, inProgress: 2, blockers: 0 },
      ],
    };
  },
};
