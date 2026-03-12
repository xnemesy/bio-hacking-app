// Card acqua con progress bar verso obiettivo 2500 ml
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const OBIETTIVO_ML = 2500;

interface Props {
  acquaMl: number;
}

export default function AcquaCard({ acquaMl }: Props): React.JSX.Element {
  const percentuale = Math.min(acquaMl / OBIETTIVO_ML, 1);
  const raggiunto = acquaMl >= OBIETTIVO_ML;
  const coloreBar = raggiunto ? '#4A6741' : acquaMl >= 1500 ? '#D4A84B' : '#3A6EA5';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.titolo}>💧 Acqua</Text>
        <Text style={[styles.valore, { color: raggiunto ? '#5DB85D' : '#FFFFFF' }]}>
          {acquaMl} / {OBIETTIVO_ML} ml
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barContenitore}>
        <View
          style={[
            styles.barRiempimento,
            { width: `${Math.round(percentuale * 100)}%`, backgroundColor: coloreBar },
          ]}
        />
      </View>

      <Text style={styles.percentuale}>
        {raggiunto ? '✅ Obiettivo raggiunto!' : `${Math.round(percentuale * 100)}% dell'obiettivo`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titolo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  valore: {
    fontSize: 15,
    fontWeight: '700',
  },
  barContenitore: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barRiempimento: {
    height: '100%',
    borderRadius: 4,
  },
  percentuale: {
    fontSize: 12,
    color: '#888888',
  },
});
