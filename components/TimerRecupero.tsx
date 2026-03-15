// Timer recupero 60 secondi con haptic feedback e notifica background
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

const DURATA_SEC = 60;
const NOTIF_ID_KEY = 'timer-recupero';

// Configura come le notifiche vengono mostrate quando l'app è in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Schedula una notifica locale dopo `secondi` secondi */
async function schedulaNotifica(secondi: number): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏱️ Recupero terminato!',
        body: 'Inizia il prossimo superset 💪',
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondi },
    });
    return id;
  } catch {
    return null;
  }
}

async function cancellaNotifica(id: string | null): Promise<void> {
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignora errori di cancellazione
    }
  }
}

export default function TimerRecupero(): React.JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState(DURATA_SEC);
  const [isRunning, setIsRunning] = useState(false);
  const notifIdRef = useRef<string | null>(null);
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
      void cancellaNotifica(notifIdRef.current);
      notifIdRef.current = null;
      setIsRunning(false);
      setSecondsLeft(DURATA_SEC); // auto-reset
    }
  }, [secondsLeft, isRunning]);

  const avvia = useCallback(async () => {
    setSecondsLeft(DURATA_SEC);
    setIsRunning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    notifIdRef.current = await schedulaNotifica(DURATA_SEC);
  }, []);

  const annulla = useCallback(async () => {
    setIsRunning(false);
    setSecondsLeft(DURATA_SEC);
    await cancellaNotifica(notifIdRef.current);
    notifIdRef.current = null;
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
