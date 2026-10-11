import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { UAParser } from 'ua-parser-js';

// Helper to convert the VAPID public key
const urlBase64ToUint8Array = (base64String: string) => {
  const cleanKey = base64String.trim();
  const padding = '='.repeat((4 - (cleanKey.length % 4)) % 4);
  const base64 = (cleanKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getCleanDeviceName = (): string => {
  const parser = new UAParser(navigator.userAgent);
  const browser = parser.getBrowser().name;
  const os = parser.getOS().name;
  if (browser && os) return `${browser} on ${os}`;
  return /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Device' : 'Desktop Browser';
};

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.register('/sw.js')
        .then(async (registration) => {
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
            // Automatically re-bind this device's push subscription to the logged-in user in PostgreSQL
            const parser = new UAParser();
            const deviceName = `${parser.getBrowser().name || 'Browser'} on ${parser.getOS().name || 'OS'}`;
            apiClient.post('/push/subscribe', {
              subscription: sub.toJSON(),
              deviceName
            }).catch(() => {});
          }
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push permission denied by user.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();

      if (!publicVapidKey) {
        throw new Error('Missing VITE_VAPID_PUBLIC_KEY in frontend .env');
      }

      // Reuse existing browser subscription if present, otherwise create a new one
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }

      const deviceName = getCleanDeviceName();

      // Save subscription to PostgreSQL
      await apiClient.post('/push/subscribe', {
        subscription,
        deviceName
      });

      setIsSubscribed(true);
    } catch (error: any) {
      console.error('Failed to subscribe to push notifications:', error);
      if (error.name === 'AbortError' || error.message?.includes('push service error')) {
        alert(
          'Push Service Blocked by Browser:\n\n' +
          'If you are using Brave Browser, open brave://settings/privacy, enable "Use Google services for push messaging", and relaunch the browser.'
        );
      }
    }
  }, [isSupported]);

  return { isSupported, isSubscribed, subscribeToPush };
};