import { dataStore } from './dataStore';
import { Blocker, BlockerStatus } from '../types/database';

export const blockersService = {
  getBlockers(filters?: { podId?: string; status?: BlockerStatus; severity?: string }): Blocker[] {
    let list = dataStore.getBlockers();
    if (filters?.podId) {
      list = list.filter((b) => b.pod_id === filters.podId);
    }
    if (filters?.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters?.severity) {
      list = list.filter((b) => b.severity === filters.severity);
    }
    return list;
  },

  createBlocker(data: Omit<Blocker, 'id' | 'created_at' | 'updated_at'>): Blocker {
    return dataStore.createBlocker(data);
  },

  updateBlocker(id: string, updates: Partial<Blocker>): Blocker | undefined {
    return dataStore.updateBlocker(id, updates);
  },

  resolveBlocker(id: string, status: 'resolved' | 'closed' = 'resolved'): Blocker | undefined {
    return dataStore.updateBlocker(id, { status });
  },

  assignBlocker(id: string, assignedTo: string): Blocker | undefined {
    return dataStore.updateBlocker(id, { assigned_to: assignedTo });
  },

  addComment(blockerId: string, userId: string, comment: string) {
    return dataStore.addBlockerComment(blockerId, userId, comment);
  },

  getBlockerAnalytics(podId?: string) {
    const blockers = this.getBlockers(podId ? { podId } : undefined);
    const openCount = blockers.filter((b) => b.status === 'open').length;
    const inProgressCount = blockers.filter((b) => b.status === 'in_progress').length;
    const resolvedCount = blockers.filter((b) => b.status === 'resolved' || b.status === 'closed').length;
    const criticalCount = blockers.filter((b) => b.severity === 'critical').length;
    const highCount = blockers.filter((b) => b.severity === 'high').length;

    // Categories breakdown
    const categories: Record<string, number> = {};
    blockers.forEach((b) => {
      categories[b.category] = (categories[b.category] || 0) + 1;
    });

    return {
      total: blockers.length,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      critical: criticalCount,
      high: highCount,
      categories,
    };
  },
};
