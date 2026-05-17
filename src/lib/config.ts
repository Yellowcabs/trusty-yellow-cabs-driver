export const getBaseUrl = () => {
  // Environment variable override
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // If we are on the web (and not on local preview/APK), use current origin
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }

  // Fallback production URL for APK or local environments
  return 'https://trusty-yellow-cabs-driver.vercel.app';
};