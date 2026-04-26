import * as LocalAuthentication from 'expo-local-authentication';
import { updateMobileDeviceProfile } from './data';
import { reportMobileError } from './monitoring';

export const deviceSupportsBiometrics = async () => {
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch {
    return false;
  }
};

export const authenticateSessionUnlock = async (userId: string) => {
  try {
    const supported = await deviceSupportsBiometrics();
    if (!supported) return { ok: true, supported: false };

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock CarbonTrace Mobile',
      promptSubtitle: 'Use your device biometrics to continue.',
      cancelLabel: 'Use app later',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await updateMobileDeviceProfile(userId, {
        biometricProtected: true,
        lastAuthAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const errorMessage = 'error' in result ? result.error : undefined;
    return { ok: result.success, supported: true, error: errorMessage };
  } catch (error) {
    await reportMobileError({
      source: 'biometric-auth',
      error,
      context: { userId },
      severity: 'warning',
    });
    return { ok: false, supported: false, error: error instanceof Error ? error.message : 'Biometric auth failed.' };
  }
};
