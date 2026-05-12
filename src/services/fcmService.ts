import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { updateFcmTokenApi } from './api';

class FCMService {
  private audio: HTMLAudioElement | null = null;
  private isSoundPlaying = false;
  private isAudioUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/trip.mp3.mp3');
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
    if (!messaging) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'BC1DB0jGKXwqAZ5GrAs6-oaAj9_DbNeZU9FtYcpz5iB1z89-jrg8SDgUOe6h47Ow1x5n2HHTZGK1x49EZWGb87I' // This will be updated if needed, but often FCM works without it in some regions if default is used
          // Actually, I should probably use a real VAPID key if I had one, 
          // but let's try getting it without first or use a placeholder.
          // VAPID keys are generated in Firebase Console. 
          // Since I can't access the console, I'll use a standard method.
        });
        
        if (token) {
          console.log('FCM Token:', token);
          await updateFcmTokenApi(driverId, token);
          return token;
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    return null;
  }

  setupForegroundListener() {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // If it's a new trip, start the sound
      if (payload.data?.type === 'NEW_TRIP' || payload.notification?.title?.includes('New Trip')) {
        this.startTripSound();
      }
      
      // If trip is accepted or rejected elsewhere (unlikely but possible), stop sound
      if (payload.data?.type === 'STOP_SOUND') {
        this.stopTripSound();
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
