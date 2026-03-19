// Card gruppo esercizi: superset (bordo colorato) o esercizio singolo
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import EsercizioCard from './EsercizioCard';
import SwipeableCard from './SwipeableCard';
import type { EsercizioLog, UUID } from '../types/index';
import type { GruppoEsercizi } from '../hooks/useSessione';
import type { LastCarichi } from '../store/lastSessionStore';

// Palette colori per superset multipli
const SUPERSET_COLORS = [
  '#4A6741', // verde
  '#3A6EA5', // blu
  '#A55A3A', // arancio
  '#6A3AA5', // viola
  '#A5853A', // oro
  '#3AA5A5', // teal
  '#A53A6A', // rosa
] as const;

interface Props {
  gruppo: GruppoEsercizi;
  indice: number;
  lastCarichi?: LastCarichi;
  onUpdateCarico: (id: string, caricoA: number, caricoB: number) => Promise<void>;
  onDeleteEsercizio: (id: UUID) => Promise<void>;
  onDuplicaEsercizio: (esercizio: EsercizioLog) => Promise<void>;
}

export default function SupersetCard({ gruppo, indice, lastCarichi, onUpdateCarico, onDeleteEsercizio, onDuplicaEsercizio }: Props): React.JSX.Element {
  const accent = SUPERSET_COLORS[indice % SUPERSET_COLORS.length] ?? '#4A6741';
  const isSuperset = gruppo.tipo === 'superset';

  return (
    <View
      style={[
        styles.card,
        isSuperset
          ? { borderLeftColor: accent, borderLeftWidth: 3 }
          : styles.cardSingolo,
      ]}
    >
      {/* Header gruppo */}
      <View style={styles.header}>
        <Text style={[styles.labelTesto, { color: isSuperset ? accent : '#666666' }]}>
          {isSuperset ? `⚡ ${gruppo.label}` : gruppo.label}
        </Text>
        {isSuperset && (
          <Text style={styles.supersetBadge}>SUPERSET</Text>
        )}
      </View>

      {/* Separatore */}
      <View style={[styles.separatore, { backgroundColor: isSuperset ? accent + '33' : '#2A2A2A' }]} />

      {/* Esercizi */}
      {gruppo.esercizi.map((esercizio, idx) => (
        <React.Fragment key={esercizio.id}>
          {idx > 0 && <View style={styles.esercizioSeparatore} />}
          <SwipeableCard
            onDelete={() => onDeleteEsercizio(esercizio.id)}
            onDuplicate={() => onDuplicaEsercizio(esercizio)}
            deleteLabel="Rimuovi"
            duplicateLabel="Duplica"
            confirmDelete={true}
          >
            <EsercizioCard
              esercizio={esercizio}
              accentColor={accent}
              previousCarico={lastCarichi?.[esercizio.nome_esercizio]}
              onUpdateCarico={onUpdateCarico}
            />
          </SwipeableCard>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#242424',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardSingolo: {
    borderLeftWidth: 3,
    borderLeftColor: '#3A3A3A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelTesto: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supersetBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  separatore: {
    height: 1,
    marginBottom: 4,
  },
  esercizioSeparatore: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 4,
  },
});
