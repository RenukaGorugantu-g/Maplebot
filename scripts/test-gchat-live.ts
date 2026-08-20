const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAQA8ijHd80/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=vR_WlFMQiHtcfTFfa2B5qfy6y14GpyXdIczanj0q5w0';

async function testLiveGoogleChat() {
  console.log('Testing live Google Chat Space dispatch...');
  const payload = {
    cardsV2: [
      {
        cardId: `maplebot-init-${Date.now()}`,
        card: {
          header: {
            title: 'MapleBot Connected to Google Chat!',
            subtitle: 'Maple Learning Solutions • Team Standup Integration',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/190/190411.png',
            imageType: 'CIRCLE',
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: '🚀 <b>MapleBot Integration Live</b><br/>All daily standup updates, peer kudos, lead comments, and standup reminders are now active for Maple Learning Solutions.',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('HTTP Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Google Chat Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error posting to Google Chat:', err);
  }
}

testLiveGoogleChat();
