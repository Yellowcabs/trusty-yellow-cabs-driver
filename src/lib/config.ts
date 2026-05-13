export const getBaseUrl = () => {
  // ENV URL
  const envUrl = import.meta.env.VITE_BACKEND_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // USE ONLY VERCEL DOMAIN
  const baseUrl =
    'https://trusty-yellow-cabs-driver.vercel.app';

  console.log(
    '[Config] Using Backend:',
    baseUrl
  );

  return baseUrl;
};