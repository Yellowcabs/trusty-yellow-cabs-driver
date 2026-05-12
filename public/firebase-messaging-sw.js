importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Config will be injected or we can use a hardcoded one since we have it from the file
// But since this is a static file in public, we have to hardcode or use a template.
// I'll grab the data from the config file I read earlier.

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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Trip Request! 🚕';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new booking request.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'trip-request', // Helps prevent duplicate notifications
    renotify: true,
    data: {
      url: payload.data?.url || '/',
      type: payload.data?.type
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
