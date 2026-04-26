import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { loginWithEmail, signupWithEmail } from '../services/data';
import { UserRole } from '../types';
import {
  AuthCard,
  AuthHeader,
  FeatureChip,
  Field,
  ModeChip,
  sharedInputStyles,
} from '../components/ui';
import { palette } from '../theme';
import { reportMobileError } from '../services/monitoring';

type AuthMode = 'login' | 'signup';

export const AuthScreen = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('exporter');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter your email and password first.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Missing name', 'Add your full name to create the account.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        await signupWithEmail(email.trim(), password, role, name.trim());
      }
    } catch (error) {
      void reportMobileError({
        source: 'auth-submit',
        error,
        context: { mode, role, email: email.trim() },
      });
      Alert.alert('Auth failed', error instanceof Error ? error.message : 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <AuthHeader />

      <View style={sharedInputStyles.modeSwitch}>
        <ModeChip active={mode === 'login'} label="Login" onPress={() => setMode('login')} />
        <ModeChip active={mode === 'signup'} label="Create Account" onPress={() => setMode('signup')} />
      </View>

      {mode === 'signup' && (
        <Field label="Name">
          <TextInput
            style={sharedInputStyles.input}
            placeholder="Prince Kumar"
            placeholderTextColor={palette.muted}
            value={name}
            onChangeText={setName}
          />
        </Field>
      )}

      <Field label="Email">
        <TextInput
          style={sharedInputStyles.input}
          placeholder="you@example.com"
          placeholderTextColor={palette.muted}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
      </Field>

      <Field label="Password">
        <TextInput
          style={sharedInputStyles.input}
          placeholder="Password"
          placeholderTextColor={palette.muted}
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />
      </Field>

      {mode === 'signup' && (
        <Field label="Role">
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {(['exporter', 'verifier', 'importer'] as UserRole[]).map((item) => (
              <ModeChip key={item} compact active={role === item} label={item} onPress={() => setRole(item)} />
            ))}
          </View>
        </Field>
      )}

      <Pressable
        style={({ pressed }) => [sharedInputStyles.primaryButton, pressed && sharedInputStyles.buttonPressed]}
        onPress={submit}
        disabled={busy}
      >
        {busy ? <ActivityIndicator color={palette.text} /> : <Text style={sharedInputStyles.primaryButtonText}>{mode === 'login' ? 'Enter App' : 'Create Account'}</Text>}
      </Pressable>

      <View style={{ gap: 10 }}>
        <FeatureChip icon="map-pin" title="Plot capture" subtitle="GPS and map-first provenance" />
        <FeatureChip icon="check-circle" title="Fast decisions" subtitle="Approve or clarify from the queue" />
        <FeatureChip icon="package" title="Package access" subtitle="Importer-ready evidence on mobile" />
      </View>
    </AuthCard>
  );
};
