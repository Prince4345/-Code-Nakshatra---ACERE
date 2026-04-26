import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { subscribeToSession, logoutUser } from './services/data';
import { SessionUser } from './types';
import { AuthScreen } from './screens/AuthScreen';
import { LoadingScreen, sharedInputStyles } from './components/ui';
import { RoleNavigators } from './navigation/RoleNavigators';
import { MobileSyncProvider } from './context/MobileSyncContext';
import { initializeMobileMonitoring } from './services/monitoring';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { authenticateSessionUnlock } from './services/biometrics';
import { registerForPushNotifications } from './services/notifications';
import { palette } from './theme';

enableScreens(true);
enableFreeze(true);
initializeMobileMonitoring();

const LOCK_GRACE_MS = 90_000;

const SessionRuntime = ({
  session,
}: {
  session: SessionUser;
}) => {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const lastUnlockedAt = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const unlockSession = async () => {
    setUnlocking(true);
    const result = await authenticateSessionUnlock(session.id);
    setUnlocking(false);
    if (result.ok) {
      lastUnlockedAt.current = Date.now();
      setLocked(false);
    } else if (result.supported) {
      setLocked(true);
    }
    setReady(true);
  };

  useEffect(() => {
    let disposed = false;

    const bootstrap = async () => {
      await Promise.allSettled([
        registerForPushNotifications(session.id),
        unlockSession(),
      ]);
      if (!disposed) setReady(true);
    };

    void bootstrap();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;
      if (
        previous.match(/inactive|background/) &&
        nextState === 'active' &&
        Date.now() - lastUnlockedAt.current > LOCK_GRACE_MS
      ) {
        void unlockSession();
      }
    });

    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [session.id]);

  if (!ready || unlocking) {
    return <LoadingScreen label="Securing mobile workspace" />;
  }

  if (locked) {
    return (
      <View style={sharedInputStyles.centerStage}>
        <Text style={sharedInputStyles.cardTitle}>Unlock required</Text>
        <Text style={[sharedInputStyles.cardSubtitle, { textAlign: 'center', maxWidth: 280 }]}>
          Re-authenticate with Face ID, fingerprint, or device passcode to open CarbonTrace Mobile.
        </Text>
        <Pressable style={sharedInputStyles.primaryButton} onPress={() => void unlockSession()}>
          <Text style={sharedInputStyles.primaryButtonText}>Unlock app</Text>
        </Pressable>
        <Pressable
          style={[
            sharedInputStyles.actionLink,
            { backgroundColor: palette.panelElevated, paddingHorizontal: 18, paddingVertical: 14 },
          ]}
          onPress={logoutUser}
        >
          <Text style={sharedInputStyles.actionLinkText}>Sign out instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <MobileSyncProvider>
      <RoleNavigators session={session} onLogout={logoutUser} />
    </MobileSyncProvider>
  );
};

export const AppRoot = () => {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSession((next) => {
      setSession(next);
      setBooting(false);
    });
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <StatusBar style="light" />
          {booting ? (
            <LoadingScreen label="Loading CarbonTrace Mobile" />
          ) : !session ? (
            <AuthScreen />
          ) : (
            <SessionRuntime session={session} />
          )}
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
