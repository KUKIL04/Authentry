self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil((async () => {
    // 1. CROSS-DEVICE GHOSTING: Dismiss notification on all other devices
    if (data.type === 'MFA_RESOLVED') {
      const notifications = await self.registration.getNotifications({ tag: data.tag });
      notifications.forEach(n => n.close());

      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach(client => {
        client.postMessage({ type: 'MFA_RESOLVED', attemptId: data.mfa ? data.mfa.attemptId : null });
      });
      return;
    }

    // 2. ZERO-TRUST CHECK: Ensure this specific device is currently logged in!
    if (data.type === 'MFA_CHALLENGE') {
      try {
        // Pings the backend to verify the HttpOnly cookies are still valid
        const authCheck = await fetch('/api/v1/auth/mfa/active', { credentials: 'include' });
        
        if (authCheck.status === 401 || authCheck.status === 403) {
          console.log('Device is logged out. Suppressing MFA push.');
          return; // Halts execution. The notification is never shown.
        }
      } catch (e) {
        // If the network drops, let it pass so the user isn't locked out offline
      }
    }

    // 3. REAL-TIME IN-APP MODAL BROADCAST
    if (data.type === 'MFA_CHALLENGE' && data.mfa) {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach(client => {
        if (!client.url.includes('/login')) {
          client.postMessage({ type: 'MFA_CHALLENGE_RECEIVED', challenge: data.mfa });
        }
      });
    }
    
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/badge-monochrome.png',
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag || 'default-alert',
      renotify: true,
      requireInteraction: data.type === 'MFA_CHALLENGE',
      actions: data.actions || [],
      data: {
        url: data.url || '/',
        actionUrls: data.actionUrls || {},
        mfa: data.mfa || null
      }
    };

    await self.registration.showNotification(data.title, options);
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const payloadData = event.notification.data || {};

  // 1. HANDLE NATIVE NUMBER-MATCH BUTTON CLICKS IN THE BACKGROUND
  if (event.action && event.action.startsWith('mfa_pick_') && payloadData.mfa) {
    const selectedCode = event.action.replace('mfa_pick_', '');
    const mfa = payloadData.mfa;

    event.waitUntil((async () => {
      try {
        await fetch('/api/v1/auth/mfa/resolve', {
          method: 'POST',
          credentials: 'include', // Prove this device is logged in
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: mfa.attemptId,
            actionToken: mfa.actionToken,
            selectedCode: selectedCode,
            decision: 'NUMBER_PICK'
          })
        });
        // Note: If successful, the backend automatically sends an MFA_RESOLVED push 
        // to close notifications across all devices.
      } catch (err) {
        console.error('Failed to resolve MFA from Service Worker:', err);
      }
    })());
    return;
  }

  // 2. STANDARD NAVIGATION
  let targetUrl = payloadData.url || '/';
  if (event.action && payloadData.actionUrls && payloadData.actionUrls[event.action]) {
    targetUrl = payloadData.actionUrls[event.action];
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(self.location.origin) && !client.url.includes('/login') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});