
export const getBaseUrl = () => {
  // If we are in Capacitor, we need the full URL to the backend
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    // This should be your production backend URL
    // For now, we use the current origin if it's not capacitor://
    // In actual production, you'd replace this with your real server URL
    return 'https://ais-dev-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app';
  }
  return '';
};
