import { dataStore } from './dataStore';
import { googleChatService } from './googleChatService';
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
    const kudos = dataStore.giveKudos(data);
    const sender = dataStore.getProfileById(data.sender_id);
    const recipient = dataStore.getProfileById(data.recipient_id);
    const pod = data.pod_id ? dataStore.getPodById(data.pod_id) : undefined;

    if (sender && recipient) {
      // Async dispatch celebration card to Google Chat space
      googleChatService.sendKudosCard(
        sender.full_name,
        recipient.full_name,
        data.category,
        data.message,
        pod?.name
      );
    }

    return kudos;
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
