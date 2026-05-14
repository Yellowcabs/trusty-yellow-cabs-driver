import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trustycab.driver',
  appName: 'Trusty Cab',

  webDir: 'dist',

  server: {
    androidScheme: 'https',
    url: 'https://trusty-yellow-cabs-driver.vercel.app',
    cleartext: false,
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;