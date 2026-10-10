self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  
  // 1. CROSS-DEVICE GHOSTING: Dismiss notification & close modal on all other devices
  if (data.type === 'MFA_RESOLVED') {
    event.waitUntil(
      Promise.all([
        self.registration.getNotifications({ tag: data.tag }).then(function(notifications) {
          notifications.forEach(function(n) { n.close(); });
        }),
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
          clientList.forEach(function(client) {
            client.postMessage({
              type: 'MFA_RESOLVED',
              attemptId: data.mfa ? data.mfa.attemptId : null
            });
          });
        })
      ])
    );
    return;
  }

  // 2. REAL-TIME IN-APP MODAL BROADCAST: If the PWA is already open, pop the modal immediately
  if (data.type === 'MFA_CHALLENGE' && data.mfa) {
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      clientList.forEach(function(client) {
        client.postMessage({
          type: 'MFA_CHALLENGE_RECEIVED',
          challenge: data.mfa
        });
      });
    });
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/badge-monochrome.png', // Best practice: A small white-transparent icon for the Android status bar
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'default-alert', // Tags group similar notifications together
    renotify: true, // Alerts the user again even if a notification with this tag already exists
    requireInteraction: data.type === 'MFA_CHALLENGE',
    actions: data.actions || [],
    data: {
      url: data.url || '/',
      actionUrls: data.actionUrls || {}, // Custom mapping for button URLs
      mfa: data.mfa || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
  }
);

self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Immediately dismiss the notification
  
  // Determine the target URL based on whether they clicked the body or a specific action button
  const payloadData = event.notification.data || {};

  // 1. HANDLE NATIVE NUMBER-MATCH BUTTON CLICKS IN THE BACKGROUND
  if (event.action && event.action.startsWith('mfa_pick_') && payloadData.mfa) {
    const selectedCode = event.action.replace('mfa_pick_', '');
    const mfa = payloadData.mfa;

    event.waitUntil(
      fetch(mfa.resolveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: mfa.attemptId,
          actionToken: mfa.actionToken,
          selectedCode: selectedCode,
          decision: 'NUMBER_PICK'
        })
      }).catch(function(err) {
        console.error('Failed to resolve MFA from Service Worker:', err);
      })
    );
    return;
  }

  // 2. STANDARD NAVIGATION (Or tapping the MFA body to open the 4-option In-App Modal)
  let targetUrl = payloadData.url || '/';

  if (event.action && payloadData.actionUrls && payloadData.actionUrls[event.action]) {
    targetUrl = payloadData.actionUrls[event.action];
  }

  // SMART FOCUS: Check if the app is already open in a background tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // If the URL matches the target (or is the app root), focus it and navigate
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});