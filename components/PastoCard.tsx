// Card singolo pasto con macro, calorie e delete button
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { caloriePasto } from '../lib/calcoli';
import type { Pasto, TipoPasto } from '../types/index';

interface Props {
  pasto: Pasto;
  onElimina: (id: string) => Promise<void>;
}

const TIPO_EMOJI: Record<TipoPasto, string> = {
  colazione: '☀️',
  spuntino_1_am: '🍎',
  spuntino_2_am: '🥜',
  pranzo: '🍽️',
  spuntino_3_pm: '🥝',
  cena: '🌙',
};

const TIPO_LABEL: Record<TipoPasto, string> = {
  colazione: 'Colazione',
  spuntino_1_am: 'Spuntino AM',
  spuntino_2_am: 'Spuntino AM 2',
  pranzo: 'Pranzo',
  spuntino_3_pm: 'Spuntino PM',
  cena: 'Cena',
};

const PORZIONE_LABEL: Record<string, string> = {
  pesato: '⚖️',
  stimato: '👁️',
  non_rispettato: '❌',
};

export default function PastoCard({ pasto, onElimina }: Props): React.JSX.Element {
  const [eliminando, setEliminando] = useState(false);

  const kcal = caloriePasto(pasto.proteine_g, pasto.carboidrati_g, pasto.grassi_g);

  const handleElimina = (): void => {
    Alert.alert(
      'Elimina pasto',
      `Elimina ${TIPO_LABEL[pasto.tipo_pasto]}${pasto.nome ? ` — ${pasto.nome}` : ''}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            setEliminando(true);
            void onElimina(pasto.id).finally(() => setEliminando(false));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Riga superiore: emoji tipo + nome + delete */}
      <View style={styles.rigaTop}>
        <Text style={styles.emoji}>{TIPO_EMOJI[pasto.tipo_pasto]}</Text>
        <View style={styles.info}>
          <Text style={styles.tipo}>{TIPO_LABEL[pasto.tipo_pasto]}</Text>
          {pasto.nome !== null && pasto.nome !== '' && (
            <Text style={styles.nome} numberOfLines={1}>
              {pasto.nome}
            </Text>
          )}
        </View>
        <View style={styles.rigaDestra}>
          {PORZIONE_LABEL[pasto.porzione] !== undefined && (
            <Text style={styles.porzioneIcon}>{PORZIONE_LABEL[pasto.porzione]}</Text>
          )}
          {pasto.omega3 && <Text style={styles.omega3Icon}>🐟</Text>}
          <TouchableOpacity
            onPress={handleElimina}
            disabled={eliminando}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={eliminando ? '#555555' : '#D45B5B'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Riga macro */}
      <View style={styles.macroRiga}>
        <MacroTag label="P" valore={pasto.proteine_g} colore="#5DB85D" />
        <MacroTag label="C" valore={pasto.carboidrati_g} colore="#D4A84B" />
        <MacroTag label="G" valore={pasto.grassi_g} colore="#D45B5B" />
        <Text style={styles.kcal}>{Math.round(kcal)} kcal</Text>
      </View>

      {/* Acqua se presente */}
      {pasto.acqua_ml > 0 && (
        <Text style={styles.acqua}>💧 {pasto.acqua_ml} ml</Text>
      )}
    </View>
  );
}

interface MacroTagProps {
  label: string;
  valore: number;
  colore: string;
}

function MacroTag({ label, valore, colore }: MacroTagProps): React.JSX.Element {
  return (
    <View style={styles.macroTag}>
      <Text style={[styles.macroLabel, { color: colore }]}>{label}</Text>
      <Text style={styles.macroValore}>{valore}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  rigaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  tipo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nome: {
    fontSize: 12,
    color: '#888888',
  },
  rigaDestra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  porzioneIcon: {
    fontSize: 14,
  },
  omega3Icon: {
    fontSize: 14,
  },
  macroRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroTag: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'baseline',
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  macroValore: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  kcal: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  acqua: {
    fontSize: 12,
    color: '#3A6EA5',
  },
});
