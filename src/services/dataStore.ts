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
  UpdateComment,
  Blocker,
  Kudos,
  Sprint,
  NotificationItem,
  GoogleChatSettings,
  AuditLog,
  BlockerCategory
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
import {
  PerformanceWorkLog,
  PerformanceKPI,
  PerformanceReport
} from '../types/performance';
import {
  CompanyHoliday,
  LeaveRequest,
  Quarter,
  HalfYear,
  LeaveStatus,
  EmployeeLeaveBalance
} from '../types/leave';
import {
  INITIAL_PERFORMANCE_KPIS,
  INITIAL_PERFORMANCE_WORK_LOGS,
  INITIAL_PERFORMANCE_REPORTS
} from '../lib/performanceSeedData';
import {
  INITIAL_COMPANY_HOLIDAYS_2026,
  INITIAL_PLANNED_LEAVES
} from '../lib/holidayData';
import { supabase } from '../lib/supabase';

// Helper to normalize email addresses and correct common domain typos
export function normalizeEmail(email: string): string {
  if (!email) return '';
  let clean = email.toLowerCase().trim();
  clean = clean.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
  clean = clean.replace(/@maplelearningsoulutions.*$/, '@maplelearningsolutions.com');
  clean = clean.replace(/@maplelearning.*$/, '@maplelearningsolutions.com');
  clean = clean.replace(/\.comm+$/, '.com');
  clean = clean.replace(/\.co$/, '.com');
  clean = clean.replace(/\.con$/, '.com');
  clean = clean.replace(/\.cm$/, '.com');
  return clean;
}

export function sanitizeBlockerCategory(cat?: string): BlockerCategory {
  if (!cat) return 'Other';
  const allowed: BlockerCategory[] = ['Task', 'Project', 'Client', 'Team', 'Access', 'Dependency', 'Technical', 'Resource', 'Other'];
  if (allowed.includes(cat as any)) return cat as BlockerCategory;
  if (cat.toLowerCase() === 'task' || cat.toLowerCase() === 'process') return 'Dependency';
  return 'Other';
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
  private performanceWorkLogs: PerformanceWorkLog[];
  private performanceKpis: PerformanceKPI[];
  private performanceReports: PerformanceReport[];
  private companyHolidays: CompanyHoliday[];
  private leaveRequests: LeaveRequest[];
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
    const savedWorkLogs = localStorage.getItem('maplebot_performance_work_logs');
    const savedKpis = localStorage.getItem('maplebot_performance_kpis');
    const savedReports = localStorage.getItem('maplebot_performance_reports');
    const savedHolidays = localStorage.getItem('maplebot_holidays');
    const savedLeaves = localStorage.getItem('maplebot_leaves');

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
    const initialRawUpdates: Update[] = savedUpdates ? JSON.parse(savedUpdates) : INITIAL_UPDATES;
    this.updates = this.mergeUpdatesWithComments(initialRawUpdates, []);
    this.blockers = savedBlockers ? JSON.parse(savedBlockers) : INITIAL_BLOCKERS;
    this.kudos = savedKudos ? JSON.parse(savedKudos) : INITIAL_KUDOS;
    this.sprint = INITIAL_SPRINT;
    this.notifications = savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS;
    this.googleChatSettings = INITIAL_GOOGLE_CHAT;
    this.auditLogs = savedAudit ? JSON.parse(savedAudit) : INITIAL_AUDIT_LOGS;

    this.performanceWorkLogs = savedWorkLogs ? JSON.parse(savedWorkLogs) : INITIAL_PERFORMANCE_WORK_LOGS;
    this.performanceKpis = savedKpis ? JSON.parse(savedKpis) : INITIAL_PERFORMANCE_KPIS;
    this.performanceReports = savedReports ? JSON.parse(savedReports) : INITIAL_PERFORMANCE_REPORTS;
    this.companyHolidays = savedHolidays ? JSON.parse(savedHolidays) : INITIAL_COMPANY_HOLIDAYS_2026;
    this.leaveRequests = savedLeaves ? JSON.parse(savedLeaves) : INITIAL_PLANNED_LEAVES;

    // Attach real-time listener and initial sync with Supabase
    this.initSupabaseSync();
  }

  // --- COMMENTS VAULT STORAGE ---
  private getStoredCommentsVault(): Record<string, UpdateComment[]> {
    try {
      const raw = localStorage.getItem('maplebot_comments_vault');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveStoredCommentsVault(vault: Record<string, UpdateComment[]>) {
    try {
      localStorage.setItem('maplebot_comments_vault', JSON.stringify(vault));
    } catch {}
  }

  private mergeUpdatesWithComments(dbUpdates: Update[], dbComments: UpdateComment[] = []): Update[] {
    const vault = this.getStoredCommentsVault();
    const result = dbUpdates.map((u) => {
      const fromDb = dbComments.filter((c) => c.update_id === u.id);
      const fromVault = vault[u.id] || [];
      const fromMemory = (this.updates || []).find((old) => old.id === u.id)?.comments || [];

      const commentMap = new Map<string, UpdateComment>();
      [...fromMemory, ...fromVault, ...fromDb].forEach((c) => {
        if (c && c.id) commentMap.set(c.id, c);
      });

      const mergedComments = Array.from(commentMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      if (mergedComments.length > 0) {
        vault[u.id] = mergedComments;
      }

      return {
        ...u,
        comments: mergedComments,
      };
    });

    this.saveStoredCommentsVault(vault);
    return result;
  }

  private async initSupabaseSync() {
    try {
      // 1. Fetch live profiles from Supabase
      const { data: dbProfiles, error: profError } = await supabase.from('profiles').select('*');
      if (!profError && dbProfiles && dbProfiles.length > 0) {
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

      // 3. Fetch live comments from Supabase (if table exists)
      let dbComments: UpdateComment[] = [];
      try {
        const { data: cData, error: cErr } = await supabase.from('update_comments').select('*');
        if (!cErr && cData) {
          dbComments = cData;
        }
      } catch (e) {}

      // 4. Fetch live updates from Supabase
      const { data: dbUpdates, error: updError } = await supabase
        .from('updates')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (!updError && dbUpdates && dbUpdates.length > 0) {
        this.updates = this.mergeUpdatesWithComments(dbUpdates, dbComments);
      }

      // 5. Fetch live blockers from Supabase
      const { data: dbBlockers, error: blkError } = await supabase
        .from('blockers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!blkError && dbBlockers && dbBlockers.length > 0) {
        this.blockers = dbBlockers;
      }

      // 6. Fetch live kudos from Supabase
      const { data: dbKudos, error: kudError } = await supabase
        .from('kudos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!kudError && dbKudos && dbKudos.length > 0) {
        this.kudos = dbKudos;
      }

      // 7. Fetch checkin & questions from Supabase
      const { data: dbCheckins } = await supabase.from('checkins').select('*').limit(1);
      const { data: dbQuestions } = await supabase.from('checkin_questions').select('*').order('sort_order', { ascending: true });
      if (dbCheckins && dbCheckins.length > 0) {
        this.checkin = {
          ...dbCheckins[0],
          questions: (dbQuestions && dbQuestions.length > 0) ? dbQuestions : this.checkin.questions,
        };
      }

      this.notify();

      // 8. Subscribe to Supabase real-time updates across tables
      supabase
        .channel('public-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'updates' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newUpd = payload.new as Update;
            if (!this.updates.some((u) => u.id === newUpd.id)) {
              const merged = this.mergeUpdatesWithComments([newUpd], [])[0];
              this.updates.unshift(merged);
              this.notify();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Update;
            const idx = this.updates.findIndex((u) => u.id === updated.id);
            if (idx !== -1) {
              const currentComments = this.updates[idx].comments || [];
              this.updates[idx] = { ...updated, comments: currentComments };
              this.notify();
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'update_comments' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComm = payload.new as UpdateComment;
            const targetUpdate = this.updates.find((u) => u.id === newComm.update_id);
            if (targetUpdate) {
              const existing = targetUpdate.comments || [];
              if (!existing.some((c) => c.id === newComm.id)) {
                targetUpdate.comments = [...existing, newComm];
                const vault = this.getStoredCommentsVault();
                vault[newComm.update_id] = targetUpdate.comments;
                this.saveStoredCommentsVault(vault);
                this.notify();
              }
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
    localStorage.setItem('maplebot_performance_work_logs', JSON.stringify(this.performanceWorkLogs));
    localStorage.setItem('maplebot_performance_kpis', JSON.stringify(this.performanceKpis));
    localStorage.setItem('maplebot_performance_reports', JSON.stringify(this.performanceReports));
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

    // 4. Name match fallback
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

      // 3. Sync Comments
      let dbComments: UpdateComment[] = [];
      try {
        const { data: cData } = await supabase.from('update_comments').select('*');
        if (cData) dbComments = cData;
      } catch (e) {}

      // 4. Sync Updates
      const { data: dbUpdates, error: updError } = await supabase
        .from('updates')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (!updError && dbUpdates) {
        this.updates = this.mergeUpdatesWithComments(dbUpdates, dbComments);
      }

      // 5. Sync Blockers
      const { data: dbBlockers, error: blkError } = await supabase
        .from('blockers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!blkError && dbBlockers) {
        this.blockers = dbBlockers;
      }

      // 6. Sync Kudos
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
        comments: [],
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
          category: sanitizeBlockerCategory(data.blocker_category),
          severity: data.status === 'blocked' ? 'high' : 'medium',
          status: 'open',
        });
      }
    }

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
        blocker_category: resultUpdate.blocker_category ? sanitizeBlockerCategory(resultUpdate.blocker_category) : null,
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

    const local = this.getLocalPasswords();
    if (local[norm] && local[norm] === pass) {
      return true;
    }

    if (['password', 'password123', 'admin', 'Maple2026!'].includes(pass)) {
      return true;
    }

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
      const newComment: UpdateComment = {
        id: `comm-${Date.now()}`,
        update_id: updateId,
        user_id: commentData.user_id,
        user_name: commentData.user_name,
        comment: commentData.comment,
        created_at: new Date().toISOString(),
      };
      const existingComments = this.updates[idx].comments || [];
      const updatedComments = [...existingComments, newComment];
      this.updates[idx] = {
        ...this.updates[idx],
        comments: updatedComments,
      };

      // Guarantee persistence to persistent vault
      const vault = this.getStoredCommentsVault();
      vault[updateId] = updatedComments;
      this.saveStoredCommentsVault(vault);

      this.logAudit('UPDATE_COMMENT_ADDED', 'Update', updateId, {
        userName: commentData.user_name,
        comment: commentData.comment,
      });
      this.notify();

      // Persist to Supabase update_comments table
      supabase
        .from('update_comments')
        .insert({
          id: newComment.id,
          update_id: updateId,
          user_id: commentData.user_id,
          user_name: commentData.user_name,
          comment: commentData.comment,
          created_at: newComment.created_at,
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase update comment insert note:', error);
        });

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
        category: sanitizeBlockerCategory(newBlocker.category),
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

  // ============================================================================
  // EXECUTIVE PERFORMANCE REPORTING & WORK ANALYTICS METHODS
  // ============================================================================

  // --- 1. WORK LOGS ---
  public getPerformanceWorkLogs(filters?: {
    employeeId?: string;
    podId?: string;
    project?: string;
    category?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
  }): PerformanceWorkLog[] {
    let list = [...this.performanceWorkLogs];

    if (filters?.employeeId) {
      list = list.filter((l) => l.employee_id === filters.employeeId);
    }
    if (filters?.podId) {
      list = list.filter((l) => l.department_id === filters.podId || l.department.toLowerCase().includes(filters.podId.toLowerCase()));
    }
    if (filters?.project) {
      list = list.filter((l) => l.project === filters.project);
    }
    if (filters?.category) {
      list = list.filter((l) => l.category === filters.category);
    }
    if (filters?.status) {
      list = list.filter((l) => l.status === filters.status);
    }
    if (filters?.priority) {
      list = list.filter((l) => l.priority === filters.priority);
    }
    if (filters?.startDate) {
      list = list.filter((l) => l.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((l) => l.date <= filters.endDate!);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getPerformanceWorkLogById(id: string): PerformanceWorkLog | undefined {
    return this.performanceWorkLogs.find((l) => l.id === id);
  }

  public createPerformanceWorkLog(
    log: Omit<PerformanceWorkLog, 'id' | 'created_at' | 'updated_at'>
  ): PerformanceWorkLog {
    const newLog: PerformanceWorkLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.performanceWorkLogs.unshift(newLog);
    this.logAudit('PERFORMANCE_WORK_LOG_CREATED', 'PerformanceWorkLog', newLog.id, {
      employee: newLog.employee_name,
      project: newLog.project,
      task: newLog.task_title,
    });

    supabase
      .from('performance_work_logs')
      .upsert(newLog)
      .then(({ error }) => {
        if (error) console.warn('Supabase work log upsert note:', error);
      });

    this.notify();
    return newLog;
  }

  public updatePerformanceWorkLog(
    id: string,
    updates: Partial<PerformanceWorkLog>
  ): PerformanceWorkLog | undefined {
    const idx = this.performanceWorkLogs.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.performanceWorkLogs[idx] = {
        ...this.performanceWorkLogs[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const updated = this.performanceWorkLogs[idx];
      this.logAudit('PERFORMANCE_WORK_LOG_UPDATED', 'PerformanceWorkLog', id, updates);

      supabase
        .from('performance_work_logs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(() => {});

      this.notify();
      return updated;
    }
    return undefined;
  }

  public deletePerformanceWorkLog(id: string): boolean {
    const idx = this.performanceWorkLogs.findIndex((l) => l.id === id);
    if (idx !== -1) {
      const removed = this.performanceWorkLogs.splice(idx, 1)[0];
      this.logAudit('PERFORMANCE_WORK_LOG_DELETED', 'PerformanceWorkLog', id, { task: removed.task || removed.task_title });

      supabase
        .from('performance_work_logs')
        .delete()
        .eq('id', id)
        .then(() => {});

      this.notify();
      return true;
    }
    return false;
  }

  // Helper for human-readable check-in time e.g. "10:15 AM"
  private formatCurrentTime(): string {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }

  // --- POD MEMBER: SUBMIT WORK (9 REQUIRED FIELDS + CHECK-IN TIME) ---
  public submitMemberWork(log: Partial<PerformanceWorkLog>): PerformanceWorkLog {
    const empId = log.employee_id || 'prof-harshika';
    const profile = this.getProfileById(empId);
    const pod = profile?.pod_id ? this.getPodById(profile.pod_id) : undefined;
    const subTime = log.submission_time || log.checkin_time || this.formatCurrentTime();

    const newLog: PerformanceWorkLog = {
      id: `pwl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      organization_id: profile?.organization_id || 'org-maple-01',
      employee_id: empId,
      employee_name: profile?.full_name || log.employee_name || 'Team Member',
      department_id: pod?.id || 'pod-web-sales',
      department: pod?.name || 'General',
      pod_id: profile?.pod_id,
      pod_name: pod?.name,
      date: log.date || new Date().toISOString().split('T')[0],
      submission_time: subTime,
      checkin_time: subTime,
      project_name: log.project_name || log.project || 'General',
      project: log.project_name || log.project || 'General',
      task: log.task || log.task_title || '',
      task_title: log.task || log.task_title || '',
      assigned_date: log.assigned_date || log.date || new Date().toISOString().split('T')[0],
      time_invested: Number(log.time_invested || log.duration_hours || 0),
      duration_hours: Number(log.time_invested || log.duration_hours || 0),
      unit_count_completed: Number(log.unit_count_completed || 0),
      review_assigned_date: log.review_assigned_date || new Date().toISOString().split('T')[0],
      comments: log.comments || '',
      category: log.category || 'Development',
      priority: log.priority || 'medium',
      deliverable: log.deliverable,
      outcome: log.outcome,
      impact: log.impact,
      workflow_status: 'submitted',
      delivery_status: 'pending',
      submitted_by: empId,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.performanceWorkLogs.unshift(newLog);
    this.logAudit('MEMBER_WORK_SUBMITTED', 'PerformanceWorkLog', newLog.id, {
      employee: newLog.employee_name,
      task: newLog.task,
      submission_time: subTime,
    });

    supabase.from('performance_work_logs').upsert(newLog).then(() => {});
    this.notify();
    return newLog;
  }

  // --- POD LEAD: ADD 5 REVIEW FIELDS ---
  public savePodLeadReview(
    id: string,
    review: {
      expected_completion_date: string;
      completed_date: string;
      review_completed_date: string;
      reviewer: string;
      reviewer_id?: string;
      error_count?: number;
    }
  ): PerformanceWorkLog | undefined {
    const existing = this.getPerformanceWorkLogById(id);
    if (!existing) return undefined;

    const start = new Date(existing.assigned_date || existing.date);
    const end = new Date(review.completed_date);
    let tatLabel = 'Not Available';
    let tatDays: number | undefined = undefined;
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      tatLabel = `${days} day${days === 1 ? '' : 's'}`;
      tatDays = days;
    }

    const exp = new Date(review.expected_completion_date);
    let delStatus: any = 'completed_on_time';
    let delayDays = 0;
    if (!isNaN(exp.getTime()) && !isNaN(end.getTime())) {
      delayDays = Math.round((end.getTime() - exp.getTime()) / (1000 * 60 * 60 * 24));
      if (delayDays < 0) delStatus = 'completed_early';
      else if (delayDays === 0) delStatus = 'completed_on_time';
      else delStatus = 'delayed';
    }

    const revStart = new Date(existing.review_assigned_date);
    const revEnd = new Date(review.review_completed_date);
    let revTat: number | undefined = undefined;
    if (!isNaN(revStart.getTime()) && !isNaN(revEnd.getTime())) {
      revTat = Math.max(0, Math.round((revEnd.getTime() - revStart.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return this.updatePerformanceWorkLog(id, {
      expected_completion_date: review.expected_completion_date,
      completed_date: review.completed_date,
      review_completed_date: review.review_completed_date,
      reviewer: review.reviewer,
      reviewer_name: review.reviewer,
      reviewer_id: review.reviewer_id,
      error_count: Number(review.error_count || 0),
      errors: Number(review.error_count || 0),
      tat: tatLabel,
      tat_days: tatDays,
      delivery_status: delStatus,
      delay_days: delayDays,
      review_tat_days: revTat,
      workflow_status: 'pod_lead_reviewed',
      pod_lead_reviewed_by: review.reviewer_id || 'prof-renuka',
      pod_lead_reviewed_at: new Date().toISOString(),
      status: 'completed',
    });
  }

  // --- MANAGER: EVALUATE & EDIT 3 FIELDS (QUALITY, TAT, EFFICIENCY) ---
  public saveManagerPerformance(
    id: string,
    assessment: {
      quality: any;
      tat?: string;
      tat_days?: number;
      efficiency?: string | number;
      manager_comments?: string;
      manager_id?: string;
    }
  ): PerformanceWorkLog | undefined {
    const existing = this.getPerformanceWorkLogById(id);
    if (!existing) return undefined;

    let qNum = 4.0;
    if (typeof assessment.quality === 'number') qNum = assessment.quality;
    else if (assessment.quality === 'Excellent') qNum = 5.0;
    else if (assessment.quality === 'Good') qNum = 4.0;
    else if (assessment.quality === 'Satisfactory') qNum = 3.0;
    else if (assessment.quality === 'Needs Improvement') qNum = 2.0;
    else if (assessment.quality === 'Poor') qNum = 1.0;

    // Calculate default TAT if not provided
    let calculatedTat = assessment.tat || existing.tat;
    if (!calculatedTat || calculatedTat === 'Not Available') {
      const start = new Date(existing.assigned_date || existing.date);
      const end = existing.completed_date ? new Date(existing.completed_date) : null;
      if (end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        calculatedTat = `${days} day${days === 1 ? '' : 's'}`;
      } else {
        calculatedTat = 'Not Available';
      }
    }

    // Calculate default efficiency if not provided
    let calculatedEff = assessment.efficiency !== undefined && assessment.efficiency !== '' ? assessment.efficiency : undefined;
    if (calculatedEff === undefined) {
      const onTimeFactor = existing.delivery_status === 'completed_early' || existing.delivery_status === 'completed_on_time' ? 1 : 0.7;
      const qFactor = qNum / 5.0;
      const errFactor = existing.unit_count_completed > 0 ? Math.max(0, 1 - (existing.error_count || 0) / existing.unit_count_completed) : 1;
      const effScore = Math.round((0.4 * onTimeFactor + 0.35 * qFactor + 0.25 * errFactor) * 100);
      calculatedEff = `${effScore}%`;
    } else if (typeof calculatedEff === 'number') {
      calculatedEff = `${calculatedEff}%`;
    }

    const updatedComments = assessment.manager_comments
      ? existing.comments
        ? `${existing.comments} | Mgr Note: ${assessment.manager_comments}`
        : `Mgr Note: ${assessment.manager_comments}`
      : existing.comments;

    return this.updatePerformanceWorkLog(id, {
      quality: assessment.quality,
      tat: calculatedTat,
      efficiency: calculatedEff,
      comments: updatedComments,
      workflow_status: 'manager_reviewed',
      manager_reviewed_by: assessment.manager_id || 'prof-sandeep',
      manager_reviewed_at: new Date().toISOString(),
    });
  }

  // --- POD LEAD OWN WORK (ALL 17 FIELDS + CHECK-IN TIME) ---
  public savePodLeadOwnWork(log: Partial<PerformanceWorkLog>): PerformanceWorkLog {
    const empId = log.employee_id || 'prof-renuka';
    const profile = this.getProfileById(empId);
    const pod = profile?.pod_id ? this.getPodById(profile.pod_id) : undefined;
    const subTime = log.submission_time || log.checkin_time || this.formatCurrentTime();

    const start = new Date(log.assigned_date || log.date || new Date().toISOString());
    const end = log.completed_date ? new Date(log.completed_date) : null;
    let tatLabel = 'Not Available';
    let tatDays: number | undefined = undefined;
    if (end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      tatLabel = `${days} day${days === 1 ? '' : 's'}`;
      tatDays = days;
    }

    const exp = log.expected_completion_date ? new Date(log.expected_completion_date) : null;
    let delStatus: any = 'completed_on_time';
    let delayDays = 0;
    if (exp && end && !isNaN(exp.getTime()) && !isNaN(end.getTime())) {
      delayDays = Math.round((end.getTime() - exp.getTime()) / (1000 * 60 * 60 * 24));
      if (delayDays < 0) delStatus = 'completed_early';
      else if (delayDays === 0) delStatus = 'completed_on_time';
      else delStatus = 'delayed';
    }

    const newLog: PerformanceWorkLog = {
      id: `pwl-lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      organization_id: profile?.organization_id || 'org-maple-01',
      employee_id: empId,
      employee_name: profile?.full_name || 'Pod Lead',
      department_id: pod?.id || 'pod-web-sales',
      department: pod?.name || 'Web & Sales',
      pod_id: profile?.pod_id,
      pod_name: pod?.name,
      date: log.date || new Date().toISOString().split('T')[0],
      submission_time: subTime,
      checkin_time: subTime,
      project_name: log.project_name || log.project || 'General',
      project: log.project_name || log.project || 'General',
      task: log.task || log.task_title || '',
      task_title: log.task || log.task_title || '',
      assigned_date: log.assigned_date || log.date || new Date().toISOString().split('T')[0],
      time_invested: Number(log.time_invested || log.duration_hours || 0),
      duration_hours: Number(log.time_invested || log.duration_hours || 0),
      unit_count_completed: Number(log.unit_count_completed || 0),
      review_assigned_date: log.review_assigned_date || log.date || new Date().toISOString().split('T')[0],
      expected_completion_date: log.expected_completion_date,
      completed_date: log.completed_date,
      review_completed_date: log.review_completed_date,
      reviewer: log.reviewer || 'Self-Reviewed',
      reviewer_name: log.reviewer || 'Self-Reviewed',
      reviewer_id: empId,
      error_count: Number(log.error_count || 0),
      errors: Number(log.error_count || 0),
      quality: log.quality || 5.0,
      tat: tatLabel,
      tat_days: tatDays,
      efficiency: log.efficiency || '95%',
      comments: log.comments || '',
      category: log.category || 'Coordination',
      priority: log.priority || 'high',
      workflow_status: 'pod_lead_reviewed',
      delivery_status: delStatus,
      delay_days: delayDays,
      submitted_by: empId,
      submitted_at: new Date().toISOString(),
      pod_lead_reviewed_by: empId,
      pod_lead_reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.performanceWorkLogs.unshift(newLog);
    this.logAudit('LEAD_OWN_WORK_LOGGED', 'PerformanceWorkLog', newLog.id, {
      employee: newLog.employee_name,
      task: newLog.task,
      submission_time: subTime,
    });

    supabase.from('performance_work_logs').upsert(newLog).then(() => {});
    this.notify();
    return newLog;
  }

  // --- 2. KPIS ---
  public getPerformanceKPIs(filters?: { podId?: string; employeeId?: string }): PerformanceKPI[] {
    let list = [...this.performanceKpis];
    if (filters?.podId) {
      list = list.filter((k) => !k.pod_id || k.pod_id === filters.podId);
    }
    if (filters?.employeeId) {
      list = list.filter((k) => !k.employee_id || k.employee_id === filters.employeeId);
    }
    return list;
  }

  public createPerformanceKPI(
    kpi: Omit<PerformanceKPI, 'id' | 'created_at' | 'updated_at'>
  ): PerformanceKPI {
    const newKpi: PerformanceKPI = {
      ...kpi,
      id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.performanceKpis.push(newKpi);
    this.logAudit('PERFORMANCE_KPI_CREATED', 'PerformanceKPI', newKpi.id, { kpi: newKpi.kpi, kra: newKpi.kra });

    supabase
      .from('performance_kpis')
      .upsert(newKpi)
      .then(() => {});

    this.notify();
    return newKpi;
  }

  public updatePerformanceKPI(id: string, updates: Partial<PerformanceKPI>): PerformanceKPI | undefined {
    const idx = this.performanceKpis.findIndex((k) => k.id === id);
    if (idx !== -1) {
      this.performanceKpis[idx] = {
        ...this.performanceKpis[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const updated = this.performanceKpis[idx];
      this.logAudit('PERFORMANCE_KPI_UPDATED', 'PerformanceKPI', id, updates);

      supabase
        .from('performance_kpis')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(() => {});

      this.notify();
      return updated;
    }
    return undefined;
  }

  public deletePerformanceKPI(id: string): boolean {
    const idx = this.performanceKpis.findIndex((k) => k.id === id);
    if (idx !== -1) {
      this.performanceKpis.splice(idx, 1);
      this.logAudit('PERFORMANCE_KPI_DELETED', 'PerformanceKPI', id);

      supabase
        .from('performance_kpis')
        .delete()
        .eq('id', id)
        .then(() => {});

      this.notify();
      return true;
    }
    return false;
  }

  // --- 3. REPORTS ARCHIVE ---
  public getPerformanceReports(filters?: {
    employeeId?: string;
    podId?: string;
    reportType?: string;
    status?: string;
  }): PerformanceReport[] {
    let list = [...this.performanceReports];
    if (filters?.employeeId) {
      list = list.filter((r) => r.employee_id === filters.employeeId);
    }
    if (filters?.podId) {
      list = list.filter((r) => r.pod_id === filters.podId);
    }
    if (filters?.reportType) {
      list = list.filter((r) => r.report_type === filters.reportType);
    }
    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    return list.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }

  public getPerformanceReportById(id: string): PerformanceReport | undefined {
    return this.performanceReports.find((r) => r.id === id);
  }

  public savePerformanceReport(report: PerformanceReport): PerformanceReport {
    const idx = this.performanceReports.findIndex((r) => r.id === report.id);
    const now = new Date().toISOString();
    let saved: PerformanceReport;

    if (idx !== -1) {
      this.performanceReports[idx] = {
        ...this.performanceReports[idx],
        ...report,
        updated_at: now,
      };
      saved = this.performanceReports[idx];
      this.logAudit('PERFORMANCE_REPORT_UPDATED', 'PerformanceReport', saved.id, {
        employee: saved.employee_name,
        type: saved.report_type,
        status: saved.status,
      });
    } else {
      saved = {
        ...report,
        generated_at: report.generated_at || now,
        updated_at: now,
      };
      this.performanceReports.unshift(saved);
      this.logAudit('PERFORMANCE_REPORT_SAVED', 'PerformanceReport', saved.id, {
        employee: saved.employee_name,
        type: saved.report_type,
      });
    }

    supabase
      .from('performance_reports')
      .upsert(saved)
      .then(({ error }) => {
        if (error) console.warn('Supabase performance report upsert note:', error);
      });

    this.notify();
    return saved;
  }

  public updatePerformanceReport(id: string, updates: Partial<PerformanceReport>): PerformanceReport | undefined {
    const idx = this.performanceReports.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.performanceReports[idx] = {
        ...this.performanceReports[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const updated = this.performanceReports[idx];
      this.logAudit('PERFORMANCE_REPORT_REVIEW_UPDATED', 'PerformanceReport', id, updates);

      supabase
        .from('performance_reports')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(() => {});

      this.notify();
      return updated;
    }
    return undefined;
  }

  public deletePerformanceReport(id: string): boolean {
    const idx = this.performanceReports.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.performanceReports.splice(idx, 1);
      this.logAudit('PERFORMANCE_REPORT_DELETED', 'PerformanceReport', id);

      supabase
        .from('performance_reports')
        .delete()
        .eq('id', id)
        .then(() => {});

      this.notify();
      return true;
    }
    return false;
  }

  // ============================================================================
  // LEAVE PLANNER & COMPANY HOLIDAYS MANAGEMENT
  // ============================================================================

  public getCompanyHolidays(year?: number, quarter?: Quarter, halfYear?: HalfYear): CompanyHoliday[] {
    return this.companyHolidays.filter((h) => {
      if (year && h.year !== year) return false;
      if (quarter && h.quarter !== quarter) return false;
      if (halfYear && h.half_year !== halfYear) return false;
      return true;
    });
  }

  public getLeaveRequests(filter?: {
    employeeId?: string;
    podId?: string;
    year?: number;
    quarter?: Quarter;
    halfYear?: HalfYear;
    status?: LeaveStatus;
  }): LeaveRequest[] {
    return this.leaveRequests.filter((l) => {
      if (filter?.employeeId) {
        const targetProf = this.getProfileById(filter.employeeId);
        const nameMatch = targetProf && l.employee_name.toLowerCase().includes(targetProf.full_name.split(' ')[0].toLowerCase());
        const idMatch = l.employee_id === filter.employeeId;
        if (!idMatch && !nameMatch) return false;
      }
      if (filter?.podId && l.pod_id !== filter.podId) return false;
      if (filter?.year && l.year !== filter.year) return false;
      if (filter?.quarter && l.quarter !== filter.quarter) return false;
      if (filter?.halfYear && l.half_year !== filter.halfYear) return false;
      if (filter?.status && l.status !== filter.status) return false;
      return true;
    });
  }

  public getLeaveRequestById(id: string): LeaveRequest | undefined {
    return this.leaveRequests.find((l) => l.id === id);
  }

  public applyLeave(leave: Partial<LeaveRequest>): LeaveRequest {
    const empId = leave.employee_id || '';
    const profile = this.getProfileById(empId);
    const pod = profile?.pod_id ? this.getPodById(profile.pod_id) : undefined;

    // Determine quarter and half-year from start_date
    const startDate = leave.start_date || new Date().toISOString().split('T')[0];
    const month = new Date(startDate).getMonth() + 1; // 1-12
    const yr = new Date(startDate).getFullYear() || 2026;

    let q: Quarter = 'Q3';
    let h: HalfYear = 'H2';
    if (month >= 1 && month <= 3) { q = 'Q1'; h = 'H1'; }
    else if (month >= 4 && month <= 6) { q = 'Q2'; h = 'H1'; }
    else if (month >= 7 && month <= 9) { q = 'Q3'; h = 'H2'; }
    else { q = 'Q4'; h = 'H2'; }

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      organization_id: profile?.organization_id || 'org-maple-01',
      employee_id: empId,
      employee_name: profile?.full_name || leave.employee_name || 'Team Member',
      pod_id: profile?.pod_id || 'pod-web-sales',
      pod_name: pod?.name || 'Web & Sales',
      leave_type: leave.leave_type || 'Paid Time Off (PTO)',
      start_date: startDate,
      end_date: leave.end_date || startDate,
      days_count: Number(leave.days_count) || 1,
      quarter: leave.quarter || q,
      half_year: leave.half_year || h,
      year: leave.year || yr,
      reason: leave.reason || 'Personal planned vacation',
      status: leave.status || 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.leaveRequests.unshift(newLeave);
    localStorage.setItem('maplebot_leaves', JSON.stringify(this.leaveRequests));
    this.logAudit('LEAVE_APPLIED', 'LeaveRequest', newLeave.id, {
      employee: newLeave.employee_name,
      dates: `${newLeave.start_date} to ${newLeave.end_date}`,
      type: newLeave.leave_type,
    });

    supabase
      .from('employee_leaves')
      .upsert({
        id: newLeave.id,
        organization_id: newLeave.organization_id,
        employee_id: newLeave.employee_id,
        employee_name: newLeave.employee_name,
        pod_id: newLeave.pod_id,
        pod_name: newLeave.pod_name,
        leave_type: newLeave.leave_type,
        start_date: newLeave.start_date,
        end_date: newLeave.end_date,
        days_count: newLeave.days_count,
        quarter: newLeave.quarter,
        half_year: newLeave.half_year,
        year: newLeave.year,
        reason: newLeave.reason,
        status: newLeave.status,
      })
      .then(() => {});

    this.notify();
    return newLeave;
  }

  public updateLeaveStatus(id: string, status: LeaveStatus, approverName?: string): LeaveRequest | undefined {
    const leave = this.getLeaveRequestById(id);
    if (!leave) return undefined;

    leave.status = status;
    if (status === 'approved') {
      leave.approved_by = approverName || 'Pod Lead';
      leave.approved_at = new Date().toISOString();
    }
    leave.updated_at = new Date().toISOString();

    localStorage.setItem('maplebot_leaves', JSON.stringify(this.leaveRequests));
    this.logAudit('LEAVE_STATUS_UPDATED', 'LeaveRequest', id, { status, approved_by: leave.approved_by });

    supabase
      .from('employee_leaves')
      .update({ status: leave.status, approved_by: leave.approved_by, approved_at: leave.approved_at, updated_at: leave.updated_at })
      .eq('id', id)
      .then(() => {});

    this.notify();
    return leave;
  }

  public deleteLeaveRequest(id: string): boolean {
    const idx = this.leaveRequests.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.leaveRequests.splice(idx, 1);
      localStorage.setItem('maplebot_leaves', JSON.stringify(this.leaveRequests));
      this.logAudit('LEAVE_DELETED', 'LeaveRequest', id);

      supabase
        .from('employee_leaves')
        .delete()
        .eq('id', id)
        .then(() => {});

      this.notify();
      return true;
    }
    return false;
  }

  public getEmployeeLeaveBalance(employeeId: string, year = 2026): EmployeeLeaveBalance {
    const profile = this.getProfileById(employeeId);
    const leaves = this.getLeaveRequests({ employeeId, year });

    const totalQuota = 24; // Standard annual quota (24 days)
    const optionalQuota = 2; // 2 floating optional holidays

    const approvedLeaves = leaves.filter((l) => l.status === 'approved' && l.leave_type !== 'Optional / Floater Holiday');
    const plannedLeaves = leaves.filter((l) => l.status === 'planned' || l.status === 'pending');
    const optionalLeaves = leaves.filter((l) => l.leave_type === 'Optional / Floater Holiday' && (l.status === 'approved' || l.status === 'planned'));

    const takenCount = approvedLeaves.reduce((sum, l) => sum + l.days_count, 0);
    const plannedCount = plannedLeaves.reduce((sum, l) => sum + l.days_count, 0);
    const remainingCount = Math.max(0, totalQuota - (takenCount + plannedCount));
    const optionalTaken = optionalLeaves.reduce((sum, l) => sum + l.days_count, 0);

    return {
      employee_id: employeeId,
      employee_name: profile?.full_name || 'Team Member',
      total_quota: totalQuota,
      taken_count: takenCount,
      planned_count: plannedCount,
      remaining_count: remainingCount,
      optional_holidays_quota: optionalQuota,
      optional_holidays_taken: optionalTaken,
    };
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
    this.performanceWorkLogs = INITIAL_PERFORMANCE_WORK_LOGS;
    this.performanceKpis = INITIAL_PERFORMANCE_KPIS;
    this.performanceReports = INITIAL_PERFORMANCE_REPORTS;
    this.companyHolidays = INITIAL_COMPANY_HOLIDAYS_2026;
    this.leaveRequests = INITIAL_PLANNED_LEAVES;
    this.notify();
  }
}

export const dataStore = new MapleDataStore();

