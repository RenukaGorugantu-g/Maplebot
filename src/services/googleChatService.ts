import { dataStore } from './dataStore';
import { GoogleChatSettings, Update, Profile } from '../types/database';

export const DEFAULT_UPDATES_WEBHOOK_URL =
  'https://chat.googleapis.com/v1/spaces/AAQA8ijHd80/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=vR_WlFMQiHtcfTFfa2B5qfy6y14GpyXdIczanj0q5w0';

export const DEFAULT_LEAVE_WEBHOOK_URL =
  'https://chat.googleapis.com/v1/spaces/AAQAM29cnHg/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=erlyG0EmAeOxk9LhYXeJpcfTFiQvB1g_NbO_SXxxEdM';

export const googleChatService = {
  getSettings(): GoogleChatSettings {
    return dataStore.getGoogleChatSettings();
  },

  updateSettings(updates: Partial<GoogleChatSettings>): GoogleChatSettings {
    return dataStore.updateGoogleChatSettings(updates);
  },

  /**
   * Helper to dispatch JSON payload to configured Google Chat Space incoming webhook
   */
  async dispatchToSpace(payload: any, targetType: 'updates' | 'leaves' = 'updates'): Promise<boolean> {
    const settings = dataStore.getGoogleChatSettings();
    if (!settings.enabled) {
      return false;
    }

    const webhookUrl =
      targetType === 'leaves'
        ? (settings.leave_webhook_url || DEFAULT_LEAVE_WEBHOOK_URL)
        : (settings.webhook_url || DEFAULT_UPDATES_WEBHOOK_URL);

    try {
      // 1. Try local Vite proxy or Vercel serverless function /api/gchat (bypasses browser CORS)
      const proxyRes = await fetch('/api/gchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, targetType, payload }),
      });

      if (proxyRes.ok) {
        return true;
      }
    } catch (proxyErr) {
      console.warn('Proxy route notice:', proxyErr);
    }

    try {
      // 2. Direct fallback
      const directRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return directRes.ok;
    } catch (directErr) {
      console.warn('Direct Google Chat dispatch notice:', directErr);
      return false;
    }
  },

  /**
   * Dispatches a live card when a team member submits their Daily Standup Update
   */
  async sendDailyUpdateCard(update: Update, profile: Profile, podName: string): Promise<boolean> {
    const statusEmoji = update.status === 'on_track' ? '🟢' : update.status === 'at_risk' ? '🟡' : '🔴';
    const statusLabel = update.status === 'on_track' ? 'On Track' : update.status === 'at_risk' ? 'At Risk' : 'Blocked';

    const blockerText =
      update.has_blocker && update.blocker
        ? `🔴 <b>Active Blocker:</b> ${update.blocker}<br/><b>Category:</b> ${update.blocker_category || 'General'}${
            update.support_needed ? `<br/><b>Support Needed:</b> ${update.support_needed}` : ''
          }`
        : `🟢 <b>No Blockers</b> — Work is progressing smoothly without impediments.`;

    const payload = {
      cardsV2: [
        {
          cardId: `standup-${update.id}-${Date.now()}`,
          card: {
            header: {
              title: `Daily Standup — ${profile.full_name}`,
              subtitle: `Pod: ${podName} • Status: ${statusEmoji} ${statusLabel} (${update.progress_percent}% Progress)`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/3233/3233508.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                header: '✅ What Was Completed Yesterday (Time Spent)',
                widgets: [
                  {
                    textParagraph: {
                      text: update.yesterday ? update.yesterday.replace(/\n/g, '<br/>') : 'None specified',
                    },
                  },
                ],
              },
              {
                header: "🎯 Today's Focus & Estimated Time",
                widgets: [
                  {
                    textParagraph: {
                      text: update.today ? update.today.replace(/\n/g, '<br/>') : 'None specified',
                    },
                  },
                ],
              },
              {
                header: '🛑 Blockers & Team Support',
                widgets: [
                  {
                    textParagraph: {
                      text: blockerText,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);
    dataStore.logAudit('GOOGLE_CHAT_STANDUP_SENT', 'Update', update.id, {
      profileName: profile.full_name,
      podName,
      hasBlocker: update.has_blocker,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches a celebratory recognition card when Kudos is given
   */
  async sendKudosCard(
    senderName: string,
    recipientName: string,
    category: string,
    message: string,
    podName?: string
  ): Promise<boolean> {
    const payload = {
      cardsV2: [
        {
          cardId: `kudos-${Date.now()}`,
          card: {
            header: {
              title: `🌟 Kudos Awarded!`,
              subtitle: `${senderName} recognized ${recipientName}`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>Category:</b> <font color="#00DC82">${category}</font>${
                        podName ? ` (${podName})` : ''
                      }<br/><br/><i>"${message}"</i>`,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);
    dataStore.logAudit('GOOGLE_CHAT_KUDOS_SENT', 'Kudos', undefined, {
      senderName,
      recipientName,
      category,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches a comment/feedback card when a Manager, Pod Lead, or Admin comments on a standup
   */
  async sendUpdateCommentCard(
    commenterName: string,
    authorName: string,
    comment: string,
    podName?: string
  ): Promise<boolean> {
    const payload = {
      cardsV2: [
        {
          cardId: `comment-${Date.now()}`,
          card: {
            header: {
              title: `💬 Standup Feedback from ${commenterName}`,
              subtitle: `Regarding ${authorName}'s update${podName ? ` • ${podName}` : ''}`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/2462/2462719.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>Feedback:</b><br/><i>"${comment}"</i>`,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);
    dataStore.logAudit('GOOGLE_CHAT_COMMENT_SENT', 'Comment', undefined, {
      commenterName,
      authorName,
      comment,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches a standup reminder card for pending members
   */
  async sendStandupReminder(
    memberEmail: string,
    memberName: string,
    podName: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Create in-app notification
    const profile = dataStore.getProfiles().find((p) => p.email.toLowerCase() === memberEmail.toLowerCase());
    if (profile) {
      dataStore.createNotification({
        organization_id: profile.organization_id,
        profile_id: profile.id,
        type: 'reminder',
        title: 'Daily Standup Reminder',
        message: `Good morning ${memberName}! Please submit your daily check-in update for the ${podName} pod.`,
        read: false,
      });
    }

    // 2. Dispatch to Google Chat space
    const payload = {
      cardsV2: [
        {
          cardId: `reminder-${Date.now()}`,
          card: {
            header: {
              title: 'MapleBot — Standup Reminder',
              subtitle: `Space: Maple Team Updates`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/2097/2097276.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `🔔 <b>Standup Reminder</b> for <font color="#00DC82">${memberName}</font> (<i>${podName}</i>).<br/>Please log what you completed yesterday and today's priorities.`,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);

    dataStore.logAudit('STANDUP_REMINDER_SENT', 'Profile', profile?.id || memberEmail, {
      memberEmail,
      memberName,
      podName,
      sent,
    });

    return {
      success: true,
      message: `Ping reminder sent to ${memberName} via Google Chat Space!`,
    };
  },

  async sendTestMessage(targetType: 'updates' | 'leaves' = 'updates'): Promise<{ success: boolean; message: string }> {
    const isLeave = targetType === 'leaves';
    const payload = {
      cardsV2: [
        {
          cardId: `test-${Date.now()}`,
          card: {
            header: {
              title: isLeave ? 'MapleBot — Leave Tracker Connected!' : 'MapleBot — Connected Successfully!',
              subtitle: isLeave ? 'Leave Tracker Google Chat Integration' : 'Maple Learning Solutions Google Chat Integration',
              imageUrl: isLeave ? 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' : 'https://cdn-icons-png.flaticon.com/512/190/190411.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: isLeave
                        ? '✅ <b>Leave Tracker Space Webhook Active</b><br/>Leave applications, approvals, and balance updates will post here automatically.'
                        : '✅ <b>Google Chat Space Webhook Active</b><br/>Daily standups, blockers, kudos, and lead feedback will post here automatically.',
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload, targetType);
    return {
      success: sent,
      message: sent
        ? `Test card successfully posted to ${isLeave ? 'Leave Tracker' : 'Maple Team Updates'} Space!`
        : 'Webhook received test request.',
    };
  },

  /**
   * Dispatches an interactive Leave Request Card to Google Chat for Pod Lead / Manager approval
   */
  async sendLeaveRequestApprovalCard(params: {
    leave: any;
    profile: Profile;
    podName: string;
    leadName?: string;
  }): Promise<boolean> {
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const redirectUrl = `${host}/leave-planner`;

    const deliverablesLine = params.leave.deliverables_status
      ? `<b>📦 Deliverables Status:</b> ${params.leave.deliverables_status}${
          params.leave.deliverables_notes ? `<br/><i>"${params.leave.deliverables_notes}"</i>` : ''
        }<br/>`
      : `<b>📦 Deliverables Status:</b> Yes — All deliverables completed<br/>`;

    const backupLine = params.leave.backup_person
      ? `<b>🤝 Backup Teammate:</b> <font color="#38BDF8"><b>${params.leave.backup_person}</b></font>${
          params.leave.backup_plan ? `<br/><i>Coverage Plan: "${params.leave.backup_plan}"</i>` : ''
        }<br/>`
      : `<b>🤝 Backup Person:</b> None required / self-managed<br/>`;

    const payload = {
      cardsV2: [
        {
          cardId: `leave-req-${params.leave.id}-${Date.now()}`,
          card: {
            header: {
              title: `🏖️ Leave Request — ${params.profile.full_name}`,
              subtitle: `Pod: ${params.podName} • Status: ⏳ Pending Approval (${params.leave.days_count} Day${params.leave.days_count === 1 ? '' : 's'})`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                header: '📅 Leave Request Details',
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>Leave Type:</b> <font color="#00DC82">${params.leave.leave_type}</font><br/>` +
                        `<b>Duration:</b> ${params.leave.days_count} working day(s)<br/>` +
                        `<b>Dates:</b> ${params.leave.start_date} &nbsp;➔&nbsp; ${params.leave.end_date}<br/>` +
                        `<b>Reason:</b> <i>"${params.leave.reason || 'Planned vacation / leave'}"</i><br/><br/>` +
                        deliverablesLine +
                        backupLine,
                    },
                  },
                ],
              },
              {
                widgets: [
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '✅ Review & Approve in MapleBot',
                          onClick: {
                            openLink: {
                              url: redirectUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload, 'leaves');
    dataStore.logAudit('GOOGLE_CHAT_LEAVE_REQ_SENT', 'LeaveRequest', params.leave.id, {
      employee: params.profile.full_name,
      dates: `${params.leave.start_date} to ${params.leave.end_date}`,
      type: params.leave.leave_type,
      deliverables: params.leave.deliverables_status,
      backup: params.leave.backup_person,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches a Leave Status Update Card (Approved / Rejected)
   */
  async sendLeaveStatusUpdateCard(params: {
    leave: any;
    approverName: string;
    status: string;
  }): Promise<boolean> {
    const isApproved = params.status === 'approved';
    const statusLabel = isApproved ? 'Approved ✅' : params.status.toUpperCase();
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

    const payload = {
      cardsV2: [
        {
          cardId: `leave-status-${params.leave.id}-${Date.now()}`,
          card: {
            header: {
              title: `${isApproved ? '✅ Leave Approved' : '📋 Leave Update'} — ${params.leave.employee_name}`,
              subtitle: `Approver: ${params.approverName} • Status: ${statusLabel}`,
              imageUrl: isApproved
                ? 'https://cdn-icons-png.flaticon.com/512/190/190411.png'
                : 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>Employee:</b> ${params.leave.employee_name}<br/>` +
                        `<b>Leave Type:</b> ${params.leave.leave_type}<br/>` +
                        `<b>Dates:</b> ${params.leave.start_date} to ${params.leave.end_date} (${params.leave.days_count} days)<br/>` +
                        `<b>Status:</b> <font color="${isApproved ? '#00DC82' : '#F59E0B'}"><b>${statusLabel}</b></font>`,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    return await this.dispatchToSpace(payload, 'leaves');
  },

  /**
   * Dispatches task review comments / evaluations from Pod Lead or Manager to Google Chat
   * Tags the employee so they receive an immediate notification/mention alert.
   */
  async sendReviewEvaluationCard(params: {
    log: any;
    reviewerName: string;
    reviewerRole: 'Pod Lead' | 'Manager';
    comments?: string;
    quality?: any;
    tat?: string;
    efficiency?: string;
    errorCount?: number;
  }): Promise<boolean> {
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const redirectUrl = `${host}/performance`;

    // Find employee profile to retrieve Google Workspace email for tagging
    let memberEmail = params.log.employee_email;
    let memberName = params.log.employee_name || 'Team Member';
    if (!memberEmail && params.log.employee_id) {
      const p = dataStore.getProfiles().find((prof) => prof.id === params.log.employee_id);
      if (p) {
        if (p.email) memberEmail = p.email;
        if (p.full_name) memberName = p.full_name;
      }
    }

    const userMention = memberEmail ? `<users/${memberEmail}>` : `@${memberName}`;
    const taskName = params.log.task || params.log.task_title || 'Deliverable';
    const notificationText = `🔔 ${userMention} You have received new feedback from ${params.reviewerRole} *${params.reviewerName}* on deliverable: *${taskName}*!`;

    const metricItems: string[] = [];
    if (params.errorCount !== undefined) {
      metricItems.push(`<b>Error Count:</b> ${params.errorCount}`);
    }
    if (params.quality) {
      const qVal = typeof params.quality === 'number' ? `${params.quality}/5` : params.quality;
      metricItems.push(`<b>Quality:</b> <font color="#00DC82">⭐ ${qVal}</font>`);
    }
    if (params.tat) {
      metricItems.push(`<b>TAT:</b> ⏱️ ${params.tat}`);
    }
    if (params.efficiency) {
      metricItems.push(`<b>Efficiency:</b> ⚡ ${params.efficiency}`);
    }

    const metricsHtml = metricItems.length > 0 ? metricItems.join('&nbsp;&nbsp;|&nbsp;&nbsp;') : '';

    const memberFeedbackText = params.log.feedback_comments || params.log.comments;
    const reviewerCommentsText = params.comments || params.log.reviewer_comments || 'Reviewed and approved without additional notes.';

    const payload = {
      text: notificationText,
      cardsV2: [
        {
          cardId: `review-eval-${params.log.id}-${Date.now()}`,
          card: {
            header: {
              title: `🔍 ${params.reviewerRole} Review — ${memberName}`,
              subtitle: `Project: ${params.log.project_name || params.log.project || 'General'} • Evaluator: ${params.reviewerName}`,
              imageUrl: params.reviewerRole === 'Manager'
                ? 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
                : 'https://cdn-icons-png.flaticon.com/512/1077/1077063.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                header: '📌 Task Evaluation & Feedback',
                widgets: [
                  {
                    textParagraph: {
                      text: `👤 <b>Teammate:</b> ${userMention} (${memberName})<br/>` +
                        `<b>Task:</b> ${taskName}<br/>` +
                        `<b>Completed Date:</b> ${params.log.completed_date || 'Pending'}<br/>` +
                        `<b>Hours Spent:</b> ${params.log.time_invested || params.log.duration_hours || 0}h &nbsp;|&nbsp; <b>Deliverables:</b> ${params.log.unit_count_completed || 0} unit(s)<br/>` +
                        (metricsHtml ? `${metricsHtml}<br/><br/>` : '<br/>') +
                        (memberFeedbackText ? `💬 <b>Member Feedback / Comments:</b><br/><i>"${memberFeedbackText}"</i><br/><br/>` : '') +
                        `📝 <b>Reviewer Comments & Feedback:</b><br/><i>"${reviewerCommentsText}"</i>`,
                    },
                  },
                ],
              },
              {
                widgets: [
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '🔗 Open Work Performance Ledger',
                          onClick: {
                            openLink: {
                              url: redirectUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);
    dataStore.logAudit('GOOGLE_CHAT_REVIEW_EVAL_SENT', 'PerformanceWorkLog', params.log.id, {
      reviewer: params.reviewerName,
      role: params.reviewerRole,
      employee: memberName,
      email: memberEmail,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches an executive Work Deliverables summary to Google Chat:
   * Displays Task Name, Project, Hours Spent, Deliverables Count, individual task Member Comments/Feedback,
   * tags the submitting member, and highlights active Blockers prominently in RED.
   */
  async sendWorkDeliverablesSummaryCard(params: {
    memberName: string;
    podName: string;
    date: string;
    checkinTime: string;
    tasks: Array<{
      projectName: string;
      task: string;
      timeInvested: number;
      unitCountCompleted: number;
      comments?: string;
      blocker?: string;
    }>;
    portalUrl?: string;
  }): Promise<boolean> {
    const totalHours = params.tasks.reduce((sum, t) => sum + (Number(t.timeInvested) || 0), 0);
    const totalUnits = params.tasks.reduce((sum, t) => sum + (Number(t.unitCountCompleted) || 1), 0);

    // Format tasks overview: Project, Task Name, Hours, Units, and Feedback / Comments
    const taskLines = params.tasks
      .map((t, idx) => {
        let text = `<b>${idx + 1}. [${t.projectName}]</b> ${t.task}<br/>&nbsp;&nbsp;&nbsp;&nbsp;⏱️ <b>${t.timeInvested}h</b> &nbsp;|&nbsp; 📦 <b>${t.unitCountCompleted} item(s)</b>`;
        if (t.comments && t.comments.trim()) {
          text += `<br/>&nbsp;&nbsp;&nbsp;&nbsp;💬 <i>"${t.comments.trim()}"</i>`;
        }
        return text;
      })
      .join('<br/><br/>');

    // Extract explicit blockers as well as blocker keywords
    const blockerEntries: Array<{ project: string; text: string }> = [];
    params.tasks.forEach((t) => {
      if (t.blocker && t.blocker.trim()) {
        blockerEntries.push({ project: t.projectName, text: t.blocker.trim() });
      } else if (t.comments && t.comments.trim()) {
        const c = t.comments.toLowerCase();
        if (
          c.includes('block') ||
          c.includes('issue') ||
          c.includes('waiting') ||
          c.includes('delay') ||
          c.includes('stuck') ||
          c.includes('error') ||
          c.includes('help') ||
          c.includes('impediment')
        ) {
          blockerEntries.push({ project: t.projectName, text: t.comments.trim() });
        }
      }
    });

    const generalCommentTasks = params.tasks.filter((t) => {
      if (!t.comments || !t.comments.trim()) return false;
      const isBlk = blockerEntries.some((b) => b.project === t.projectName && b.text === t.comments?.trim());
      return !isBlk;
    });

    let blockerSectionText = `🟢 <b>No Blockers Reported</b> — All deliverables progressing smoothly.`;
    if (blockerEntries.length > 0) {
      const blockerList = blockerEntries
        .map((b) => `• <b>${b.project}:</b> <font color="#EF4444"><b>🚨 ${b.text}</b></font>`)
        .join('<br/>');
      blockerSectionText = `🚨 <b><font color="#EF4444">ACTIVE BLOCKERS (ATTENTION REQUIRED):</font></b><br/>${blockerList}`;
    }

    let generalCommentsText = '';
    if (generalCommentTasks.length > 0) {
      generalCommentsText = generalCommentTasks
        .map((t) => `• <b>${t.projectName}:</b> <i>"${t.comments}"</i>`)
        .join('<br/>');
    }

    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const redirectUrl = params.portalUrl || `${host}/performance`;

    const sections: any[] = [
      {
        header: `💼 Work Tasks Overview (${totalHours}h Total • ${totalUnits} items)`,
        widgets: [
          {
            textParagraph: {
              text: taskLines || 'No task descriptions logged.',
            },
          },
        ],
      },
    ];

    if (generalCommentsText) {
      sections.push({
        header: '📝 Member Feedback & Notes',
        widgets: [
          {
            textParagraph: {
              text: generalCommentsText,
            },
          },
        ],
      });
    }

    sections.push({
      header: '🛑 Blocker & Impediment Status',
      widgets: [
        {
          textParagraph: {
            text: blockerSectionText,
          },
        },
      ],
    });

    sections.push({
      widgets: [
        {
          buttonList: {
            buttons: [
              {
                text: '🔗 Open Full 17-Column Report & Evaluate',
                onClick: {
                  openLink: {
                    url: redirectUrl,
                  },
                },
              },
            ],
          },
        },
      ],
    });

    const hasBlockers = blockerEntries.length > 0;
    const statusEmoji = hasBlockers ? '🔴' : '🟢';
    const statusLabel = hasBlockers ? 'Impediment Reported' : 'On Track (100% Progress)';

    // Find profile to tag
    const memberProfile = dataStore.getProfiles().find((p) => p.full_name === params.memberName);
    const memberTag = memberProfile?.email ? `<users/${memberProfile.email}>` : `@${params.memberName}`;

    const notificationText = hasBlockers
      ? `🚨 *ATTENTION* — ${memberTag} (${params.podName}) logged work deliverables with *ACTIVE BLOCKERS* on ${params.date}!`
      : `📋 *Daily Work Deliverables* — ${memberTag} (${params.podName}) logged previous day deliverables (${totalHours}h • ${totalUnits} items) on ${params.date}.`;

    const payload = {
      text: notificationText,
      cardsV2: [
        {
          cardId: `work-deliverables-${Date.now()}`,
          card: {
            header: {
              title: `Daily Standup — ${params.memberName}`,
              subtitle: `Pod: ${params.podName} • Status: ${statusEmoji} ${statusLabel} • Check-in: ${params.checkinTime} • ${params.date}`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/3233/3233508.png',
              imageType: 'CIRCLE',
            },
            sections,
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);
    dataStore.logAudit('GOOGLE_CHAT_WORK_SUMMARY_SENT', 'PerformanceWorkLog', undefined, {
      memberName: params.memberName,
      podName: params.podName,
      totalHours,
      tasksCount: params.tasks.length,
      hasBlockers: blockerEntries.length > 0,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches clean, formatted notification to Google Chat space when a leave request is APPROVED
   */
  async sendLeaveApprovedCard(params: {
    employeeName: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    leaveType?: string;
    approvedBy?: string;
    podName?: string;
    reason?: string;
    deliverablesStatus?: string;
    backupPerson?: string;
  }): Promise<boolean> {
    const formattedDateRange =
      params.startDate === params.endDate
        ? params.startDate
        : `${params.startDate} to ${params.endDate}`;

    const payload = {
      cardsV2: [
        {
          cardId: `leave-approved-${Date.now()}`,
          card: {
            header: {
              title: `Team Leave Update`,
              subtitle: `${params.employeeName} — Approved Leave (${params.daysCount} day${params.daysCount > 1 ? 's' : ''})`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                header: `🌴 Leave Details`,
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>${params.employeeName}</b> will be on leave from <b>${formattedDateRange}</b> (${params.daysCount} day${params.daysCount > 1 ? 's' : ''}).<br/><br/>` +
                        `• <b>Leave Type:</b> ${params.leaveType || 'Paid Time Off (PTO)'}<br/>` +
                        (params.podName ? `• <b>Pod:</b> ${params.podName}<br/>` : '') +
                        (params.deliverablesStatus ? `• <b>Deliverables:</b> ${params.deliverablesStatus}<br/>` : '') +
                        (params.backupPerson ? `• <b>Backup Person:</b> ${params.backupPerson}<br/>` : '') +
                        `• <b>Status:</b> <font color="#10B981"><b>✅ Approved</b></font><br/>` +
                        (params.approvedBy ? `• <b>Approved By:</b> ${params.approvedBy}` : ''),
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload, 'leaves');
    dataStore.logAudit('GOOGLE_CHAT_LEAVE_APPROVED_SENT', 'LeaveRequest', undefined, {
      employee: params.employeeName,
      dates: formattedDateRange,
      days: params.daysCount,
      approvedBy: params.approvedBy,
      sent,
    });
    return sent;
  },

  /**
   * Dispatches feedback notification tagging the recipient teammate
   */
  async sendFeedbackNotificationCard(params: {
    memberName: string;
    reviewerName: string;
    reviewerRole: string;
    date: string;
    comments: string;
    portalUrl?: string;
  }): Promise<boolean> {
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const redirectUrl = params.portalUrl || `${host}/performance`;

    const payload = {
      cardsV2: [
        {
          cardId: `feedback-${Date.now()}`,
          card: {
            header: {
              title: `Feedback on Work Performance (Check-in)`,
              subtitle: `To: ${params.memberName} • From: ${params.reviewerName} (${params.reviewerRole})`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/2921/2921226.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>${params.memberName}</b>, ${params.reviewerName} has added feedback to your Work Performance (Check-in) update for <b>${params.date}</b>:<br/><br/>` +
                        `<i>"${params.comments}"</i>`,
                    },
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '🔗 View Performance Check-in',
                          onClick: {
                            openLink: {
                              url: redirectUrl,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    const sent = await this.dispatchToSpace(payload);
    return sent;
  },

  /**
   * Dispatches 10:00 AM IST Check-in Reminder to teammates who have not submitted today
   */
  async sendDailyCheckinReminderCard(unsubmittedMembers: Array<{ name: string; podName?: string }>): Promise<boolean> {
    if (unsubmittedMembers.length === 0) return false;

    const namesList = unsubmittedMembers.map((m) => `• <b>${m.name}</b> (${m.podName || 'General Pod'})`).join('<br/>');
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

    const payload = {
      cardsV2: [
        {
          cardId: `reminder-10am-${Date.now()}`,
          card: {
            header: {
              title: `⏰ 10:00 AM Daily Check-in Reminder`,
              subtitle: `Maple Learning Solutions • Asia/Kolkata (IST)`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/2921/2921226.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                header: `Pending Work Performance (Check-in) Submissions`,
                widgets: [
                  {
                    textParagraph: {
                      text: `Friendly reminder to submit your <b>Work Performance (Check-in)</b> update for today:<br/><br/>${namesList}`,
                    },
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: '✍️ Submit My Work Check-in Now',
                          onClick: {
                            openLink: {
                              url: `${host}/performance`,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    return await this.dispatchToSpace(payload);
  },
};

export const auditService = {
  getLogs() {
    return dataStore.getAuditLogs();
  },
};
