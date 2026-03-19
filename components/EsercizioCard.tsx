// Card singolo esercizio con input carichi, volume live e indicatori delta
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { volumeEsercizio } from '../lib/calcoli';
import type { EsercizioLog } from '../types/index';

interface PreviousCarico {
  carico_a_kg: number;
  carico_b_kg: number;
}

interface Props {
  esercizio: EsercizioLog;
  accentColor?: string;
  previousCarico?: PreviousCarico;
  onUpdateCarico: (id: string, caricoA: number, caricoB: number) => Promise<void>;
}

function parseKg(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) || n < 0 ? 0 : n;
}

function formatKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function getDeltaIndicator(
  current: number,
  previous: number | undefined
): { text: string; color: string } | null {
  if (previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return { text: `← ${formatKg(previous)}kg`, color: '#94a3b8' };
  if (delta > 0) return { text: `↑ +${formatKg(delta)}kg`, color: '#10b981' };
  return { text: `↓ ${formatKg(delta)}kg`, color: '#f59e0b' };
}

export default function EsercizioCard({
  esercizio,
  accentColor = '#4A6741',
  previousCarico,
  onUpdateCarico,
}: Props): React.JSX.Element {
  const [caricoA, setCaricoA] = useState(
    esercizio.carico_a_kg > 0 ? String(esercizio.carico_a_kg) : ''
  );
  const [caricoB, setCaricoB] = useState(
    esercizio.carico_b_kg > 0 ? String(esercizio.carico_b_kg) : ''
  );

  const volume = volumeEsercizio(
    esercizio.serie,
    esercizio.reps,
    parseKg(caricoA),
    parseKg(caricoB)
  );

  const handleBlur = useCallback(() => {
    void onUpdateCarico(esercizio.id, parseKg(caricoA), parseKg(caricoB));
  }, [esercizio.id, caricoA, caricoB, onUpdateCarico]);

  const deltaA = getDeltaIndicator(parseKg(caricoA), previousCarico?.carico_a_kg);
  const deltaB = getDeltaIndicator(parseKg(caricoB), previousCarico?.carico_b_kg);

  return (
    <View style={styles.card}>
      {/* Nome + info serie */}
      <View style={styles.rigaTop}>
        <Text style={[styles.nomeEsercizio, { color: accentColor }]} numberOfLines={2}>
          {esercizio.nome_esercizio}
        </Text>
        <Text style={styles.serieReps}>
          {esercizio.serie}×{esercizio.reps}
        </Text>
      </View>

      {/* Input carichi */}
      <View style={styles.rigaCarichi}>
        <CaricoInput
          label="Kg A"
          valore={caricoA}
          onChange={setCaricoA}
          onBlur={handleBlur}
          accentColor={accentColor}
          deltaInfo={deltaA}
        />
        <CaricoInput
          label="Kg B"
          valore={caricoB}
          onChange={setCaricoB}
          onBlur={handleBlur}
          accentColor={accentColor}
          deltaInfo={deltaB}
        />
        <View style={styles.volumeBox}>
          <Text style={styles.volumeLabel}>Vol.</Text>
          <Text style={styles.volumeValore}>
            {volume > 0 ? `${Math.round(volume)}` : '—'}
          </Text>
          <Text style={styles.volumeUnita}>kg</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Sub-componente input carico ─────────────────────────────────────────────

interface CaricoInputProps {
  label: string;
  valore: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  accentColor: string;
  deltaInfo?: { text: string; color: string } | null;
}

function CaricoInput({ label, valore, onChange, onBlur, accentColor, deltaInfo }: CaricoInputProps): React.JSX.Element {
  return (
    <View style={styles.caricoBox}>
      <Text style={[styles.caricoLabel, { color: accentColor }]}>{label}</Text>
      <TextInput
        style={styles.caricoInput}
        value={valore}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder="0"
        placeholderTextColor="#444444"
        keyboardType="decimal-pad"
        returnKeyType="done"
      />
      {deltaInfo != null && (
        <Text style={[styles.deltaLabel, { color: deltaInfo.color }]}>
          {deltaInfo.text}
        </Text>
      )}
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingVertical: 8,
  },
  rigaTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  nomeEsercizio: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  serieReps: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '600',
    marginTop: 2,
  },
  rigaCarichi: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  caricoBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  caricoLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  caricoInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  deltaLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  volumeBox: {
    alignItems: 'center',
    minWidth: 56,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  volumeLabel: {
    fontSize: 10,
    color: '#555555',
    textTransform: 'uppercase',
  },
  volumeValore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CCCCCC',
  },
  volumeUnita: {
    fontSize: 10,
    color: '#555555',
  },
});
