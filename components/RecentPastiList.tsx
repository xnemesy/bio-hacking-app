// Lista orizzontale scrollabile dei pasti recenti per un dato tipo_pasto
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import type { RecentPasto } from '../store/recentPastiStore';
import type { TipoPasto } from '../types/index';

interface Props {
  tipoPasto: TipoPasto;
  recenti: RecentPasto[];
  onSelect: (pasto: RecentPasto) => void;
}

function kcalDa(p: RecentPasto): number {
  return p.proteine_g * 4 + p.carboidrati_g * 4 + p.grassi_g * 9;
}

function macroCompatto(p: RecentPasto): string {
  return `P${Math.round(p.proteine_g)} C${Math.round(p.carboidrati_g)} G${Math.round(p.grassi_g)}`;
}

export default function RecentPastiList({ tipoPasto: _tipoPasto, recenti, onSelect }: Props): React.JSX.Element | null {
  if (recenti.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.titolo}>RECENTI</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={recenti}
        keyExtractor={(item, index) =>
          `${item.tipo_pasto}-${item.nome ?? ''}-${item.proteine_g}-${index}`
        }
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelect(item)} activeOpacity={0.75}>
            <View style={styles.cardHeader}>
              <Text style={styles.nomeLabel} numberOfLines={1}>
                {item.nome ?? 'Pasto personalizzato'}
              </Text>
              {item.use_count > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTesto}>×{item.use_count}</Text>
                </View>
              )}
            </View>
            <Text style={styles.macro}>{macroCompatto(item)}</Text>
            <Text style={styles.kcal}>{Math.round(kcalDa(item))} kcal</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  titolo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lista: { gap: 8, paddingHorizontal: 2 },
  card: {
    width: 160,
    height: 80,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nomeLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#DDDDDD',
  },
  badge: {
    backgroundColor: '#4A6741',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeTesto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  macro: {
    fontSize: 11,
    color: '#888888',
    fontVariant: ['tabular-nums'],
  },
  kcal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
  },
});
