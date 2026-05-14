export const getBaseUrl = () => {
  // Environment variable override
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Always use current website origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'https://trusty-yellow-cabs-driver.vercel.app';
};