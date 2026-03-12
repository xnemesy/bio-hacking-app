// Card riepilogo calorie: ingerite / BMR / consumate / bilancio
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { bilancioGiornaliero } from '../lib/calcoli';

interface Props {
  calIngerite: number;
  calConsumate: number;
  bmr: number;
}

interface RigaProps {
  label: string;
  valore: number;
  colore?: string;
  grassetto?: boolean;
}

function Riga({ label, valore, colore = '#CCCCCC', grassetto = false }: RigaProps): React.JSX.Element {
  return (
    <View style={styles.riga}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.valore, { color: colore, fontWeight: grassetto ? '700' : '400' }]}>
        {Math.round(valore)} kcal
      </Text>
    </View>
  );
}

export default function CalorieCard({ calIngerite, calConsumate, bmr }: Props): React.JSX.Element {
  const bilancio = bilancioGiornaliero(calIngerite, calConsumate, bmr);
  const coloreBilancio = bilancio > 200 ? '#D45B5B' : bilancio < -200 ? '#5DB85D' : '#D4A84B';

  return (
    <View style={styles.card}>
      <Text style={styles.titolo}>Calorie</Text>
      <View style={styles.separatore} />
      <Riga label="Ingerite" valore={calIngerite} colore="#FFFFFF" />
      <Riga label="BMR" valore={bmr} colore="#888888" />
      <Riga label="Consumate" valore={calConsumate} colore="#5DB85D" />
      <View style={styles.separatore} />
      <Riga
        label="Bilancio"
        valore={bilancio}
        colore={coloreBilancio}
        grassetto
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  titolo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  separatore: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 4,
  },
  riga: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    color: '#CCCCCC',
  },
  valore: {
    fontSize: 15,
  },
});
