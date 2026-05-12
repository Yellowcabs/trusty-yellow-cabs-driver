
export const getBaseUrl = () => {
  // Check if we have a VITE_BACKEND_URL set in environment
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl;

  // In AIS, we can usually trust the window location for web
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge || navigator.userAgent.includes('Capacitor') || window.location.protocol === 'capacitor:';
    const isNativeHost = window.location.hostname === 'localhost' || window.location.hostname === '' || window.location.protocol === 'file:';
    const origin = window.location.origin;
    const isLocalOrigin = origin.includes('localhost') || origin.includes('capacitor://');

    if (isCapacitor || isNativeHost || isLocalOrigin) {
      // In Native/Capacitor, we need a full URL to the backend.
      // Use the preview URL as it's intended for public sharing/use.
      const preUrl = 'https://ais-pre-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      const devUrl = 'https://ais-dev-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      
      // If we are currently in dev env window, use devUrl, otherwise preUrl
      const targetUrl = (typeof window !== 'undefined' && window.location.href.includes('ais-dev')) ? devUrl : preUrl;
      console.log('[Config] Native/Local environment. Using Backend:', targetUrl);
      return targetUrl;
    }
  }

  return '';
};
