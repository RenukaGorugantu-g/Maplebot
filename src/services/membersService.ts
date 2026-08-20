import { dataStore } from './dataStore';
import { Profile } from '../types/database';

export const membersService = {
  getMembers(podId?: string): Profile[] {
    const list = dataStore.getProfiles();
    return podId ? list.filter((m) => m.pod_id === podId) : list;
  },

  getMemberById(id: string): Profile | undefined {
    return dataStore.getProfileById(id);
  },

  createMember(data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Profile {
    return dataStore.createProfile(data);
  },

  updateMember(id: string, updates: Partial<Profile>): Profile | undefined {
    return dataStore.updateProfile(id, updates);
  },

  deleteMember(id: string): boolean {
    return dataStore.deleteProfile(id);
  },

  deactivateMember(id: string): Profile | undefined {
    return dataStore.updateProfile(id, { status: 'deactivated' });
  },

  reactivateMember(id: string): Profile | undefined {
    return dataStore.updateProfile(id, { status: 'active' });
  },
};

export const podsService = {
  getPods() {
    return dataStore.getPods();
  },

  getPodById(id: string) {
    return dataStore.getPodById(id);
  },

  createPod(data: { name: string; description?: string; manager_id?: string; organization_id: string }) {
    return dataStore.createPod({
      ...data,
      status: 'active',
    });
  },

  updatePod(id: string, updates: Partial<{ name: string; description: string; manager_id: string; status: 'active' | 'archived' }>) {
    return dataStore.updatePod(id, updates);
  },
};
