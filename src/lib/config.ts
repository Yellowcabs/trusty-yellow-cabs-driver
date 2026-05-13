
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

    if (isCapacitor || isNativeHost || isLocalOrigin || window.location.protocol.includes('http')) {
      // In Native/Capacitor, we need a full URL to the backend.
      const preUrl = 'https://ais-pre-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      const devUrl = 'https://ais-dev-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      
      let targetUrl = (typeof window !== 'undefined' && window.location.href.includes('ais-dev')) ? devUrl : preUrl;
      
      // If we are on the production URL but in a web browser, we don't necessarily NEED the full URL if we're on the same server, 
      // but for APK it's mandatory.
      console.log('[Config] Environment detected. Using Backend:', targetUrl);
      return targetUrl;
    }
  }

  return '';
};
