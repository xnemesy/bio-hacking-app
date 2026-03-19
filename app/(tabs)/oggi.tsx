// Schermata principale: riepilogo giornaliero
import React, { useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import StatoBadge from '../../components/StatoBadge';
import CalorieCard from '../../components/CalorieCard';
import AcquaCard from '../../components/AcquaCard';
import QuickActionsBar from '../../components/QuickActionsBar';
import QuickAddPastoSheet from '../../components/QuickAddPastoSheet';
import { useGiorno } from '../../hooks/useGiorno';
import { bilancioGiornaliero } from '../../lib/calcoli';
import { supabase } from '../../lib/supabase';
import type { PastoInsert } from '../../types/index';

/** Formatta data in italiano: "Martedì 11 Marzo 2026" */
function formattaData(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const TIPO_LABEL: Record<string, string> = {
  forza: '🏋️ Forza',
  cardio: '🏃 Cardio',
  mobilita: '🧘 Mobilità',
  altro: '⚡ Allenamento',
};

interface MacroChipProps {
  label: string;
  valore: number;
  colore: string;
}

function MacroChip({ label, valore, colore }: MacroChipProps): React.JSX.Element {
  return (
    <View style={[styles.macroChip, { borderColor: colore }]}>
      <Text style={[styles.macroLabel, { color: colore }]}>{label}</Text>
      <Text style={styles.macroValore}>{Math.round(valore)}g</Text>
    </View>
  );
}

export default function OggiScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { giorno, totali, sessione, calConsumate, bmr, loading, error, aggiorna } =
    useGiorno();

  // Ricarica ogni volta che il tab torna in foreground
  useFocusEffect(
    useCallback(() => {
      void aggiorna();
    }, [aggiorna])
  );

  const bilancio = bilancioGiornaliero(totali.calorie_totali, calConsumate, bmr);

  const handleOpenPastoSheet = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSalvaPasto = useCallback(async (dati: PastoInsert) => {
    if (!giorno) return;
    const { error } = await supabase.from('pasti').insert({
      ...dati,
      giorno_id: giorno.id,
    });
    if (error) {
       console.error("Errore salvataggio pasto da quick add", error);
       throw error;
    }
    // Ricaricamento dei dati della pagina
    await aggiorna();
  }, [giorno, aggiorna]);

  const handleNavigateToFullPasto = useCallback((datiDaModale: Partial<PastoInsert>) => {
     navigation.navigate('Pasti', { quickAdd: 'true', ...datiDaModale });
  }, [navigation]);

  if (loading && !giorno) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4A6741" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.erroreBox}>
          <Text style={styles.erroreTesto}>⚠️ {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={aggiorna} tintColor="#4A6741" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dataLabel}>
            {giorno ? formattaData(giorno.data) : '—'}
          </Text>
          <StatoBadge bilancio={bilancio} acquaMl={totali.acqua_totale} />
        </View>

        {/* Quick Actions Bar */}
        {giorno && (
          <View style={styles.quickActionsContainer}>
            <QuickActionsBar
              giornoId={giorno.id}
              data={giorno.data}
              sessione={sessione}
              omega3={totali.omega3_preso}
              onRefresh={aggiorna}
              onOpenPasto={handleOpenPastoSheet}
            />
          </View>
        )}

        {/* Calorie */}
        <CalorieCard
          calIngerite={totali.calorie_totali}
          calConsumate={calConsumate}
          bmr={bmr}
        />

        {/* Acqua */}
        <AcquaCard acquaMl={totali.acqua_totale} />

        {/* Allenamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitolo}>Allenamento</Text>
          {sessione !== null ? (
            <View style={styles.cardContenuto}>
              <Text style={styles.cardValore}>
                {sessione.giorno_lettera === 'riposo'
                  ? '🧘 Giorno di riposo'
                  : sessione.giorno_lettera !== null
                  ? `💪 Giorno ${sessione.giorno_lettera}`
                  : TIPO_LABEL[sessione.tipo] ?? '⚡ Sessione'}
              </Text>
              {sessione.durata_min !== null && (
                <Text style={styles.cardSottotitolo}>
                  {sessione.durata_min} min · {calConsumate} kcal
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.cardVuoto}>Nessun allenamento registrato</Text>
          )}
        </View>

        {/* Omega-3 */}
        <View style={styles.card}>
          <Text style={styles.cardTitolo}>Omega-3</Text>
          {totali.omega3_preso ? (
            <Text style={styles.omega3Ok}>✅ Preso oggi</Text>
          ) : (
            <Text style={styles.omega3No}>⭕ Non ancora</Text>
          )}
        </View>

        {/* Macronutrienti */}
        <View style={styles.card}>
          <Text style={styles.cardTitolo}>Macronutrienti</Text>
          <View style={styles.macroRiga}>
            <MacroChip label="P" valore={totali.proteine_totali} colore="#5DB85D" />
            <MacroChip label="C" valore={totali.carboidrati_totali} colore="#D4A84B" />
            <MacroChip label="G" valore={totali.grassi_totali} colore="#D45B5B" />
          </View>
        </View>
      </ScrollView>

      {/* Quick Add Pasto Bottom Sheet */}
      {giorno && (
        <QuickAddPastoSheet
          bottomSheetModalRef={bottomSheetModalRef}
          giornoId={giorno.id}
          data={giorno.data}
          onSalva={handleSalvaPasto}
          onNavigateToFull={handleNavigateToFullPasto}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  loader: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  header: { gap: 10, marginBottom: 4 },
  quickActionsContainer: {
    marginHorizontal: -16, // per far andare la scrollview orizzontale full-width  
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dataLabel: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textTransform: 'capitalize' },
  card: { backgroundColor: '#242424', borderRadius: 16, padding: 16, gap: 8 },
  cardTitolo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardContenuto: { gap: 4 },
  cardValore: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  cardSottotitolo: { fontSize: 13, color: '#888888' },
  cardVuoto: { fontSize: 14, color: '#555555', fontStyle: 'italic' },
  omega3Ok: { fontSize: 16, color: '#5DB85D', fontWeight: '600' },
  omega3No: { fontSize: 16, color: '#888888' },
  macroRiga: { flexDirection: 'row', gap: 10 },
  macroChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  macroLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  macroValore: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  erroreBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  erroreTesto: { color: '#D45B5B', fontSize: 15, textAlign: 'center' },
});
