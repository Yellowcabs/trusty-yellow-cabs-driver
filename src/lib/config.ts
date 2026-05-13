
export const getBaseUrl = () => {
  // 1. Explicitly check for environment variable (VITE_API_URL or VITE_BACKEND_URL)
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  // 2. Browser Environment Detection
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge || navigator.userAgent.includes('Capacitor') || window.location.protocol === 'capacitor:';
    
    // In Capacitor/APK, we MUST point to a real external URL, not localhost
    if (isCapacitor) {
      // Default production URL for AIS environment
      const aiStudioUrl = 'https://ais-pre-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      
      // If the current window.location contains a hints about the production domain, use it
      if (window.location.hostname && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
         return window.location.origin;
      }

      return aiStudioUrl;
    }

    // Standard web - use current origin
    return window.location.origin;
  }

  return '';
};
