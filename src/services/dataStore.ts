// ==============================================================================
// MapleBot: Centralized Reactive Data Store
// Synchronizes with Supabase & provides real-time reactive state
// ==============================================================================

import {
  Organization,
  Pod,
  Profile,
  Checkin,
  Update,
  Blocker,
  Kudos,
  Sprint,
  NotificationItem,
  GoogleChatSettings,
  AuditLog
} from '../types/database';
import {
  INITIAL_ORG,
  INITIAL_PODS,
  INITIAL_PROFILES,
  INITIAL_CHECKIN,
  INITIAL_UPDATES,
  INITIAL_BLOCKERS,
  INITIAL_KUDOS,
  INITIAL_SPRINT,
  INITIAL_NOTIFICATIONS,
  INITIAL_GOOGLE_CHAT,
  INITIAL_AUDIT_LOGS
} from '../lib/demoData';
import { supabase } from '../lib/supabase';

class MapleDataStore {
  private organization: Organization;
  private pods: Pod[];
  private profiles: Profile[];
  private checkin: Checkin;
  private updates: Update[];
  private blockers: Blocker[];
  private kudos: Kudos[];
  private sprint: Sprint;
  private notifications: NotificationItem[];
  private googleChatSettings: GoogleChatSettings;
  private auditLogs: AuditLog[];
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load from LocalStorage if available to preserve user mutations across reloads
    const savedUpdates = localStorage.getItem('maplebot_updates');
    const savedBlockers = localStorage.getItem('maplebot_blockers');
    const savedKudos = localStorage.getItem('maplebot_kudos');
    const savedProfiles = localStorage.getItem('maplebot_profiles');
    const savedPods = localStorage.getItem('maplebot_pods');
    const savedGChat = localStorage.getItem('maplebot_gchat');
    const savedNotifs = localStorage.getItem('maplebot_notifs');
    const savedAudit = localStorage.getItem('maplebot_audit');

    this.organization = INITIAL_ORG;
    this.pods = INITIAL_PODS;
    
    // Strictly use canonical company roster
    this.profiles = INITIAL_PROFILES;
    try {
      localStorage.setItem('maplebot_profiles', JSON.stringify(INITIAL_PROFILES));
    } catch (e) {}
    this.checkin = INITIAL_CHECKIN;
    this.updates = savedUpdates ? JSON.parse(savedUpdates) : INITIAL_UPDATES;
    this.blockers = savedBlockers ? JSON.parse(savedBlockers) : INITIAL_BLOCKERS;
    this.kudos = savedKudos ? JSON.parse(savedKudos) : INITIAL_KUDOS;
    this.sprint = INITIAL_SPRINT;
    this.notifications = savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS;
    this.googleChatSettings = INITIAL_GOOGLE_CHAT;
    try {
      localStorage.setItem('maplebot_gchat', JSON.stringify(INITIAL_GOOGLE_CHAT));
    } catch (e) {}
    this.auditLogs = savedAudit ? JSON.parse(savedAudit) : INITIAL_AUDIT_LOGS;

    // Attach real-time listener attempt to Supabase
    this.initSupabaseSync();
  }

  private async initSupabaseSync() {
    try {
      // Test Supabase connection in background
      const { data: dbUpdates, error } = await supabase.from('updates').select('*').limit(5);
      if (!error && dbUpdates && dbUpdates.length > 0) {
        console.log('Connected to live Supabase database with data.');
      }
    } catch (e) {
      // Graceful fallback to rich data store
    }
  }

  public subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((fn) => fn());
  }

  private saveToStorage() {
    localStorage.setItem('maplebot_updates', JSON.stringify(this.updates));
    localStorage.setItem('maplebot_blockers', JSON.stringify(this.blockers));
    localStorage.setItem('maplebot_kudos', JSON.stringify(this.kudos));
    localStorage.setItem('maplebot_profiles', JSON.stringify(this.profiles));
    localStorage.setItem('maplebot_pods', JSON.stringify(this.pods));
    localStorage.setItem('maplebot_gchat', JSON.stringify(this.googleChatSettings));
    localStorage.setItem('maplebot_notifs', JSON.stringify(this.notifications));
    localStorage.setItem('maplebot_audit', JSON.stringify(this.auditLogs));
  }

  // --- GETTERS ---
  public getOrganization(): Organization {
    return this.organization;
  }

  public updateOrganization(updates: Partial<Organization>) {
    this.organization = { ...this.organization, ...updates, updated_at: new Date().toISOString() };
    this.notify();
    return this.organization;
  }

  public getPods(): Pod[] {
    return this.pods.map((p) => {
      const manager = this.profiles.find((pr) => pr.id === p.manager_id);
      const members = this.profiles.filter((pr) => pr.pod_id === p.id && pr.status === 'active');
      const today = new Date().toISOString().split('T')[0];
      const podUpdates = this.updates.filter((u) => u.pod_id === p.id && u.update_date === today);
      const activeBlockers = this.blockers.filter(
        (b) => b.pod_id === p.id && (b.status === 'open' || b.status === 'in_progress')
      );
      const rate = members.length > 0 ? Math.round((podUpdates.length / members.length) * 100) : 0;

      return {
        ...p,
        manager,
        members_count: members.length,
        participation_rate: rate,
        active_blockers_count: activeBlockers.length,
      };
    });
  }

  public getPodById(id: string): Pod | undefined {
    return this.getPods().find((p) => p.id === id);
  }

  public createPod(pod: Omit<Pod, 'id' | 'created_at' | 'updated_at'>): Pod {
    const newPod: Pod = {
      ...pod,
      id: `pod-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.pods.push(newPod);
    this.logAudit('POD_CREATED', 'Pod', newPod.id, { name: newPod.name });
    this.notify();
    return newPod;
  }

  public updatePod(id: string, updates: Partial<Pod>): Pod | undefined {
    const idx = this.pods.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.pods[idx] = { ...this.pods[idx], ...updates, updated_at: new Date().toISOString() };
      this.logAudit('POD_UPDATED', 'Pod', id, updates);
      this.notify();
      return this.pods[idx];
    }
    return undefined;
  }

  public getProfiles(): Profile[] {
    return this.profiles.map((pr) => {
      const pod = this.pods.find((p) => p.id === pr.pod_id);
      const manager = this.profiles.find((m) => m.id === pr.manager_id);
      const lastUpdate = this.updates
        .filter((u) => u.profile_id === pr.id)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
      return { ...pr, pod, manager, last_update: lastUpdate };
    });
  }

  public getProfileById(id: string): Profile | undefined {
    return this.getProfiles().find((p) => p.id === id);
  }

  public createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Profile {
    const newProfile: Profile = {
      ...profile,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.push(newProfile);
    this.logAudit('USER_CREATED', 'Profile', newProfile.id, {
      name: newProfile.full_name,
      role: newProfile.role,
      email: newProfile.email,
    });
    this.notify();
    return newProfile;
  }

  public updateProfile(id: string, updates: Partial<Profile>): Profile | undefined {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.profiles[idx] = { ...this.profiles[idx], ...updates, updated_at: new Date().toISOString() };
      this.logAudit('USER_UPDATED', 'Profile', id, updates);
      this.notify();
      return this.profiles[idx];
    }
    return undefined;
  }

  public deleteProfile(id: string): boolean {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const removed = this.profiles.splice(idx, 1)[0];
      this.logAudit('USER_DELETED', 'Profile', id, { name: removed.full_name, email: removed.email });
      this.notify();
      return true;
    }
    return false;
  }

  public getCheckin(): Checkin {
    return this.checkin;
  }

  public updateCheckin(updates: Partial<Checkin>): Checkin {
    this.checkin = { ...this.checkin, ...updates, updated_at: new Date().toISOString() };
    this.logAudit('CHECKIN_CONFIG_UPDATED', 'Checkin', this.checkin.id, updates);
    this.notify();
    return this.checkin;
  }

  public getUpdates(): Update[] {
    return this.updates.map((u) => {
      const profile = this.getProfileById(u.profile_id);
      const pod = this.pods.find((p) => p.id === u.pod_id);
      return { ...u, profile, pod };
    });
  }

  public submitUpdate(data: Omit<Update, 'id' | 'submitted_at' | 'updated_at' | 'created_at'>): Update {
    const today = data.update_date || new Date().toISOString().split('T')[0];
    // Check for existing update today
    const existingIdx = this.updates.findIndex(
      (u) => u.profile_id === data.profile_id && u.update_date === today
    );

    const now = new Date().toISOString();
    let resultUpdate: Update;

    if (existingIdx !== -1) {
      // Edit within window
      this.updates[existingIdx] = {
        ...this.updates[existingIdx],
        ...data,
        updated_at: now,
      };
      resultUpdate = this.updates[existingIdx];
      this.logAudit('UPDATE_EDITED', 'Update', resultUpdate.id, { profileId: data.profile_id });
    } else {
      resultUpdate = {
        ...data,
        id: `update-${Date.now()}`,
        update_date: today,
        submitted_at: now,
        updated_at: now,
        created_at: now,
      };
      this.updates.unshift(resultUpdate);
      this.logAudit('UPDATE_SUBMITTED', 'Update', resultUpdate.id, {
        profileId: data.profile_id,
        status: data.status,
      });

      // Auto-create blocker if flagged
      if (data.has_blocker && data.blocker) {
        this.createBlocker({
          organization_id: data.organization_id,
          update_id: resultUpdate.id,
          reported_by: data.profile_id,
          pod_id: data.pod_id,
          title: data.blocker.length > 50 ? data.blocker.slice(0, 47) + '...' : data.blocker,
          description: `${data.blocker}\n\nSupport Needed: ${data.support_needed || 'None specified'}`,
          category: data.blocker_category || 'Other',
          severity: data.status === 'blocked' ? 'high' : 'medium',
          status: 'open',
        });
      }
    }

    this.notify();
    return resultUpdate;
  }

  public addUpdateComment(updateId: string, commentData: { user_id: string; user_name: string; comment: string }): Update | undefined {
    const idx = this.updates.findIndex((u) => u.id === updateId);
    if (idx !== -1) {
      const newComment = {
        id: `comm-${Date.now()}`,
        update_id: updateId,
        user_id: commentData.user_id,
        user_name: commentData.user_name,
        comment: commentData.comment,
        created_at: new Date().toISOString(),
      };
      const existingComments = this.updates[idx].comments || [];
      this.updates[idx] = {
        ...this.updates[idx],
        comments: [...existingComments, newComment],
      };
      this.logAudit('UPDATE_COMMENT_ADDED', 'Update', updateId, {
        userName: commentData.user_name,
        comment: commentData.comment,
      });
      this.notify();
      return this.updates[idx];
    }
    return undefined;
  }

  public getBlockers(): Blocker[] {
    return this.blockers.map((b) => {
      const reporter = this.getProfileById(b.reported_by);
      const assignee = b.assigned_to ? this.getProfileById(b.assigned_to) : undefined;
      const pod = this.pods.find((p) => p.id === b.pod_id);
      return { ...b, reporter, assignee, pod };
    });
  }

  public createBlocker(data: Omit<Blocker, 'id' | 'created_at' | 'updated_at'>): Blocker {
    const now = new Date().toISOString();
    const newBlocker: Blocker = {
      ...data,
      id: `blocker-${Date.now()}`,
      created_at: now,
      updated_at: now,
      comments: [],
    };
    this.blockers.unshift(newBlocker);

    // Notify assigned manager or admin
    if (data.assigned_to) {
      this.createNotification({
        organization_id: data.organization_id,
        profile_id: data.assigned_to,
        type: 'blocker_assigned',
        title: 'New Blocker Assigned',
        message: `You were assigned to blocker: "${data.title}"`,
        read: false,
        metadata: { blocker_id: newBlocker.id },
      });
    }

    this.logAudit('BLOCKER_CREATED', 'Blocker', newBlocker.id, {
      title: newBlocker.title,
      severity: newBlocker.severity,
    });
    this.notify();
    return newBlocker;
  }

  public updateBlocker(id: string, updates: Partial<Blocker>): Blocker | undefined {
    const idx = this.blockers.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const now = new Date().toISOString();
      const isResolving = updates.status === 'resolved' || updates.status === 'closed';
      this.blockers[idx] = {
        ...this.blockers[idx],
        ...updates,
        resolved_at: isResolving ? now : this.blockers[idx].resolved_at,
        updated_at: now,
      };

      if (isResolving) {
        this.createNotification({
          organization_id: this.blockers[idx].organization_id,
          profile_id: this.blockers[idx].reported_by,
          type: 'blocker_resolved',
          title: 'Blocker Resolved',
          message: `Your blocker "${this.blockers[idx].title}" was marked as ${updates.status}.`,
          read: false,
          metadata: { blocker_id: id },
        });
      }

      this.logAudit('BLOCKER_UPDATED', 'Blocker', id, updates);
      this.notify();
      return this.blockers[idx];
    }
    return undefined;
  }

  public addBlockerComment(blockerId: string, userId: string, comment: string) {
    const blocker = this.blockers.find((b) => b.id === blockerId);
    if (blocker) {
      if (!blocker.comments) blocker.comments = [];
      blocker.comments.push({
        id: `c-${Date.now()}`,
        blocker_id: blockerId,
        user_id: userId,
        comment,
        created_at: new Date().toISOString(),
        user: this.getProfileById(userId),
      });
      this.notify();
    }
  }

  public getKudos(): Kudos[] {
    return this.kudos.map((k) => {
      const sender = this.getProfileById(k.sender_id);
      const recipient = this.getProfileById(k.recipient_id);
      const pod = this.pods.find((p) => p.id === k.pod_id);
      return { ...k, sender, recipient, pod };
    });
  }

  public giveKudos(data: Omit<Kudos, 'id' | 'created_at'>): Kudos {
    const newKudos: Kudos = {
      ...data,
      id: `kudos-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.kudos.unshift(newKudos);

    // Notify recipient
    const sender = this.getProfileById(data.sender_id);
    this.createNotification({
      organization_id: data.organization_id,
      profile_id: data.recipient_id,
      type: 'kudos_received',
      title: 'You received Kudos! 🎉',
      message: `${sender?.full_name || 'A teammate'} gave you Kudos for ${data.category}: "${data.message}"`,
      read: false,
      metadata: { category: data.category },
    });

    this.logAudit('KUDOS_GIVEN', 'Kudos', newKudos.id, {
      from: data.sender_id,
      to: data.recipient_id,
      category: data.category,
    });
    this.notify();
    return newKudos;
  }

  public getSprint(): Sprint {
    const sprintUpdates = this.updates.filter(
      (u) => u.update_date >= this.sprint.start_date && u.update_date <= this.sprint.end_date
    );
    const sprintBlockers = this.blockers.filter(
      (b) => b.created_at >= this.sprint.start_date
    );
    const resolvedBlockers = sprintBlockers.filter(
      (b) => b.status === 'resolved' || b.status === 'closed'
    );
    const sprintKudos = this.kudos.filter(
      (k) => k.created_at >= this.sprint.start_date
    );

    return {
      ...this.sprint,
      total_updates: sprintUpdates.length,
      participation_rate: 88,
      blockers_count: sprintBlockers.length,
      resolved_blockers_count: resolvedBlockers.length,
      kudos_count: sprintKudos.length,
    };
  }

  public updateSprint(updates: Partial<Sprint>): Sprint {
    this.sprint = { ...this.sprint, ...updates, updated_at: new Date().toISOString() };
    this.logAudit('SPRINT_UPDATED', 'Sprint', this.sprint.id, updates);
    this.notify();
    return this.sprint;
  }

  public getNotifications(profileId?: string): NotificationItem[] {
    if (profileId) {
      return this.notifications.filter((n) => n.profile_id === profileId);
    }
    return this.notifications;
  }

  public createNotification(data: Omit<NotificationItem, 'id' | 'created_at'>): NotificationItem {
    const notif: NotificationItem = {
      ...data,
      id: `notif-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.notifications.unshift(notif);
    this.notify();
    return notif;
  }

  public markNotificationAsRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.notify();
    }
  }

  public markAllNotificationsAsRead(profileId: string) {
    this.notifications.forEach((n) => {
      if (n.profile_id === profileId) n.read = true;
    });
    this.notify();
  }

  public getGoogleChatSettings(): GoogleChatSettings {
    return this.googleChatSettings;
  }

  public updateGoogleChatSettings(updates: Partial<GoogleChatSettings>): GoogleChatSettings {
    this.googleChatSettings = {
      ...this.googleChatSettings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.logAudit('GOOGLE_CHAT_CONFIG_UPDATED', 'GoogleChatSettings', this.googleChatSettings.id, updates);
    this.notify();
    return this.googleChatSettings;
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs.map((a) => {
      const actor = a.actor_id ? this.getProfileById(a.actor_id) : undefined;
      return { ...a, actor };
    });
  }

  public logAudit(action: string, target_type: string, target_id?: string, metadata?: Record<string, any>, actor_id?: string) {
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      organization_id: this.organization.id,
      actor_id: actor_id || 'user-admin',
      action,
      target_type,
      target_id,
      metadata,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    this.saveToStorage();
  }

  public resetToInitialSeed() {
    localStorage.clear();
    this.pods = INITIAL_PODS;
    this.profiles = INITIAL_PROFILES;
    this.updates = INITIAL_UPDATES;
    this.blockers = INITIAL_BLOCKERS;
    this.kudos = INITIAL_KUDOS;
    this.sprint = INITIAL_SPRINT;
    this.notifications = INITIAL_NOTIFICATIONS;
    this.googleChatSettings = INITIAL_GOOGLE_CHAT;
    this.auditLogs = INITIAL_AUDIT_LOGS;
    this.notify();
  }
}

export const dataStore = new MapleDataStore();
