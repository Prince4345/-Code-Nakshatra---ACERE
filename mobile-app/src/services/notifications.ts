import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateMobileDeviceProfile } from './data';
import { reportMobileError } from './monitoring';

const PROJECT_ID = '423487d9-0ce2-4615-b300-281d016b7332';
const ANDROID_CHANNEL_ID = 'carbontrace-workflow';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Workflow Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#3e77ff',
  });
};

export const registerForPushNotifications = async (userId: string) => {
  try {
    await ensureAndroidChannel();

    if (!Device.isDevice) {
      await updateMobileDeviceProfile(userId, {
        pushStatus: 'unavailable',
        deviceName: 'Simulator',
      });
      return null;
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;
    if (permissions.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      await updateMobileDeviceProfile(userId, {
        pushStatus: 'denied',
        updatedAt: new Date().toISOString(),
      });
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    await updateMobileDeviceProfile(userId, {
      expoPushToken: token.data,
      pushStatus: 'granted',
      deviceName: Device.deviceName ?? Platform.OS,
      updatedAt: new Date().toISOString(),
    });
    return token.data;
  } catch (error) {
    await reportMobileError({
      source: 'push-registration',
      error,
      context: { userId, platform: Platform.OS },
      severity: 'warning',
    });
    return null;
  }
};

export const sendLocalNotification = async ({
  title,
  body,
}: {
  title: string;
  body: string;
}) => {
  try {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
      },
      trigger: null,
    });
  } catch {
    // Local alerts should never block product flows.
  }
};
