/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "gen-lang-client-0592717447",
  appId: "1:1001336213776:web:634746420d2f02aa549595",
  apiKey: "AIzaSyC12q0b2Lo7FeS44xUeiARTor0sIy7vhF0",
  authDomain: "gen-lang-client-0592717447.firebaseapp.com",
  messagingSenderId: "1001336213776",
  storageBucket: "gen-lang-client-0592717447.firebasestorage.app"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE_NAME = 'trustycab-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  '/trip.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Only cache same-origin assets or specific CDNs
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdn-icons-png') && 
      !event.request.url.includes('fonts.googleapis')) {
    return;
  }

  // Skip API and Firebase calls
  if (event.request.url.includes('/api/') || event.request.url.includes('firebase')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return fetchResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('/');
        return null;
      });
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'New Trip Request! 🚕';
  const notificationOptions = {
    body: payload.notification?.body || 'New booking request received.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    vibrate: [500, 100, 500, 100, 500],
    tag: 'trip-request',
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.data?.url || '/requests',
      tripId: payload.data?.tripId
    }
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
