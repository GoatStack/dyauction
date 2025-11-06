// APP_ENV 환경변수로 분기 (LOCAL, PROD, 기본값: PROD)
const APP_ENV = process.env.APP_ENV || 'PROD';

// 환경별 설정
const envConfig = {
  LOCAL: {
    apiBaseUrl: 'http://localhost:65000/api',
    apiTimeout: '10000',
  },
  PROD: {
    apiBaseUrl: 'http://40.82.159.69:65000/api',
    apiTimeout: '10000',
  },
};

const config = envConfig[APP_ENV] || envConfig.PROD;

module.exports = {
  expo: {
    name: 'dyAuction',
    slug: 'dy-auction-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'hs.dukyoung.auction.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.dyauction.dyAuction',
      usesCleartextTraffic: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '6e051219-ed0e-47b7-b638-94b44ff2c9a6',
      },
      // 환경변수를 expo-constants를 통해 앱에서 접근 가능하도록 설정
      apiBaseUrl: config.apiBaseUrl,
      apiTimeout: config.apiTimeout,
      appEnv: APP_ENV,
    },
  },
};
