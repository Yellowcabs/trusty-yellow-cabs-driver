import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trustycab.driver',

  appName: 'Trusty Cab',

  webDir: 'dist',

  server: {
    url: 'https://trusty-yellow-cabs-driver.vercel.app/',

    androidScheme: 'https',

    allowNavigation: ['*'],

    cleartext: true,
  },

  android: {
    allowMixedContent: true,

    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },

    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;