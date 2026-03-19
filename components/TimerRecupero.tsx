// Timer recupero 60 secondi con haptic feedback visivo
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

const DURATA_SEC = 60;

export default function TimerRecupero(): React.JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState(DURATA_SEC);
  const [isRunning, setIsRunning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Effetto pulse quando il timer è attivo
  useEffect(() => {
    if (!isRunning) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isRunning, pulseAnim]);

  // Countdown
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Completamento timer
  useEffect(() => {
    if (isRunning && secondsLeft === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRunning(false);
      setSecondsLeft(DURATA_SEC); // auto-reset
    }
  }, [secondsLeft, isRunning]);

  const avvia = useCallback(async () => {
    setSecondsLeft(DURATA_SEC);
    setIsRunning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const annulla = useCallback(async () => {
    setIsRunning(false);
    setSecondsLeft(DURATA_SEC);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Colore in base al tempo rimasto
  const colore =
    secondsLeft > 30 ? '#4A6741' : secondsLeft > 10 ? '#D4A84B' : '#D45B5B';

  if (!isRunning) {
    return (
      <TouchableOpacity style={styles.btnAvvia} onPress={() => void avvia()}>
        <Text style={styles.btnAvviaTesto}>⏱️  Recupero  {DURATA_SEC}s</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.cerchio, { borderColor: colore }, { transform: [{ scale: pulseAnim }] }]}
      >
        <Text style={[styles.countdown, { color: colore }]}>{secondsLeft}</Text>
        <Text style={styles.secondoLabel}>sec</Text>
      </Animated.View>
      <TouchableOpacity onPress={() => void annulla()} style={styles.btnAnnulla}>
        <Text style={styles.btnAnnullaTesto}>■ Annulla</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  btnAvvia: {
    alignSelf: 'center',
    backgroundColor: '#1E2E1E',
    borderWidth: 1,
    borderColor: '#4A6741',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginVertical: 8,
  },
  btnAvviaTesto: {
    fontSize: 13,
    color: '#4A6741',
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  cerchio: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  countdown: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 38,
  },
  secondoLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: -2,
  },
  btnAnnulla: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  btnAnnullaTesto: {
    fontSize: 13,
    color: '#666666',
  },
});
