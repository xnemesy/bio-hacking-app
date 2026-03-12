// Badge semaforo 🟢🟡🔴 con etichetta testuale
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statoGiorno } from '../lib/calcoli';
import type { StatoGiorno } from '../types/index';

interface Props {
  bilancio: number;
  acquaMl: number;
}

const ETICHETTA: Record<StatoGiorno, string> = {
  '🟢': 'Giornata ottimale',
  '🟡': 'Nella media',
  '🔴': 'Fuori target',
};

const COLORE_BG: Record<StatoGiorno, string> = {
  '🟢': '#1E3A1E',
  '🟡': '#3A3019',
  '🔴': '#3A1E1E',
};

const COLORE_TESTO: Record<StatoGiorno, string> = {
  '🟢': '#5DB85D',
  '🟡': '#D4A84B',
  '🔴': '#D45B5B',
};

export default function StatoBadge({ bilancio, acquaMl }: Props): React.JSX.Element {
  const stato = statoGiorno(bilancio, acquaMl);

  return (
    <View style={[styles.badge, { backgroundColor: COLORE_BG[stato] }]}>
      <Text style={styles.emoji}>{stato}</Text>
      <Text style={[styles.etichetta, { color: COLORE_TESTO[stato] }]}>
        {ETICHETTA[stato]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  emoji: {
    fontSize: 18,
  },
  etichetta: {
    fontSize: 14,
    fontWeight: '600',
  },
});
