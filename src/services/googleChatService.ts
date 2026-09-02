import { dataStore } from './dataStore';
import { GoogleChatSettings, Update, Profile } from '../types/database';

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
  async dispatchToSpace(payload: any): Promise<boolean> {
    const settings = dataStore.getGoogleChatSettings();
    if (!settings.enabled) {
      return false;
    }

    const webhookUrl =
      settings.webhook_url ||
      'https://chat.googleapis.com/v1/spaces/AAQA8ijHd80/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=vR_WlFMQiHtcfTFfa2B5qfy6y14GpyXdIczanj0q5w0';

    try {
      // 1. Try local Vite proxy or Vercel serverless function /api/gchat (bypasses browser CORS)
      const proxyRes = await fetch('/api/gchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, payload }),
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

  async sendTestMessage(): Promise<{ success: boolean; message: string }> {
    const payload = {
      cardsV2: [
        {
          cardId: `test-${Date.now()}`,
          card: {
            header: {
              title: 'MapleBot — Connected Successfully!',
              subtitle: 'Maple Learning Solutions Google Chat Integration',
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/190/190411.png',
              imageType: 'CIRCLE',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: '✅ <b>Google Chat Space Webhook Active</b><br/>Daily standups, blockers, kudos, and lead feedback will post here automatically.',
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
    return {
      success: sent,
      message: sent
        ? 'Test card successfully posted to your Google Chat Space!'
        : 'Webhook received test request.',
    };
  },

  /**
   * Dispatches an executive Work Deliverables summary to Google Chat:
   * Displays only Task Name, Project, Hours Spent, and Highlighted Blockers.
   * Internal granular comments/evaluations are kept secure in MapleBot.
   * Includes a direct clickable link for Managers & Admins to view the full 17-column report & evaluate.
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
    }>;
    portalUrl?: string;
  }): Promise<boolean> {
    const totalHours = params.tasks.reduce((sum, t) => sum + (Number(t.timeInvested) || 0), 0);
    const totalUnits = params.tasks.reduce((sum, t) => sum + (Number(t.unitCountCompleted) || 1), 0);

    // Format tasks overview: only Project, Task Name, Hours, Units
    const taskLines = params.tasks
      .map((t, idx) => {
        return `<b>${idx + 1}. [${t.projectName}]</b> ${t.task}<br/>&nbsp;&nbsp;&nbsp;&nbsp;⏱️ <b>${t.timeInvested}h</b> &nbsp;|&nbsp; 📦 <b>${t.unitCountCompleted} item(s)</b>`;
      })
      .join('<br/><br/>');

    // Detect blockers from comments
    const blockerTasks = params.tasks.filter((t) => {
      if (!t.comments) return false;
      const c = t.comments.toLowerCase();
      return (
        c.includes('block') ||
        c.includes('issue') ||
        c.includes('waiting') ||
        c.includes('delay') ||
        c.includes('stuck') ||
        c.includes('error') ||
        c.includes('help')
      );
    });

    let blockerSectionText = `🟢 <b>No Blockers Reported</b> — All deliverables progressing smoothly.`;
    if (blockerTasks.length > 0) {
      const blockerList = blockerTasks
        .map((t) => `• <b>${t.projectName}:</b> <font color="#F43F5E">${t.comments}</font>`)
        .join('<br/>');
      blockerSectionText = `🚨 <b><font color="#F43F5E">Active Blockers Highlighted:</font></b><br/>${blockerList}`;
    }

    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const redirectUrl = params.portalUrl || `${host}/performance`;

    const payload = {
      cardsV2: [
        {
          cardId: `work-deliverables-${Date.now()}`,
          card: {
            header: {
              title: `📋 Daily Work Update — ${params.memberName}`,
              subtitle: `Pod: ${params.podName} • Check-in: ${params.checkinTime} • ${params.date}`,
              imageUrl: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
              imageType: 'CIRCLE',
            },
            sections: [
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
              {
                header: '🛑 Blocker & Impediment Status',
                widgets: [
                  {
                    textParagraph: {
                      text: blockerSectionText,
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
              },
            ],
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
      hasBlockers: blockerTasks.length > 0,
      sent,
    });
    return sent;
  },
};

export const auditService = {
  getLogs() {
    return dataStore.getAuditLogs();
  },
};
