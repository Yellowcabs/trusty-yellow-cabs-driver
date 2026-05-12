import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trustycab.driver',
  appName: 'Trusty Cab',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'ais-dev-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app',
      'ais-pre-uqgore4bofclvpax7gqjqi-242082848033.asia-southeast1.run.app'
    ],
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
