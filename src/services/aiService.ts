import { dataStore } from './dataStore';
import { AIResponsePayload, Profile, Update, Blocker } from '../types/database';

export const aiService = {
  async askMapleAI(
    query: string,
    currentProfile: Profile
  ): Promise<AIResponsePayload> {
    const isManager = currentProfile?.role === 'manager';
    const isMember = currentProfile?.role === 'member';
    const authorizedPodId = (isManager || isMember) ? currentProfile?.pod_id : undefined;

    // Small delay for natural feel
    await new Promise((res) => setTimeout(res, 400));

    let updates = dataStore.getUpdates();
    let blockers = dataStore.getBlockers();
    let allProfiles = dataStore.getProfiles();
    let pods = dataStore.getPods();
    let allKudos = dataStore.getKudos();

    if (authorizedPodId) {
      updates = updates.filter((u) => u.pod_id === authorizedPodId);
      blockers = blockers.filter((b) => b.pod_id === authorizedPodId);
      allProfiles = allProfiles.filter((p) => p.pod_id === authorizedPodId);
    }

    const lowerQ = query.toLowerCase().trim();
    const today = new Date().toISOString().split('T')[0];
    const todayUpdates = updates.filter((u) => u.update_date === today);
    const activeBlockers = blockers.filter((b) => b.status === 'open' || b.status === 'in_progress');

    // 1. Detect if a specific person is mentioned
    const mentionedMember = allProfiles.find((p) => {
      const nameParts = p.full_name.toLowerCase().split(' ');
      return nameParts.some((part) => part.length > 2 && lowerQ.includes(part));
    });

    // 2. Detect if a specific pod is mentioned
    const mentionedPod = pods.find((p) => {
      const pName = p.name.toLowerCase();
      if (lowerQ.includes('web') || lowerQ.includes('sales')) return p.id === 'pod-web-sales';
      if (lowerQ.includes('marketing') || lowerQ.includes('mkt')) return p.id === 'pod-marketing';
      if (lowerQ.includes('elearning') || lowerQ.includes('course') || lowerQ.includes('lms')) return p.id === 'pod-elearning';
      if (lowerQ.includes('hr') || lowerQ.includes('people') || lowerQ.includes('hiring')) return p.id === 'pod-hr';
      return lowerQ.includes(pName);
    });

    let summaryTitle = 'MapleBot Live Intelligence Response';
    const insights: AIResponsePayload['insights'] = [];
    const followUps: string[] = [];
    let intent = 'DYNAMIC_QUERY';

    // SCENARIO A: Member-Specific Query
    if (mentionedMember) {
      intent = 'PERSON_SUMMARY';
      summaryTitle = `Status & Deliverables for ${mentionedMember.full_name}`;
      const memberUpdates = updates.filter((u) => u.profile_id === mentionedMember.id);
      const latestUpdate = memberUpdates[0];
      const memberBlockers = blockers.filter((b) => b.reported_by === mentionedMember.id && b.status === 'open');

      if (latestUpdate) {
        insights.push({
          category: `Today's Focus (${new Date(latestUpdate.update_date).toLocaleDateString()})`,
          type: 'info',
          points: [
            latestUpdate.today || 'No focus deliverables specified.',
            `Progress: ${latestUpdate.progress_percent}% • Status: ${latestUpdate.status.toUpperCase().replace('_', ' ')}`
          ],
        });

        if (latestUpdate.yesterday) {
          insights.push({
            category: 'Completed Yesterday',
            type: 'success',
            points: [latestUpdate.yesterday],
          });
        }

        if (latestUpdate.has_blocker && latestUpdate.blocker) {
          insights.push({
            category: 'Active Blocker Reported',
            type: 'warning',
            points: [
              `Impediment: ${latestUpdate.blocker}`,
              `Category: ${latestUpdate.blocker_category || 'General'}`,
              `Support Required: ${latestUpdate.support_needed || 'None specified'}`
            ],
          });
          followUps.push(`Check in with ${mentionedMember.full_name} regarding "${latestUpdate.blocker}".`);
        }
      } else {
        insights.push({
          category: 'Standup Submission Status',
          type: 'warning',
          points: [`${mentionedMember.full_name} has not submitted a standup update for today yet.`],
        });
        followUps.push(`Send a Google Chat standup reminder to ${mentionedMember.full_name}.`);
      }

      if (memberBlockers.length > 0) {
        insights.push({
          category: 'Open Blockers in Queue',
          type: 'warning',
          points: memberBlockers.map((b) => `${b.title} [${b.severity.toUpperCase()}]`),
        });
      }
    }
    // SCENARIO B: Pod-Specific Query
    else if (mentionedPod) {
      intent = 'POD_SUMMARY';
      summaryTitle = `${mentionedPod.name} Pod Health & Standup Status`;
      const podMembers = allProfiles.filter((p) => p.pod_id === mentionedPod.id);
      const podUpdatesToday = todayUpdates.filter((u) => u.pod_id === mentionedPod.id);
      const podBlockers = activeBlockers.filter((b) => b.pod_id === mentionedPod.id);

      insights.push({
        category: 'Participation & Submissions',
        type: podUpdatesToday.length === podMembers.length ? 'success' : 'info',
        points: [
          `${podUpdatesToday.length} of ${podMembers.length} members submitted today (${podMembers.length > 0 ? Math.round((podUpdatesToday.length / podMembers.length) * 100) : 0}% completion).`,
          `Pod Lead: ${mentionedPod.manager?.full_name || 'Assigned Lead'}`
        ],
      });

      if (podUpdatesToday.length > 0) {
        insights.push({
          category: 'Live Deliverables in Progress',
          type: 'info',
          points: podUpdatesToday.map((u) => `${u.profile?.full_name}: ${u.today}`),
        });
      }

      if (podBlockers.length > 0) {
        insights.push({
          category: 'Pod Impediments',
          type: 'warning',
          points: podBlockers.map((b) => `${b.title} (${b.severity.toUpperCase()}) — Reported by ${b.reporter?.full_name}`),
        });
        followUps.push(`Unblock ${podBlockers[0].reporter?.full_name} on "${podBlockers[0].title}".`);
      } else {
        insights.push({
          category: 'Blockers',
          type: 'success',
          points: ['Zero active blockers in this pod.'],
        });
      }
    }
    // SCENARIO C: Blockers & Risk Query
    else if (lowerQ.includes('blocker') || lowerQ.includes('stuck') || lowerQ.includes('risk') || lowerQ.includes('delay')) {
      intent = 'BLOCKER_SUMMARY';
      summaryTitle = 'Active Blockers & Technical Risks Analysis';

      if (activeBlockers.length > 0) {
        insights.push({
          category: 'Active Impediments in System',
          type: 'warning',
          points: activeBlockers.map(
            (b) => `${b.title} [${b.severity.toUpperCase()}] — ${b.reporter?.full_name || 'Member'} (${b.pod?.name || 'Pod'})`
          ),
        });
        activeBlockers.forEach((b) => {
          followUps.push(`Resolve blocker "${b.title}" assigned to ${b.assignee?.full_name || 'Lead'}.`);
        });
      } else {
        insights.push({
          category: 'Blocker Velocity',
          type: 'success',
          points: ['No open blockers in the database. All pods are unblocked.'],
        });
        followUps.push('Keep sprint tempo steady across pods.');
      }
    }
    // SCENARIO D: Kudos & Culture Query
    else if (lowerQ.includes('kudos') || lowerQ.includes('recognition') || lowerQ.includes('top')) {
      intent = 'KUDOS_SUMMARY';
      summaryTitle = 'Peer Recognition & Kudos Activity';

      if (allKudos.length > 0) {
        insights.push({
          category: 'Recent Celebrations',
          type: 'success',
          points: allKudos.slice(0, 5).map((k) => `${k.sender?.full_name || 'Teammate'} recognized ${k.recipient?.full_name || 'Colleague'} for ${k.category}: "${k.message}"`),
        });
      } else {
        insights.push({
          category: 'Recognition Pulse',
          type: 'info',
          points: ['No kudos awarded yet this cycle. Encourage teammates to give kudos for great collaboration!'],
        });
      }
    }
    // SCENARIO E: General Organization Summary / Custom Query
    else {
      summaryTitle = 'MapleBot Real-Time Team Operational Summary';
      const submittedCount = todayUpdates.length;
      const totalMembers = allProfiles.filter((p) => p.status === 'active' && p.role === 'member').length;
      const rate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

      insights.push({
        category: 'Daily Standup Participation',
        type: rate >= 80 ? 'success' : 'info',
        points: [
          `Total Submissions Today: ${submittedCount} / ${totalMembers} expected (${rate}% participation rate).`,
          `Active Pods Monitored: ${pods.map((p) => p.name).join(', ')}.`
        ],
      });

      if (todayUpdates.length > 0) {
        insights.push({
          category: "Today's Work Underway",
          type: 'info',
          points: todayUpdates.map((u) => `${u.profile?.full_name} (${u.pod?.name || 'Pod'}): ${u.today}`),
        });
      } else {
        insights.push({
          category: 'Live Submissions',
          type: 'warning',
          points: ['No standup submissions logged yet for today. Submissions will appear here in real time.'],
        });
      }

      if (activeBlockers.length > 0) {
        insights.push({
          category: 'Active Blockers',
          type: 'warning',
          points: activeBlockers.map((b) => `${b.title} (${b.reporter?.full_name})`),
        });
        followUps.push(`Review open blocker from ${activeBlockers[0].reporter?.full_name}.`);
      } else {
        insights.push({
          category: 'Blockers',
          type: 'success',
          points: ['Zero active blockers reported across pods.'],
        });
      }
    }

    const flaggedSignals = this.detectSubtleBlockers(updates);

    return {
      intent,
      question: query,
      timestamp: new Date().toISOString(),
      summaryTitle,
      metrics: {
        totalAnalyzed: updates.length,
        activeBlockersCount: activeBlockers.length,
        onTrackCount: todayUpdates.filter((u) => u.status === 'on_track').length,
        atRiskCount: todayUpdates.filter((u) => u.status === 'at_risk').length,
      },
      insights,
      recommendedFollowUps: followUps.length > 0 ? followUps : ['Team operations healthy.'],
      flaggedBlockerSignals: flaggedSignals,
    };
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
