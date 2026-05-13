export const getBaseUrl = () => {
  // ENV URL (optional override)
  const envUrl = import.meta.env.VITE_BACKEND_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // ✅ FIX: use current origin for WEB + APK (Capacitor safe)
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : '';

  console.log('[Config] Using Backend:', baseUrl);

  return baseUrl;
};