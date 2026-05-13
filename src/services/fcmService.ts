import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { updateFcmTokenApi } from './api';

class FCMService {
  private audio: HTMLAudioElement | null = null;
  private isSoundPlaying = false;
  private isAudioUnlocked = false;

  private isCapacitor = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isCapacitor = !!((window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge || navigator.userAgent.includes('Capacitor'));
      this.audio = new Audio('/trip.mp3');
      this.audio.loop = true;
    }
  }

  // MUST be called from a user interaction event (click, touch) to unlock audio
  async unlockAudio() {
    if (!this.audio || this.isAudioUnlocked) return;
    
    try {
      // Play and immediately pause to "unlock" the audio context
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isAudioUnlocked = true;
      console.log('Audio unlocked successfully');
    } catch (error) {
      console.warn('Audio unlock failed - user interaction still needed:', error);
    }
  }

  async requestPermission(driverId: string) {
    if (typeof window === 'undefined') return;

    if (this.isCapacitor) {
      console.log('[FCM] Starting Capacitor Push Setup for Driver:', driverId);
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        if (!PushNotifications) {
          console.warn('[FCM] PushNotifications plugin not found');
          return null;
        }

        // 1. Add listeners FIRST before registration or permission requests
        // This ensures the JS bridge is ready and won't miss events
        try {
          await PushNotifications.removeAllListeners();
          
          PushNotifications.addListener('registration', async (token) => {
            console.log('[FCM] Capacitor Token:', token.value);
            if (token.value) {
              await updateFcmTokenApi(driverId, token.value).catch(e => console.error('[FCM] Sync fail:', e));
            }
          });
          
          PushNotifications.addListener('registrationError', (error) => {
            console.error('[FCM] Registration Error:', error);
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[FCM] Push Notification Received:', notification);
            if (notification.data?.type === 'NEW_TRIP' || notification.title?.includes('New Trip')) {
              this.startTripSound();
            }
          });
        } catch (listenerError) {
          console.warn('[FCM] Listener setup partial failure:', listenerError);
        }

        // 2. Check and Request Permissions
        let permStatus = await PushNotifications.checkPermissions();
        console.log('[FCM] Current Permission Status:', permStatus.receive);

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        // 3. Register ONLY if granted
        if (permStatus.receive === 'granted') {
          await PushNotifications.register().catch(e => console.error('[FCM] Register Fail:', e));
          
          // 4. Create Channel (Android Only)
          if ((window as any).Capacitor.getPlatform() === 'android') {
            try {
              await PushNotifications.createChannel({
                id: 'trips',
                name: 'New Trip Alerts',
                description: 'Alerts for nearby trip requests',
                importance: 5,
                visibility: 1,
                vibration: true,
                sound: 'trip.mp3'
              });
              console.log('[FCM] Android Channel "trips" verified');
            } catch (channelError) {
              console.warn('[FCM] Channel creation failed:', channelError);
            }
          }
        } else {
          console.warn('[FCM] Permission NOT granted. Push functionality will be disabled.');
        }
      } catch (err) {
        console.error('[FCM] Critical Capacitor Setup Exception (Prevention of crash):', err);
      }
      return null;
    }

    if (!messaging) return;

    try {
      // Check for Service Worker support
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported in this environment');
        return null;
      }

      // Check for Notification support
      if (!('Notification' in window)) {
        console.warn('Notifications not supported in this environment');
        return null;
      }

      // Register the service worker explicitly
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Firebase SW registered:', registration);

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          const token = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey: 'BIsyqX0_T0d6R7_S6Q5XQv-_z_S_z_z_z_z_z_z_z_z_z_z_z' // REQUIRED for Web Push
          });
          
          if (token) {
            console.log('FCM Token generated:', token);
            await updateFcmTokenApi(driverId, token);
            return token;
          }
        } catch (tokenError: any) {
          console.error('FCM Token error:', tokenError.message);
          if (tokenError.message.includes('vapidKey') || tokenError.message.includes('certificates')) {
            console.info('%c [FCM SETUP REQUIRED] %c Please generate a Web Push VAPID key in Firebase Console and update fcmService.ts', 
              'background: #FF5722; color: #fff; padding: 2px 5px;', '');
          }
          
          // Try one more time without VAPID key as fallback (legacy projects)
          try {
            const token = await getToken(messaging, { serviceWorkerRegistration: registration });
            if (token) {
              await updateFcmTokenApi(driverId, token);
              return token;
            }
          } catch (e) {
            // Silent fail on second attempt
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    return null;
  }

  setupForegroundListener() {
    if (!messaging || typeof window === 'undefined') return;

    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // If it's a new trip, start the sound
      if (payload.data?.type === 'NEW_TRIP' || payload.notification?.title?.includes('New Trip')) {
        this.startTripSound();
      }
      
      // If trip is accepted or rejected elsewhere, stop sound
      if (payload.data?.type === 'STOP_SOUND') {
        this.stopTripSound();
      }
    });

    // Handle visibility changes (e.g. app opening from background)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, checking for pending actions...');
        // NotificationManager handles the sound playback if pendingTrips exist
      }
    });
  }

  startTripSound() {
    if (this.audio && !this.isSoundPlaying) {
      this.audio.play()
        .then(() => {
          this.isSoundPlaying = true;
          this.isAudioUnlocked = true;
          // Vibrate if possible
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
        })
        .catch(e => {
          console.warn('Audio play blocked. Interaction required:', e);
          this.isSoundPlaying = false;
        });
    }
  }

  getIsSoundPlaying() {
    return this.isSoundPlaying;
  }

  getIsAudioUnlocked() {
    return this.isAudioUnlocked;
  }

  stopTripSound() {
    this.isSoundPlaying = false;
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (e) {
        console.warn('[FCM] Sound stop error:', e);
      }
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    console.log('[FCM] Trip sound stopped');
  }
}

export const fcmService = new FCMService();
