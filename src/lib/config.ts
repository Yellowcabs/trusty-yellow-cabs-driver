
export const getBaseUrl = () => {
  // Check if we have a VITE_BACKEND_URL set in environment
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl;

  // In AIS, we can usually trust the window location for web
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor || (window as any).webkit?.messageHandlers?.bridge;
    
    if (isCapacitor) {
      // In physical APK, we MUST use a full URL. 
      // This is the current dev URL. We fallback to it if no environment variable is set.
      const fallbackUrl = 'https://ais-dev-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
      console.log('[Config] Capacitor detected, using backend:', fallbackUrl);
      return fallbackUrl;
    }
  }

  return '';
};
