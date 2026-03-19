// Schermata di login — accesso personale con email/password Supabase
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const COLORS = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  input: '#242424',
  accent: '#22C55E',
  testo: '#F5F5F0',
  testoSfumato: '#888888',
  errore: '#EF4444',
  bordo: '#2A2A2A',
} as const;

export default function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const handleLogin = async (): Promise<void> => {
    if (email.trim() === '' || password === '') {
      setErrore('Inserisci email e password.');
      return;
    }
    setLoading(true);
    setErrore(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrore(error.message);
      setLoading(false);
    }
    // Se successo: onAuthStateChange in _layout.tsx aggiorna la sessione
    // e mostra i tab automaticamente — non serve navigare manualmente
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo / Titolo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>💪</Text>
          <Text style={styles.titolo}>Bio-Hacking</Text>
          <Text style={styles.sottotitolo}>Accesso personale</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={COLORS.testoSfumato}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={COLORS.testoSfumato}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void handleLogin()}
            editable={!loading}
          />

          {errore !== null && (
            <Text style={styles.errore}>{errore}</Text>
          )}

          <TouchableOpacity
            style={[styles.btnAccedi, loading && styles.btnAccediDisabilitato]}
            onPress={() => void handleLogin()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnAccediTesto}>Accedi</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  kav: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  logoEmoji: {
    fontSize: 56,
  },
  titolo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.testo,
    letterSpacing: -0.5,
  },
  sottotitolo: {
    fontSize: 14,
    color: COLORS.testoSfumato,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.bordo,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.testo,
    borderWidth: 1,
    borderColor: COLORS.bordo,
  },
  errore: {
    fontSize: 13,
    color: COLORS.errore,
    textAlign: 'center',
  },
  btnAccedi: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnAccediDisabilitato: {
    backgroundColor: '#2A2A2A',
  },
  btnAccediTesto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
