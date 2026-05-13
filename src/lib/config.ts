
export const getBaseUrl = () => {
  // Check if we have a VITE_BACKEND_URL set in environment
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl;

  // In AIS, we can usually trust the window location for web
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge || navigator.userAgent.includes('Capacitor');
    const isNativeHost = window.location.hostname === 'localhost' || window.location.hostname === '' || window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';
    
    // Check if current origin is localhost/capacitor
    const origin = window.location.origin;
    const isLocalOrigin = origin.includes('localhost') || origin.includes('capacitor://');

    if (isCapacitor || isNativeHost || isLocalOrigin) {
      // In Native/Capacitor, we need a full URL to the backend.
      // We prioritize the AIS URL as it has the Express server running.
      const aisUrl = 'https://ais-dev-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      
      // Use AIS as primary for APK to ensure Express routes are present
      const fallbackUrl = aisUrl;
      console.log('[Config] Native/Local origin detected. Origin:', origin, '| Using Backend:', fallbackUrl);
      return fallbackUrl;
    }
  }

  return '';
};
