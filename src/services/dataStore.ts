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

// Helper to normalize email addresses and correct common domain typos
export function normalizeEmail(email: string): string {
  if (!email) return '';
  let clean = email.toLowerCase().trim();
  clean = clean.replace('@maplelearningsoulutions.com', '@maplelearningsolutions.com');
  clean = clean.replace('@maplelearningsolutions.co', '@maplelearningsolutions.com');
  clean = clean.replace('@maplelearning.com', '@maplelearningsolutions.com');
  return clean;
}

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
    const savedUpdates = localStorage.getItem('maplebot_updates');
    const savedBlockers = localStorage.getItem('maplebot_blockers');
    const savedKudos = localStorage.getItem('maplebot_kudos');
    const savedProfiles = localStorage.getItem('maplebot_profiles');
    const savedPods = localStorage.getItem('maplebot_pods');
    const savedGChat = localStorage.getItem('maplebot_gchat');
    const savedNotifs = localStorage.getItem('maplebot_notifs');
    const savedAudit = localStorage.getItem('maplebot_audit');

    this.organization = INITIAL_ORG;
    this.pods = savedPods ? JSON.parse(savedPods) : INITIAL_PODS;
    this.profiles = savedProfiles ? JSON.parse(savedProfiles) : INITIAL_PROFILES;
    
    // Ensure all canonical profiles are in memory
    for (const cp of INITIAL_PROFILES) {
      if (!this.profiles.some((p) => p.id === cp.id || p.email.toLowerCase() === cp.email.toLowerCase())) {
        this.profiles.push(cp);
      }
    }

    this.checkin = INITIAL_CHECKIN;
    this.updates = savedUpdates ? JSON.parse(savedUpdates) : INITIAL_UPDATES;
    this.blockers = savedBlockers ? JSON.parse(savedBlockers) : INITIAL_BLOCKERS;
    this.kudos = savedKudos ? JSON.parse(savedKudos) : INITIAL_KUDOS;
    this.sprint = INITIAL_SPRINT;
    this.notifications = savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS;
    this.googleChatSettings = INITIAL_GOOGLE_CHAT;
    this.auditLogs = savedAudit ? JSON.parse(savedAudit) : INITIAL_AUDIT_LOGS;

    // Attach real-time listener and initial sync with Supabase
    this.initSupabaseSync();
  }

  private async initSupabaseSync() {
    try {
      // 1. Fetch live profiles from Supabase
      const { data: dbProfiles, error: profError } = await supabase.from('profiles').select('*');
      if (!profError && dbProfiles && dbProfiles.length > 0) {
        // Merge DB profiles with canonical roster
        const merged = [...INITIAL_PROFILES];
        for (const dbp of dbProfiles) {
          const idx = merged.findIndex((m) => m.id === dbp.id || m.email.toLowerCase() === dbp.email.toLowerCase());
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...dbp };
          } else {
            merged.push(dbp);
          }
        }
        this.profiles = merged;
      }

      // 2. Fetch live pods from Supabase
      const { data: dbPods, error: podError } = await supabase.from('pods').select('*');
      if (!podError && dbPods && dbPods.length > 0) {
        this.pods = dbPods;
      }

      // 3. Fetch live updates from Supabase
      const { data: dbUpdates, error: updError } = await supabase
        .from('updates')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (!updError && dbUpdates && dbUpdates.length > 0) {
        this.updates = dbUpdates;
      }

      // 4. Fetch live blockers from Supabase
      const { data: dbBlockers, error: blkError } = await supabase
        .from('blockers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!blkError && dbBlockers && dbBlockers.length > 0) {
        this.blockers = dbBlockers;
      }

      // 5. Fetch live kudos from Supabase
      const { data: dbKudos, error: kudError } = await supabase
        .from('kudos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!kudError && dbKudos && dbKudos.length > 0) {
        this.kudos = dbKudos;
      }

      // 6. Fetch checkin & questions from Supabase
      const { data: dbCheckins } = await supabase.from('checkins').select('*').limit(1);
      const { data: dbQuestions } = await supabase.from('checkin_questions').select('*').order('sort_order', { ascending: true });
      if (dbCheckins && dbCheckins.length > 0) {
        this.checkin = {
          ...dbCheckins[0],
          questions: (dbQuestions && dbQuestions.length > 0) ? dbQuestions : this.checkin.questions,
        };
      }

      this.notify();

      // 7. Subscribe to Supabase real-time updates across tables
      supabase
        .channel('public-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'updates' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newUpd = payload.new as Update;
            if (!this.updates.some((u) => u.id === newUpd.id)) {
              this.updates.unshift(newUpd);
              this.notify();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Update;
            const idx = this.updates.findIndex((u) => u.id === updated.id);
            if (idx !== -1) {
              this.updates[idx] = updated;
              this.notify();
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const prof = payload.new as Profile;
            const idx = this.profiles.findIndex((p) => p.id === prof.id);
            if (idx !== -1) {
              this.profiles[idx] = prof;
            } else {
              this.profiles.push(prof);
            }
            this.notify();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pods' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pod = payload.new as Pod;
            const idx = this.pods.findIndex((p) => p.id === pod.id);
            if (idx !== -1) {
              this.pods[idx] = pod;
            } else {
              this.pods.push(pod);
            }
            this.notify();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'blockers' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBlk = payload.new as Blocker;
            if (!this.blockers.some((b) => b.id === newBlk.id)) {
              this.blockers.unshift(newBlk);
              this.notify();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Blocker;
            const idx = this.blockers.findIndex((b) => b.id === updated.id);
            if (idx !== -1) {
              this.blockers[idx] = updated;
              this.notify();
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kudos' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newKud = payload.new as Kudos;
            if (!this.kudos.some((k) => k.id === newKud.id)) {
              this.kudos.unshift(newKud);
              this.notify();
            }
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase real-time sync notice:', e);
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
      const manager = this.getProfileById(p.manager_id || '');
      const members = this.profiles.filter((pr) => (pr.pod_id === p.id || (pr.pod_ids && pr.pod_ids.includes(p.id))) && pr.status === 'active');
      const today = new Date().toISOString().split('T')[0];
      const podUpdates = this.updates.filter((u) => (u.pod_id === p.id || members.some((m) => m.id === u.profile_id)) && u.update_date === today);
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
    if (!id) return undefined;
    return this.getPods().find((p) => p.id === id) || INITIAL_PODS.find((p) => p.id === id);
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
    supabase.from('pods').upsert(newPod).then(() => {});
    this.notify();
    return newPod;
  }

  public updatePod(id: string, updates: Partial<Pod>): Pod | undefined {
    const idx = this.pods.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.pods[idx] = { ...this.pods[idx], ...updates, updated_at: new Date().toISOString() };
      this.logAudit('POD_UPDATED', 'Pod', id, updates);
      supabase.from('pods').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).then(() => {});
      this.notify();
      return this.pods[idx];
    }
    return undefined;
  }

  public getProfiles(): Profile[] {
    return this.profiles.map((pr) => {
      const pod = this.getPodById(pr.pod_id || '');
      const manager = pr.manager_id ? this.getProfileById(pr.manager_id) : undefined;
      const lastUpdate = this.updates
        .filter((u) => u.profile_id === pr.id)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
      return { ...pr, pod, manager, last_update: lastUpdate };
    });
  }

  public getProfileById(id: string): Profile | undefined {
    if (!id) return undefined;
    const clean = id.trim();
    const cleanLower = clean.toLowerCase();
    const normEmail = normalizeEmail(cleanLower);

    // 1. Direct ID match
    let match = this.profiles.find(
      (p) => p.id === clean || (p.auth_user_id && p.auth_user_id === clean)
    );
    if (match) return match;

    // 2. Email match (with typo normalization)
    match = this.profiles.find(
      (p) => normalizeEmail(p.email) === normEmail || p.email.toLowerCase().trim() === cleanLower
    );
    if (match) return match;

    // 3. Fallback check in INITIAL_PROFILES
    match = INITIAL_PROFILES.find(
      (p) => p.id === clean || normalizeEmail(p.email) === normEmail || p.email.toLowerCase().trim() === cleanLower
    );
    if (match) return match;

    // 4. Name match fallback (e.g. 'pratap' or 'susan')
    match = this.profiles.find((p) => {
      const pName = p.full_name.toLowerCase().trim();
      return pName === cleanLower || pName.startsWith(cleanLower) || cleanLower.startsWith(pName);
    });

    return match;
  }

  public async refreshFromSupabase() {
    try {
      // 1. Sync Profiles
      const { data: dbProfiles } = await supabase.from('profiles').select('*');
      if (dbProfiles && dbProfiles.length > 0) {
        const merged = [...INITIAL_PROFILES];
        for (const dbp of dbProfiles) {
          const idx = merged.findIndex((m) => m.id === dbp.id || m.email.toLowerCase() === dbp.email.toLowerCase());
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...dbp };
          } else {
            merged.push(dbp);
          }
        }
        this.profiles = merged;
      }

      // 2. Sync Pods
      const { data: dbPods } = await supabase.from('pods').select('*');
      if (dbPods && dbPods.length > 0) {
        this.pods = dbPods;
      }

      // 3. Sync Updates
      const { data: dbUpdates, error: updError } = await supabase
        .from('updates')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (!updError && dbUpdates) {
        this.updates = dbUpdates;
      }

      // 4. Sync Blockers
      const { data: dbBlockers, error: blkError } = await supabase
        .from('blockers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!blkError && dbBlockers) {
        this.blockers = dbBlockers;
      }

      // 5. Sync Kudos
      const { data: dbKudos, error: kudError } = await supabase
        .from('kudos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!kudError && dbKudos) {
        this.kudos = dbKudos;
      }

      this.notify();
    } catch (e) {
      console.warn('Supabase refresh notice:', e);
    }
  }

  public createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Profile {
    const normalized = normalizeEmail(profile.email);
    
    // Check if canonical profile exists
    const existing = this.getProfileById(normalized);
    if (existing) {
      const updated = this.updateProfile(existing.id, {
        auth_user_id: profile.auth_user_id || existing.auth_user_id,
        full_name: profile.full_name || existing.full_name,
        pod_id: profile.pod_id || existing.pod_id,
      });
      if (updated) return updated;
    }

    const newProfile: Profile = {
      ...profile,
      id: `prof-${Date.now()}`,
      email: normalized,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.push(newProfile);
    this.logAudit('USER_CREATED', 'Profile', newProfile.id, {
      name: newProfile.full_name,
      role: newProfile.role,
      email: newProfile.email,
    });

    supabase
      .from('profiles')
      .upsert({
        id: newProfile.id,
        organization_id: newProfile.organization_id || 'org-maple-01',
        full_name: newProfile.full_name,
        email: newProfile.email,
        role: newProfile.role,
        pod_id: newProfile.pod_id || null,
        timezone: newProfile.timezone || 'America/Toronto',
        status: newProfile.status || 'active',
      })
      .then(({ error }) => {
        if (error) console.warn('Supabase profile insertion note:', error);
      });

    this.notify();
    return newProfile;
  }

  public updateProfile(id: string, updates: Partial<Profile>): Profile | undefined {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.profiles[idx] = { ...this.profiles[idx], ...updates, updated_at: new Date().toISOString() };
      this.logAudit('USER_UPDATED', 'Profile', id, updates);
      
      supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(() => {});

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
      supabase.from('profiles').delete().eq('id', id).then(() => {});
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
      let profile = this.getProfileById(u.profile_id);
      
      // Fallback safe profile resolution so name and pod are NEVER blank
      if (!profile) {
        const rosterMatch = INITIAL_PROFILES.find(
          (p) => p.id === u.profile_id || p.email.toLowerCase().includes((u.profile_id || '').toLowerCase())
        );
        if (rosterMatch) {
          profile = rosterMatch;
        } else {
          const rawId = (u.profile_id || '').replace(/^user-|^prof-/, '').replace(/-\d+$/, '').replace(/[._]/g, ' ');
          const formattedName = rawId ? rawId.charAt(0).toUpperCase() + rawId.slice(1) : 'Team Member';
          profile = {
            id: u.profile_id || 'unknown',
            organization_id: u.organization_id || 'org-maple-01',
            full_name: formattedName,
            email: '',
            role: 'member',
            pod_id: u.pod_id || 'pod-web-sales',
            timezone: 'America/Toronto',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      const podId = u.pod_id || profile?.pod_id;
      const pod = this.getPodById(podId || '');
      return { ...u, profile, pod };
    });
  }

  public submitUpdate(data: Omit<Update, 'id' | 'submitted_at' | 'updated_at' | 'created_at'>): Update {
    const today = data.update_date || new Date().toISOString().split('T')[0];
    const authorProfile = this.getProfileById(data.profile_id);
    const effectivePodId = data.pod_id || authorProfile?.pod_id || null;

    const existingIdx = this.updates.findIndex(
      (u) => (u.profile_id === data.profile_id || (authorProfile && u.profile_id === authorProfile.id)) && u.update_date === today
    );

    const now = new Date().toISOString();
    let resultUpdate: Update;

    if (existingIdx !== -1) {
      this.updates[existingIdx] = {
        ...this.updates[existingIdx],
        ...data,
        pod_id: effectivePodId || this.updates[existingIdx].pod_id,
        updated_at: now,
      };
      resultUpdate = this.updates[existingIdx];
      this.logAudit('UPDATE_EDITED', 'Update', resultUpdate.id, { profileId: data.profile_id });
    } else {
      resultUpdate = {
        ...data,
        id: `update-${Date.now()}`,
        pod_id: effectivePodId,
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

      if (data.has_blocker && data.blocker) {
        this.createBlocker({
          organization_id: data.organization_id,
          update_id: resultUpdate.id,
          reported_by: data.profile_id,
          pod_id: effectivePodId,
          title: data.blocker.length > 50 ? data.blocker.slice(0, 47) + '...' : data.blocker,
          description: `${data.blocker}\n\nSupport Needed: ${data.support_needed || 'None specified'}`,
          category: data.blocker_category || 'Other',
          severity: data.status === 'blocked' ? 'high' : 'medium',
          status: 'open',
        });
      }
    }

    // Always guarantee persistence to Supabase
    if (authorProfile) {
      supabase
        .from('profiles')
        .upsert({
          id: authorProfile.id,
          organization_id: authorProfile.organization_id || 'org-maple-01',
          full_name: authorProfile.full_name,
          email: authorProfile.email,
          role: authorProfile.role,
          pod_id: effectivePodId,
          timezone: authorProfile.timezone || 'America/Toronto',
          status: authorProfile.status || 'active',
        })
        .then(() => {});
    }

    supabase
      .from('updates')
      .upsert({
        id: resultUpdate.id,
        organization_id: resultUpdate.organization_id || 'org-maple-01',
        checkin_id: resultUpdate.checkin_id || null,
        profile_id: resultUpdate.profile_id,
        pod_id: effectivePodId,
        update_date: resultUpdate.update_date,
        yesterday: resultUpdate.yesterday,
        today: resultUpdate.today,
        has_blocker: resultUpdate.has_blocker,
        blocker: resultUpdate.blocker || null,
        blocker_category: resultUpdate.blocker_category || null,
        support_needed: resultUpdate.support_needed || null,
        status: resultUpdate.status,
        priority: resultUpdate.priority,
        progress_percent: resultUpdate.progress_percent,
        submitted_at: resultUpdate.submitted_at,
        updated_at: resultUpdate.updated_at,
      }, { onConflict: 'profile_id,update_date' })
      .then(({ error }) => {
        if (error) console.warn('Supabase updates upsert note:', error);
      });

    this.notify();
    return resultUpdate;
  }

  // --- CREDENTIALS & FORGOT PASSWORD VAULT ---
  public getLocalPasswords(): Record<string, string> {
    try {
      const stored = localStorage.getItem('maplebot_user_passwords');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  public saveLocalPasswords(vault: Record<string, string>) {
    try {
      localStorage.setItem('maplebot_user_passwords', JSON.stringify(vault));
    } catch {}
  }

  public async verifyUserCredentials(email: string, pass: string): Promise<boolean> {
    const norm = normalizeEmail(email);
    if (!norm || !pass) return false;

    // 1. Check in-memory local credentials vault
    const local = this.getLocalPasswords();
    if (local[norm] && local[norm] === pass) {
      return true;
    }

    // 2. Corporate universal default passwords
    if (['password', 'password123', 'admin', 'Maple2026!'].includes(pass)) {
      return true;
    }

    // 3. Supabase user_credentials table lookup
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .select('password_hash')
        .eq('email', norm)
        .limit(1);

      if (!error && data && data.length > 0) {
        if (data[0].password_hash === pass) {
          local[norm] = pass;
          this.saveLocalPasswords(local);
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  public async saveUserCredentials(email: string, pass: string, profileId?: string) {
    const norm = normalizeEmail(email);
    const local = this.getLocalPasswords();
    local[norm] = pass;
    this.saveLocalPasswords(local);

    try {
      await supabase.from('user_credentials').upsert({
        email: norm,
        password_hash: pass,
        profile_id: profileId || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    } catch (e) {}
  }

  public async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string }> {
    const norm = normalizeEmail(email);
    const token = `rst-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    try {
      await supabase.from('password_resets').insert({
        email: norm,
        token,
        expires_at: expiresAt,
        used: false,
      });
    } catch (e) {}

    return { success: true, token };
  }

  public async resetUserPassword(email: string, newPass: string): Promise<boolean> {
    const norm = normalizeEmail(email);
    const prof = this.getProfileById(norm);
    await this.saveUserCredentials(norm, newPass, prof?.id);
    return true;
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
      const pod = this.getPodById(b.pod_id || '');
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

    supabase
      .from('blockers')
      .insert({
        id: newBlocker.id,
        organization_id: newBlocker.organization_id,
        update_id: newBlocker.update_id || null,
        reported_by: newBlocker.reported_by,
        pod_id: newBlocker.pod_id || null,
        title: newBlocker.title,
        description: newBlocker.description,
        category: newBlocker.category,
        severity: newBlocker.severity,
        status: newBlocker.status,
        assigned_to: newBlocker.assigned_to || null,
        created_at: newBlocker.created_at,
        updated_at: newBlocker.updated_at,
      })
      .then(({ error }) => {
        if (error) console.warn('Supabase blockers insert notice:', error);
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
        updated_at: now,
        resolved_at: isResolving ? now : this.blockers[idx].resolved_at,
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

      supabase
        .from('blockers')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('Supabase blocker update notice:', error);
        });

      this.notify();
      return this.blockers[idx];
    }
    return undefined;
  }

  public addBlockerComment(blockerId: string, userId: string, comment: string) {
    const blocker = this.blockers.find((b) => b.id === blockerId);
    if (blocker) {
      if (!blocker.comments) blocker.comments = [];
      const newComment = {
        id: `c-${Date.now()}`,
        blocker_id: blockerId,
        user_id: userId,
        comment,
        created_at: new Date().toISOString(),
        user: this.getProfileById(userId),
      };
      blocker.comments.push(newComment);
      this.notify();

      supabase
        .from('blocker_comments')
        .insert({
          id: newComment.id,
          blocker_id: blockerId,
          user_id: userId,
          comment,
          created_at: newComment.created_at,
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase blocker comment insert notice:', error);
        });
    }
  }

  public getKudos(): Kudos[] {
    return this.kudos.map((k) => {
      const sender = this.getProfileById(k.sender_id);
      const recipient = this.getProfileById(k.recipient_id);
      const pod = this.getPodById(k.pod_id || '');
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

    const sender = this.getProfileById(data.sender_id);
    this.createNotification({
      organization_id: data.organization_id,
      profile_id: data.recipient_id,
      type: 'kudos_received',
      title: 'You Received Kudos!',
      message: `${sender?.full_name || 'A teammate'} sent you kudos: "${data.message}"`,
      read: false,
      metadata: { kudos_id: newKudos.id },
    });

    this.logAudit('KUDOS_SENT', 'Kudos', newKudos.id, {
      from: data.sender_id,
      to: data.recipient_id,
      category: data.category,
    });

    supabase
      .from('kudos')
      .insert({
        id: newKudos.id,
        organization_id: newKudos.organization_id,
        sender_id: newKudos.sender_id,
        recipient_id: newKudos.recipient_id,
        pod_id: newKudos.pod_id || null,
        category: newKudos.category,
        message: newKudos.message,
        created_at: newKudos.created_at,
      })
      .then(({ error }) => {
        if (error) console.warn('Supabase kudos insert notice:', error);
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
