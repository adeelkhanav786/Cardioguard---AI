import { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: replace this with your actual deployed server.ts URL once hosted
// (e.g. Render, Railway, Fly.io, Cloud Run — anywhere that runs your Node server).
// This is what makes /api/gemini/chat and /api/gemini/scan-prescription keep working
// unchanged: the native app loads your real live site instead of bundled static files.
const DEPLOYED_APP_URL = 'https://cardioguard-ai-production.up.railway.app';

const config: CapacitorConfig = {
  appId: 'com.cardioguard.ai',
  appName: 'CardioGuard AI',
  webDir: 'dist',
  server: {
    url: DEPLOYED_APP_URL,
    cleartext: false
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_heart',
      iconColor: '#dc2626'
    }
  }
};

export default config;
