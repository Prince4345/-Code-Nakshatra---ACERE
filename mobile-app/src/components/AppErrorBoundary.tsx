import React from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../theme';
import { reportMobileError } from '../services/monitoring';

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    void reportMobileError({
      source: 'react-error-boundary',
      error,
      severity: 'fatal',
    });
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
        <LinearGradient colors={[palette.bg, palette.bgAlt, palette.bg]} style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <View
            style={{
              backgroundColor: palette.panelElevated,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: palette.line,
              padding: 24,
              gap: 14,
            }}
          >
            <Text style={{ color: palette.mutedStrong, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' }}>
              CarbonTrace Mobile
            </Text>
            <Text style={{ color: palette.text, fontSize: 28, fontWeight: '800' }}>
              Something broke on this screen.
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              The error has been captured. Try reloading the screen once. If it continues, open the app again.
            </Text>
            <Pressable
              onPress={this.reset}
              style={({ pressed }) => ({
                backgroundColor: palette.brand,
                borderRadius: 18,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>Reload screen</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }
}
