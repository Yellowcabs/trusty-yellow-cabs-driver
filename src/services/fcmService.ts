import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { updateFcmTokenApi } from './api';

class FCMService {
  private audio: HTMLAudioElement | null = null;
  private isSoundPlaying = false;
  private isAudioUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
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
    if (!messaging || typeof window === 'undefined') return;

    try {
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
            vapidKey: 'BC1DB0jGKXwqAZ5GrAs6-oaAj9_DbNeZU9FtYcpz5iB1z89-jrg8SDgUOe6h47Ow1x5n2HHTZGK1x49EZWGb87I' // REQUIRED for Web Push
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
    if (this.audio && this.isSoundPlaying) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isSoundPlaying = false;
      
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    }
  }
}

export const fcmService = new FCMService();
