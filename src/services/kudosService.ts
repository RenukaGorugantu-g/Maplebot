import { dataStore } from './dataStore';
import { Kudos, KudosCategory } from '../types/database';

export const kudosService = {
  getKudos(filters?: { podId?: string; recipientId?: string; category?: KudosCategory }): Kudos[] {
    let list = dataStore.getKudos();
    if (filters?.podId) {
      list = list.filter((k) => k.pod_id === filters.podId);
    }
    if (filters?.recipientId) {
      list = list.filter((k) => k.recipient_id === filters.recipientId);
    }
    if (filters?.category) {
      list = list.filter((k) => k.category === filters.category);
    }
    return list;
  },

  giveKudos(data: Omit<Kudos, 'id' | 'created_at'>): Kudos {
    return dataStore.giveKudos(data);
  },

  getLeaderboard(period: 'month' | 'all' = 'month', podId?: string) {
    let list = dataStore.getKudos();
    if (podId) {
      list = list.filter((k) => k.pod_id === podId);
    }

    const receivedMap: Record<string, number> = {};
    const givenMap: Record<string, number> = {};

    list.forEach((k) => {
      receivedMap[k.recipient_id] = (receivedMap[k.recipient_id] || 0) + 1;
      givenMap[k.sender_id] = (givenMap[k.sender_id] || 0) + 1;
    });

    const profiles = dataStore.getProfiles().filter((p) => (podId ? p.pod_id === podId : true));

    const ranked = profiles
      .map((p) => ({
        profile: p,
        receivedCount: receivedMap[p.id] || 0,
        givenCount: givenMap[p.id] || 0,
        score: (receivedMap[p.id] || 0) * 2 + (givenMap[p.id] || 0),
      }))
      .sort((a, b) => b.receivedCount - a.receivedCount);

    return ranked;
  },
};
