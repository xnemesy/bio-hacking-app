// Schermata pasti: log nutrizionale con CRUD completo
import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import PastoCard from '../../components/PastoCard';
import AggiuntaPastoModal from '../../components/AggiuntaPastoModal';
import { useGiorno } from '../../hooks/useGiorno';
import { usePasti } from '../../hooks/usePasti';
import { caloriePasto } from '../../lib/calcoli';
import type { Pasto, TipoPasto } from '../../types/index';

// ─── Ordine e raggruppamento ──────────────────────────────────────────────────

const ORDINE_TIPI: TipoPasto[] = [
  'colazione',
  'spuntino_1_am',
  'spuntino_2_am',
  'pranzo',
  'spuntino_3_pm',
  'cena',
];

const TIPO_LABEL: Record<TipoPasto, string> = {
  colazione: '☀️ Colazione',
  spuntino_1_am: '🍎 Spuntino AM',
  spuntino_2_am: '🥜 Spuntino AM 2',
  pranzo: '🍽️ Pranzo',
  spuntino_3_pm: '🥝 Spuntino PM',
  cena: '🌙 Cena',
};

interface Sezione {
  title: string;
  data: Pasto[];
}

function raggruppa(pasti: Pasto[]): Sezione[] {
  const mappa = new Map<TipoPasto, Pasto[]>();
  for (const p of pasti) {
    const lista = mappa.get(p.tipo_pasto) ?? [];
    lista.push(p);
    mappa.set(p.tipo_pasto, lista);
  }
  return ORDINE_TIPI
    .filter((t) => mappa.has(t))
    .map((t) => ({ title: TIPO_LABEL[t], data: mappa.get(t) ?? [] }));
}

// ─── Schermata ────────────────────────────────────────────────────────────────

export default function PastiScreen(): React.JSX.Element {
  const [modalVisibile, setModalVisibile] = useState(false);

  // useGiorno per ottenere l'id del giorno corrente
  const { giorno, loading: loadingGiorno, aggiorna: aggiornaGiorno } = useGiorno();

  // usePasti per il CRUD
  const { pasti, totali, loading: loadingPasti, salvando, error, aggiorna, aggiungiPasto, eliminaPasto } =
    usePasti(giorno?.id ?? null);

  // Ricarica quando il tab diventa attivo
  useFocusEffect(
    React.useCallback(() => {
      void aggiornaGiorno().then(() => {
        if (giorno) void aggiorna();
      });
    }, [aggiornaGiorno, aggiorna, giorno])
  );

  const sezioni = raggruppa(pasti);
  const loading = loadingGiorno || loadingPasti;

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky header calorie totali */}
      <View style={styles.stickyHeader}>
        <View>
          <Text style={styles.headerTitolo}>🍽️ Pasti</Text>
          {error !== null && <Text style={styles.errore}>{error}</Text>}
        </View>
        <View style={styles.calorieBadge}>
          <Text style={styles.calorieValore}>{Math.round(totali.calorie_totali)}</Text>
          <Text style={styles.calorieUnita}>kcal</Text>
        </View>
      </View>

      {/* Macro mini-barra */}
      <View style={styles.macroBarra}>
        <MacroPill label="P" valore={totali.proteine_totali} colore="#5DB85D" />
        <MacroPill label="C" valore={totali.carboidrati_totali} colore="#D4A84B" />
        <MacroPill label="G" valore={totali.grassi_totali} colore="#D45B5B" />
        <MacroPill label="💧" valore={totali.acqua_totale} colore="#3A6EA5" unita="ml" />
        {totali.omega3_preso && <Text style={styles.omega3Ok}>🐟 ω3 ✓</Text>}
      </View>

      {loading && pasti.length === 0 ? (
        <ActivityIndicator size="large" color="#4A6741" style={styles.loader} />
      ) : (
        <SectionList
          sections={sezioni}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <PastoCard pasto={item} onElimina={eliminaPasto} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sezioneHeader}>
              <Text style={styles.sezioneTitolo}>{section.title}</Text>
              <Text style={styles.sezioneKcal}>
                {Math.round(
                  section.data.reduce(
                    (acc, p) => acc + caloriePasto(p.proteine_g, p.carboidrati_g, p.grassi_g),
                    0
                  )
                )}{' '}
                kcal
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.vuoto}>
              <Text style={styles.vuotoTesto}>Nessun pasto registrato oggi</Text>
              <Text style={styles.vuotoSub}>Tocca + per aggiungere il primo</Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, salvando && styles.fabDisabilitato]}
        onPress={() => setModalVisibile(true)}
        disabled={salvando || !giorno}
        activeOpacity={0.8}
      >
        {salvando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="add" size={28} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      {/* Modal aggiunta */}
      {giorno !== null && (
        <AggiuntaPastoModal
          visibile={modalVisibile}
          giornoId={giorno.id}
          onChiudi={() => setModalVisibile(false)}
          onSalva={aggiungiPasto}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Sotto-componenti ─────────────────────────────────────────────────────────

interface MacroPillProps {
  label: string;
  valore: number;
  colore: string;
  unita?: string;
}

function MacroPill({ label, valore, colore, unita = 'g' }: MacroPillProps): React.JSX.Element {
  return (
    <View style={styles.macroPill}>
      <Text style={[styles.macroPillLabel, { color: colore }]}>{label}</Text>
      <Text style={styles.macroPillValore}>
        {Math.round(valore)}
        <Text style={styles.macroPillUnita}>{unita}</Text>
      </Text>
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitolo: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  errore: { fontSize: 12, color: '#D45B5B', marginTop: 2 },
  calorieBadge: { alignItems: 'flex-end' },
  calorieValore: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  calorieUnita: { fontSize: 11, color: '#888888' },
  macroBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  macroPill: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  macroPillLabel: { fontSize: 11, fontWeight: '700' },
  macroPillValore: { fontSize: 13, color: '#CCCCCC', fontWeight: '600' },
  macroPillUnita: { fontSize: 10, color: '#666666' },
  omega3Ok: { marginLeft: 'auto', fontSize: 12, color: '#5DB85D', fontWeight: '600' },
  loader: { flex: 1 },
  lista: { padding: 12, gap: 8, paddingBottom: 100 },
  sezioneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sezioneTitolo: { fontSize: 14, fontWeight: '600', color: '#888888' },
  sezioneKcal: { fontSize: 12, color: '#555555' },
  vuoto: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  vuotoTesto: { fontSize: 16, color: '#555555', fontWeight: '600' },
  vuotoSub: { fontSize: 13, color: '#444444' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4A6741',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabilitato: { backgroundColor: '#333333' },
});
