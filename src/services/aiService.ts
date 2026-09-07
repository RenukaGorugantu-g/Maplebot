import { dataStore } from './dataStore';
import { AIResponsePayload, Profile, Update, Blocker } from '../types/database';

export const aiService = {
  async askMapleAI(
    query: string,
    currentProfile: Profile
  ): Promise<AIResponsePayload> {
    const isManager = currentProfile?.role === 'manager';
    const isMember = currentProfile?.role === 'member';
    const isAdmin = currentProfile?.role === 'admin';
    const authorizedPodId = isManager ? currentProfile?.pod_id : undefined;

    // Small latency for natural conversational feel
    await new Promise((res) => setTimeout(res, 300));

    // 1. REJECT ACCESS FOR NORMAL MEMBERS
    if (isMember) {
      return {
        intent: 'UNAUTHORIZED',
        question: query,
        timestamp: new Date().toISOString(),
        summaryTitle: 'Maple AI Access Restricted',
        answerText: 'Maple AI Ask is reserved exclusively for Pod Leads and Organization Administrators. Team members can view their submissions and team updates directly in My Check-in and Team Updates.',
        metrics: {
          totalAnalyzed: 0,
          activeBlockersCount: 0,
          onTrackCount: 0,
          atRiskCount: 0,
        },
        insights: [
          {
            category: 'Permission Notice',
            type: 'warning',
            points: ['Ask Maple AI is only accessible by Pod Leads and Organization Admins.'],
          },
        ],
        recommendedFollowUps: ['Return to Home Dashboard.'],
        flaggedBlockerSignals: [],
      };
    }

    let updates = dataStore.getUpdates();
    let blockers = dataStore.getBlockers();
    let allProfiles = dataStore.getProfiles();
    let pods = dataStore.getPods();
    let allKudos = dataStore.getKudos();

    // 2. STRICT POD ISOLATION FOR POD LEADS
    if (isManager && authorizedPodId) {
      updates = updates.filter(
        (u) => u.pod_id === authorizedPodId || (u.profile?.pod_ids && u.profile.pod_ids.includes(authorizedPodId))
      );
      blockers = blockers.filter(
        (b) => b.pod_id === authorizedPodId || (b.reporter?.pod_ids && b.reporter.pod_ids.includes(authorizedPodId))
      );
      allProfiles = allProfiles.filter(
        (p) => p.pod_id === authorizedPodId || (p.pod_ids && p.pod_ids.includes(authorizedPodId))
      );
      allKudos = allKudos.filter((k) => k.pod_id === authorizedPodId);
    }

    const lowerQ = query.toLowerCase().trim();
    const today = new Date().toISOString().split('T')[0];
    const todayUpdates = updates.filter((u) => u.update_date === today);
    const activeBlockers = blockers.filter((b) => b.status === 'open' || b.status === 'in_progress');
    const myPod = isManager ? pods.find((p) => p.id === authorizedPodId) : undefined;
    const podName = myPod?.name || 'Maple Learning Solutions';

    // 3. CROSS-POD SECURITY GUARD
    if (isManager && authorizedPodId) {
      const isAskingOtherPod =
        (lowerQ.includes('elearning') && authorizedPodId !== 'pod-elearning') ||
        (lowerQ.includes('marketing') && authorizedPodId !== 'pod-marketing') ||
        (lowerQ.includes('hr') && authorizedPodId !== 'pod-hr') ||
        ((lowerQ.includes('web') || lowerQ.includes('sales')) && authorizedPodId !== 'pod-web-sales');

      if (isAskingOtherPod) {
        return {
          intent: 'CROSS_POD_RESTRICTED',
          question: query,
          timestamp: new Date().toISOString(),
          summaryTitle: `Cross-Pod Access Restricted`,
          answerText: `As the **${podName} Pod Lead**, your intelligence scope is strictly locked to **${podName}**. Updates, deliverables, and blockers from other pods are isolated and accessible only to Organization Administrators.`,
          metrics: {
            totalAnalyzed: updates.length,
            activeBlockersCount: activeBlockers.length,
            onTrackCount: todayUpdates.filter((u) => u.status === 'on_track').length,
            atRiskCount: todayUpdates.filter((u) => u.status === 'at_risk').length,
          },
          insights: [
            {
              category: 'Pod Isolation Policy',
              type: 'warning',
              points: [`Data from other pods is restricted. You have full access to all updates within ${podName}.`],
            },
          ],
          recommendedFollowUps: [`Ask about ${podName} standups, team deliverables, or blockers.`],
          flaggedBlockerSignals: [],
        };
      }
    }

    // 4. DETECT SPECIFIC TEAM MEMBER
    const mentionedMember = allProfiles.find((p) => {
      const nameParts = p.full_name.toLowerCase().split(' ');
      return nameParts.some((part) => part.length > 2 && lowerQ.includes(part));
    });

    // 5. DETECT POD (FOR ADMINS)
    const mentionedPod = pods.find((p) => {
      const pName = p.name.toLowerCase();
      if (lowerQ.includes('web') || lowerQ.includes('sales')) return p.id === 'pod-web-sales';
      if (lowerQ.includes('marketing') || lowerQ.includes('mkt')) return p.id === 'pod-marketing';
      if (lowerQ.includes('elearning') || lowerQ.includes('course') || lowerQ.includes('lms')) return p.id === 'pod-elearning';
      if (lowerQ.includes('hr') || lowerQ.includes('people') || lowerQ.includes('hiring')) return p.id === 'pod-hr';
      return lowerQ.includes(pName);
    });

    let summaryTitle = 'MapleBot Standup Intelligence';
    let answerText = '';
    const insights: AIResponsePayload['insights'] = [];
    const followUps: string[] = [];
    let intent = 'DYNAMIC_QUERY';

    // 1. GATHER STRUCTURED WORK LOGS (17 COLUMNS)
    let workLogs = dataStore.getPerformanceWorkLogs(
      isManager && authorizedPodId ? { podId: authorizedPodId } : undefined
    );

    // SCENARIO A: Member-Specific Query
    if (mentionedMember) {
      intent = 'PERSON_SUMMARY';
      summaryTitle = `${mentionedMember.full_name} — Performance & Check-in Briefing`;
      const memberUpdates = updates.filter((u) => u.profile_id === mentionedMember.id);
      const latestUpdate = memberUpdates[0];
      const memberBlockers = blockers.filter((b) => b.reported_by === mentionedMember.id && b.status === 'open');
      const memberLogs = workLogs.filter((l) => l.employee_id === mentionedMember.id);
      const totalMemberHours = Math.round(memberLogs.reduce((sum, l) => sum + (Number(l.time_invested) || Number(l.duration_hours) || 0), 0) * 10) / 10;
      const totalMemberUnits = memberLogs.reduce((sum, l) => sum + (Number(l.unit_count_completed) || 1), 0);
      const latestLog = memberLogs[0];

      let workLogSnippet = '';
      if (memberLogs.length > 0) {
        const taskItems = memberLogs.slice(0, 4).map((l, idx) => {
          const checkin = l.submission_time || l.checkin_time || '10:00 AM';
          const qStr = l.quality ? ` ⭐ Quality: ${l.quality}/5` : '';
          const effStr = l.efficiency ? ` ⚡ Eff: ${l.efficiency}` : '';
          return `   ${idx + 1}. **[${l.project_name || l.project}]** ${l.task || l.task_title} — **${l.time_invested || l.duration_hours}h** (${l.unit_count_completed || 1} units) • *Check-in: ${checkin}*${qStr}${effStr}`;
        }).join('\n');

        workLogSnippet = `\n\n### 💼 Structured Work Deliverables (${totalMemberHours}h Logged • ${totalMemberUnits} Units Delivered Across ${memberLogs.length} Tasks):\n${taskItems}`;
      }

      if (latestUpdate || memberLogs.length > 0) {
        const blockerStr = latestUpdate?.has_blocker && latestUpdate?.blocker
          ? `🔴 **Active Blocker:** ${latestUpdate.blocker} *(Support Needed: ${latestUpdate.support_needed || 'None specified'})*`
          : '🟢 **No Blockers:** Work is progressing smoothly.';

        const checkinTimeToday = latestLog?.submission_time || latestLog?.checkin_time || 'Recorded';

        answerText = `### 👤 ${mentionedMember.full_name} (${mentionedMember.role.toUpperCase()} • ${podName})
- **Daily Check-in Time:** ${checkinTimeToday}
- **Status:** ${(latestUpdate?.status || 'on_track').toUpperCase().replace('_', ' ')} (${latestUpdate?.progress_percent || 100}% Progress)
- **Total Hours Logged:** ${totalMemberHours} hrs
- **Total Units Completed:** ${totalMemberUnits} items
- ${blockerStr}${workLogSnippet}`;

        if (latestUpdate?.today) {
          insights.push({
            category: "Today's Deliverables",
            type: 'info',
            points: [latestUpdate.today],
          });
        }

        if (memberLogs.length > 0) {
          insights.push({
            category: 'Work Performance Ledger',
            type: 'info',
            points: [
              `Total ${totalMemberHours} hours logged across ${memberLogs.length} task deliverables.`,
              `Latest Check-in: ${checkinTimeToday}`,
            ],
          });
        }

        if (latestUpdate?.has_blocker && latestUpdate?.blocker) {
          insights.push({
            category: 'Blocker Reported',
            type: 'warning',
            points: [`${latestUpdate.blocker} (${latestUpdate.blocker_category || 'General'})`],
          });
          followUps.push(`Unblock ${mentionedMember.full_name} regarding "${latestUpdate.blocker}".`);
        }
      } else {
        answerText = `**${mentionedMember.full_name}** has not submitted a standup check-in or work deliverables for today yet.`;
        insights.push({
          category: 'Pending Submission',
          type: 'warning',
          points: [`${mentionedMember.full_name} is yet to submit their daily update.`],
        });
        followUps.push(`Ping standup reminder to ${mentionedMember.full_name}.`);
      }

      if (memberBlockers.length > 0) {
        insights.push({
          category: 'Open Blocker Tickets',
          type: 'warning',
          points: memberBlockers.map((b) => `${b.title} [${b.severity.toUpperCase()}]`),
        });
      }
    }
    // SCENARIO B: Who has NOT submitted / Pending updates
    else if (lowerQ.includes('not submit') || lowerQ.includes('pending') || lowerQ.includes('who has not') || lowerQ.includes('who didn') || lowerQ.includes('missing')) {
      intent = 'PENDING_SUBMISSIONS';
      summaryTitle = `Pending Check-in Submissions — ${podName}`;
      const submittedIds = new Set(todayUpdates.map((u) => u.profile_id));
      const pendingMembers = allProfiles.filter((p) => p.status === 'active' && !submittedIds.has(p.id));

      if (pendingMembers.length === 0) {
        answerText = `🎉 **100% Submission Rate!** All ${allProfiles.length} active members in **${podName}** have completed their standup check-in today.`;
        insights.push({
          category: 'Standup Completion',
          type: 'success',
          points: ['All members submitted on time.'],
        });
        followUps.push('Review team priorities in Team Updates feed.');
      } else {
        answerText = `### ⏳ Pending Standups (${pendingMembers.length} of ${allProfiles.length} Members)
The following team members in **${podName}** have not submitted their standup check-in for today yet:
${pendingMembers.map((m) => `- **${m.full_name}** (${m.email})`).join('\n')}`;

        insights.push({
          category: 'Pending Team Members',
          type: 'warning',
          points: pendingMembers.map((m) => `${m.full_name} (${m.role})`),
        });
        followUps.push('Send automated standup reminders via Google Chat.');
      }
    }
    // SCENARIO C: Blockers & Risk Analysis
    else if (lowerQ.includes('blocker') || lowerQ.includes('stuck') || lowerQ.includes('risk') || lowerQ.includes('impediment')) {
      intent = 'BLOCKER_SUMMARY';
      summaryTitle = `Active Impediments & Blockers Analysis — ${podName}`;

      if (activeBlockers.length > 0) {
        answerText = `### 🚨 Active Blockers (${activeBlockers.length} Open)
${activeBlockers.map((b, idx) => `${idx + 1}. **${b.title}** [${b.severity.toUpperCase()}]\n   - *Reported by:* ${b.reporter?.full_name || 'Member'}\n   - *Details:* ${b.description || 'No additional details'}`).join('\n\n')}`;

        insights.push({
          category: 'Critical Impediments',
          type: 'warning',
          points: activeBlockers.map((b) => `${b.title} (${b.severity.toUpperCase()}) — ${b.reporter?.full_name}`),
        });
        activeBlockers.forEach((b) => {
          followUps.push(`Resolve blocker "${b.title}" with ${b.reporter?.full_name}.`);
        });
      } else {
        answerText = `🟢 **All Clear!** There are currently **0 active blockers** in **${podName}**. All workflows and deliverables are proceeding smoothly.`;
        insights.push({
          category: 'Zero Blockers',
          type: 'success',
          points: ['No open blockers or impediments in the system.'],
        });
        followUps.push('Sprint tempo is optimal.');
      }
    }
    // SCENARIO D: Work Performance Ledger & Deliverables Analysis
    else if (
      lowerQ.includes('performance') ||
      lowerQ.includes('hours') ||
      lowerQ.includes('checkin') ||
      lowerQ.includes('check-in') ||
      lowerQ.includes('deliverable') ||
      lowerQ.includes('units') ||
      lowerQ.includes('work log') ||
      lowerQ.includes('quality') ||
      lowerQ.includes('tat') ||
      lowerQ.includes('efficiency') ||
      lowerQ.includes('review')
    ) {
      intent = 'PERFORMANCE_SUMMARY';
      summaryTitle = `Work Performance & Deliverables Ledger — ${podName}`;
      const totalHours = Math.round(workLogs.reduce((sum, l) => sum + (Number(l.time_invested) || Number(l.duration_hours) || 0), 0) * 10) / 10;
      const totalUnits = workLogs.reduce((sum, l) => sum + (Number(l.unit_count_completed) || 1), 0);
      const reviewedCount = workLogs.filter((l) => l.workflow_status === 'pod_lead_reviewed' || l.workflow_status === 'manager_reviewed').length;

      if (workLogs.length > 0) {
        const topProjects: Record<string, { hours: number; units: number; count: number }> = {};
        workLogs.forEach((l) => {
          const pName = l.project_name || l.project || 'General';
          if (!topProjects[pName]) topProjects[pName] = { hours: 0, units: 0, count: 0 };
          topProjects[pName].hours += Number(l.time_invested) || Number(l.duration_hours) || 0;
          topProjects[pName].units += Number(l.unit_count_completed) || 1;
          topProjects[pName].count += 1;
        });

        const projectLines = Object.entries(topProjects)
          .map(([pName, st]) => `• **${pName}:** ${Math.round(st.hours * 10) / 10}h invested across ${st.count} tasks (${st.units} units completed)`)
          .join('\n');

        const sampleTasks = workLogs.slice(0, 5).map((l, idx) => {
          const checkin = l.submission_time || l.checkin_time || '10:00 AM';
          const qStr = l.quality ? ` ⭐ Quality: ${l.quality}/5` : '';
          const effStr = l.efficiency ? ` ⚡ ${l.efficiency}` : '';
          return `${idx + 1}. **${l.employee_name}** — [${l.project_name || l.project}] ${l.task || l.task_title} (${l.time_invested || l.duration_hours}h) • *Check-in: ${checkin}*${qStr}${effStr}`;
        }).join('\n');

        answerText = `### 📊 Work Performance Ledger Summary (${podName})
- **Total Deliverables Logged:** ${workLogs.length} tasks
- **Total Hours Invested:** **${totalHours} hrs**
- **Total Units Completed:** **${totalUnits} items**
- **Reviews Completed:** ${reviewedCount} of ${workLogs.length} (${workLogs.length > 0 ? Math.round((reviewedCount / workLogs.length) * 100) : 0}%)

#### 📂 Project Breakdown:
${projectLines}

#### 📋 Recent Task Entries & Check-in Times:
${sampleTasks}`;

        insights.push({
          category: 'Work Performance Overview',
          type: 'info',
          points: [
            `${totalHours} total hours invested across ${workLogs.length} deliverables.`,
            `${totalUnits} total finished units tracked.`,
          ],
        });

        insights.push({
          category: 'Review Status',
          type: reviewedCount === workLogs.length ? 'success' : 'warning',
          points: [`${reviewedCount} of ${workLogs.length} tasks have been reviewed by Pod Lead/Manager.`],
        });

        followUps.push('Export full 17-column ledger to Excel in Work Performance Table.');
      } else {
        answerText = `No structured work performance logs have been recorded for **${podName}** yet.`;
        insights.push({
          category: 'No Work Logs',
          type: 'info',
          points: ['Work tasks will appear here as members submit their daily deliverables.'],
        });
      }
    }
    // SCENARIO E: Pod Summary / General Standup Overview
    else {
      intent = 'STANDUP_SUMMARY';
      summaryTitle = `Standup Briefing — ${podName}`;
      const totalMembers = allProfiles.filter((p) => p.status === 'active').length;
      const submittedCount = todayUpdates.length;
      const rate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

      if (todayUpdates.length === 0) {
        answerText = `### 📋 Daily Standup Summary (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
**Scope:** ${podName} | **Participation:** 0 / ${totalMembers} Submitted (0%)

*No standup updates have been submitted yet today.* As team members complete their check-ins, their deliverables, progress, and blockers will be synthesized here in real time.`;

        insights.push({
          category: 'Standup Status',
          type: 'warning',
          points: ['No submissions logged yet today. Submissions will appear in real time.'],
        });
        followUps.push('Ping morning standup reminder to team members.');
      } else {
        const updateBlocks = todayUpdates
          .map((u) => {
            const statusEmoji = u.status === 'on_track' ? '🟢' : u.status === 'at_risk' ? '🟡' : '🔴';
            const blockerInfo = u.has_blocker && u.blocker ? `\n  - 🚨 *Blocker:* ${u.blocker}` : '';
            return `#### ${statusEmoji} **${u.profile?.full_name || 'Team Member'}** (${u.progress_percent}% Progress)
- **Yesterday:** ${u.yesterday.replace(/\n/g, ' ')}
- **Today:** ${u.today.replace(/\n/g, ' ')}${blockerInfo}`;
          })
          .join('\n\n');

        answerText = `### 📋 Daily Standup Summary (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
**Scope:** ${podName} | **Participation:** ${submittedCount} / ${totalMembers} Submitted (${rate}%)

${updateBlocks}`;

        insights.push({
          category: 'Participation Rate',
          type: rate >= 75 ? 'success' : 'info',
          points: [`${submittedCount} of ${totalMembers} members checked in (${rate}%).`],
        });

        if (activeBlockers.length > 0) {
          insights.push({
            category: 'Blockers in Pod',
            type: 'warning',
            points: activeBlockers.map((b) => `${b.title} (${b.reporter?.full_name})`),
          });
        }
      }
    }

    const flaggedSignals = this.detectSubtleBlockers(updates);

    return {
      intent,
      question: query,
      timestamp: new Date().toISOString(),
      summaryTitle,
      answerText,
      metrics: {
        totalAnalyzed: updates.length,
        activeBlockersCount: activeBlockers.length,
        onTrackCount: todayUpdates.filter((u) => u.status === 'on_track').length,
        atRiskCount: todayUpdates.filter((u) => u.status === 'at_risk').length,
      },
      insights,
      recommendedFollowUps: followUps.length > 0 ? followUps : ['Team operations running smoothly.'],
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
