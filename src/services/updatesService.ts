import { dataStore } from './dataStore';
import { Update } from '../types/database';

export const updatesService = {
  getUpdates(filters?: { podId?: string; profileId?: string; date?: string; status?: string }): Update[] {
    let list = dataStore.getUpdates();
    if (filters?.podId) {
      list = list.filter((u) => u.pod_id === filters.podId);
    }
    if (filters?.profileId) {
      list = list.filter((u) => u.profile_id === filters.profileId);
    }
    if (filters?.date) {
      list = list.filter((u) => u.update_date === filters.date);
    }
    if (filters?.status) {
      list = list.filter((u) => u.status === filters.status);
    }
    return list;
  },

  getTodayUpdates(podId?: string): Update[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getUpdates({ podId, date: today });
  },

  getMemberUpdateToday(profileId: string): Update | undefined {
    const today = new Date().toISOString().split('T')[0];
    return dataStore.getUpdates().find((u) => u.profile_id === profileId && u.update_date === today);
  },

  submitUpdate(data: Omit<Update, 'id' | 'submitted_at' | 'updated_at' | 'created_at'>): Update {
    return dataStore.submitUpdate(data);
  },

  getSubmissionStats(podId?: string) {
    const today = new Date().toISOString().split('T')[0];
    const allProfiles = dataStore.getProfiles().filter((p) => p.status === 'active' && p.role === 'member');
    const filteredProfiles = podId ? allProfiles.filter((p) => p.pod_id === podId) : allProfiles;

    const todayUpdates = this.getTodayUpdates(podId);
    const submittedCount = todayUpdates.length;
    const totalExpected = filteredProfiles.length;
    const pendingCount = Math.max(0, totalExpected - submittedCount);
    const participationRate = totalExpected > 0 ? Math.round((submittedCount / totalExpected) * 100) : 0;
    const activeBlockers = todayUpdates.filter((u) => u.has_blocker || u.status === 'blocked').length;
    const atRiskCount = todayUpdates.filter((u) => u.status === 'at_risk').length;
    const onTrackCount = todayUpdates.filter((u) => u.status === 'on_track').length;

    return {
      totalExpected,
      submittedCount,
      pendingCount,
      participationRate,
      activeBlockers,
      atRiskCount,
      onTrackCount,
    };
  },
};
