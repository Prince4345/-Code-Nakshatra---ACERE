const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'your_google_maps_mobile_api_key';

export default {
  expo: {
    name: 'CarbonTrace Mobile',
    slug: 'carbontrace-mobile',
    version: '1.0.2',
    scheme: 'carbontrace',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      imageWidth: 260,
      resizeMode: 'contain',
      backgroundColor: '#06111d',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.carbontrace.mobile',
      buildNumber: '1.0.2',
      config: {
        googleMapsApiKey,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'CarbonTrace uses your location to capture exporter plots in the field.',
        NSFaceIDUsageDescription: 'CarbonTrace uses Face ID to unlock your compliance workspace securely.',
      },
    },
    android: {
      package: 'com.carbontrace.mobile',
      versionCode: 3,
      permissions: [
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.CAMERA',
      ],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#06111d',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      [
        'expo-image-picker',
        {
          cameraPermission: 'CarbonTrace uses the camera to capture invoices, declarations, and proof documents in the field.',
          photosPermission: 'CarbonTrace uses your photos so you can upload evidence from the device library.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'CarbonTrace uses your location to capture exporter plots in the field.',
        },
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'CarbonTrace uses Face ID to protect approved packages and mobile review workflows.',
        },
      ],
      'expo-notifications',
      'expo-font',
    ],
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '423487d9-0ce2-4615-b300-281d016b7332',
      },
    },
    owner: 'prince4345',
  },
};
