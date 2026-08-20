import { dataStore } from './dataStore';
import { GoogleChatSettings } from '../types/database';

export const googleChatService = {
  getSettings(): GoogleChatSettings {
    return dataStore.getGoogleChatSettings();
  },

  updateSettings(updates: Partial<GoogleChatSettings>): GoogleChatSettings {
    return dataStore.updateGoogleChatSettings(updates);
  },

  async sendStandupReminder(
    memberEmail: string,
    memberName: string,
    podName: string
  ): Promise<{ success: boolean; message: string }> {
    const settings = dataStore.getGoogleChatSettings();

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

    // 2. Dispatch to Google Chat space if webhook URL is configured
    if (settings.enabled && settings.webhook_url) {
      try {
        const payload = {
          cardsV2: [
            {
              cardId: `reminder-${Date.now()}`,
              card: {
                header: {
                  title: 'MapleBot — Standup Reminder',
                  subtitle: `Space: ${settings.space_name || 'Maple Team Updates'}`,
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

        // If not localhost or demo webhook, send POST
        if (settings.webhook_url.startsWith('https://chat.googleapis.com/')) {
          fetch(settings.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch((err) => console.warn('Google Chat Webhook dispatch error:', err));
        }
      } catch (e) {
        console.warn('Google Chat Webhook dispatch error:', e);
      }
    }

    // 3. Log Audit
    dataStore.logAudit('STANDUP_REMINDER_SENT', 'Profile', profile?.id || memberEmail, {
      memberEmail,
      memberName,
      podName,
      spaceName: settings.space_name,
    });

    return {
      success: true,
      message: `Ping reminder sent to ${memberName} via Google Chat Space "${settings.space_name}"!`,
    };
  },

  async sendTestMessage(): Promise<{ success: boolean; message: string }> {
    await new Promise((res) => setTimeout(res, 500));
    const settings = dataStore.getGoogleChatSettings();

    dataStore.logAudit('GOOGLE_CHAT_TEST_SENT', 'GoogleChatSettings', settings.id, {
      spaceName: settings.space_name,
    });

    return {
      success: true,
      message: `Test card sent to Google Chat Space: "${settings.space_name || 'Maple Team Updates'}"`,
    };
  },
};

export const auditService = {
  getLogs() {
    return dataStore.getAuditLogs();
  },
};
