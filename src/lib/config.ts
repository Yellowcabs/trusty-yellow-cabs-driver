
export const getBaseUrl = () => {
  // Check if we have a VITE_BACKEND_URL set in environment
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl;

  // In AIS, we can usually trust the window location for web
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge || navigator.userAgent.includes('Capacitor') || window.location.protocol === 'capacitor:' || window.location.protocol === 'http:';
    const isNativeHost = window.location.hostname === 'localhost' || window.location.hostname === '' || window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1';
    const origin = window.location.origin;
    const isLocalOrigin = origin.includes('localhost') || origin.includes('capacitor://') || origin.includes('http://localhost');

    // FORCE PUBLIC PREVIEW URL FOR APK/NATIVE (Stripped trailing slash for safety)
    if (isCapacitor || isNativeHost || isLocalOrigin || window.location.protocol.includes('http')) {
      const preUrl = 'https://ais-pre-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app'.replace(/\/$/, '');
      console.log('[Config] Environment detected. Using Backend:', preUrl);
      return preUrl;
    }
  }

  return '';
};
