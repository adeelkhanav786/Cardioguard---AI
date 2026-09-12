import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cardioguard.ai',
  appName: 'CardioGuard AI',
  webDir: 'dist',
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
