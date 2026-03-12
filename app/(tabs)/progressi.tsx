// Schermata Progressi: KPI settimana + grafici bilancio e volume
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import GraficoLinea from '../../components/GraficoLinea';
import GraficoColonne from '../../components/GraficoColonne';
import { useProgressi } from '../../hooks/useProgressi';
import type { KpiSettimana } from '../../hooks/useProgressi';

export default function ProgressiScreen(): React.JSX.Element {
  const { bilancio30g, volumeGruppi, kpiSettimana, loading, error, aggiorna } = useProgressi();

  useFocusEffect(
    React.useCallback(() => {
      void aggiorna();
    }, [aggiorna])
  );

  if (loading && bilancio30g.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4A6741" style={styles.loader} />
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
        <Text style={styles.pageTitolo}>📈 Progressi</Text>
        {error !== null && <Text style={styles.errore}>⚠️ {error}</Text>}

        {/* KPI settimana corrente */}
        <SezioneHeader label="KPI — Settimana corrente" />
        <KpiGrid kpi={kpiSettimana} />

        {/* Grafico bilancio 30 giorni */}
        <SezioneHeader label="Bilancio calorico — 30 giorni" />
        <GraficoLinea
          data={bilancio30g}
          title="kcal/giorno rispetto a BMR + attività"
        />

        {/* Legenda bilancio */}
        <View style={styles.legenda}>
          <LegendaItem colore="#4A6741" label="Surplus / pareggio" />
          <LegendaItem colore="#D45B5B" label="Deficit" />
          <LegendaItem colore="#555555" label="Zero (pareggio esatto)" tratteggiato />
        </View>

        {/* Grafico volume per gruppo */}
        <SezioneHeader label="Volume per gruppo muscolare — 4 settimane" />
        <GraficoColonne
          data={volumeGruppi}
          title="kg totali (serie × reps × carico)"
        />

        <View style={styles.footer}>
          <Text style={styles.footerTesto}>
            Dati aggregati lato client · Aggiorna scorrendo verso il basso
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sezione header ───────────────────────────────────────────────────────────

function SezioneHeader({ label }: { label: string }): React.JSX.Element {
  return <Text style={styles.sezioneHeader}>{label}</Text>;
}

// ─── KPI Grid ─────────────────────────────────────────────────────────────────

function KpiGrid({ kpi }: { kpi: KpiSettimana }): React.JSX.Element {
  const sessioniLabel = `${kpi.sessioni_completate} / ${kpi.sessioni_target}`;
  const sessioniColore =
    kpi.sessioni_completate >= kpi.sessioni_target
      ? '#5DB85D'
      : kpi.sessioni_completate > 0
      ? '#D4A84B'
      : '#D45B5B';

  const deficitColore = kpi.deficit_cumulativo < -2000 ? '#5DB85D' : '#D4A84B';
  const pesateColore =
    kpi.percentuale_pesate >= 70
      ? '#5DB85D'
      : kpi.percentuale_pesate >= 40
      ? '#D4A84B'
      : '#D45B5B';

  return (
    <View style={styles.kpiGrid}>
      <KpiCard
        emoji="📉"
        label="Deficit settimana"
        valore={kpi.deficit_cumulativo < 0
          ? `${Math.abs(kpi.deficit_cumulativo).toLocaleString()} kcal`
          : '— kcal'}
        colore={kpi.deficit_cumulativo < 0 ? deficitColore : '#666666'}
        note="solo giorni in deficit"
      />
      <KpiCard
        emoji="💪"
        label="Sessioni"
        valore={sessioniLabel}
        colore={sessioniColore}
        note={`target ${kpi.sessioni_target} (A+B+C)`}
      />
      <KpiCard
        emoji="⚖️"
        label="Porzioni pesate"
        valore={`${kpi.percentuale_pesate}%`}
        colore={pesateColore}
        note={`${kpi.porzioni_pesate} / ${kpi.porzioni_totali} pasti`}
      />
    </View>
  );
}

interface KpiCardProps {
  emoji: string;
  label: string;
  valore: string;
  colore: string;
  note: string;
}

function KpiCard({ emoji, label, valore, colore, note }: KpiCardProps): React.JSX.Element {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiEmoji}>{emoji}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValore, { color: colore }]}>{valore}</Text>
      <Text style={styles.kpiNote}>{note}</Text>
    </View>
  );
}

// ─── Legenda ──────────────────────────────────────────────────────────────────

interface LegendaItemProps {
  colore: string;
  label: string;
  tratteggiato?: boolean;
}

function LegendaItem({ colore, label, tratteggiato = false }: LegendaItemProps): React.JSX.Element {
  return (
    <View style={styles.legendaItem}>
      <View
        style={[
          styles.legendaDot,
          { backgroundColor: tratteggiato ? 'transparent' : colore },
          tratteggiato && { borderWidth: 1, borderColor: colore, borderStyle: 'dashed' },
        ]}
      />
      <Text style={styles.legendaLabel}>{label}</Text>
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  loader: { flex: 1 },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  pageTitolo: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  errore: { fontSize: 12, color: '#D45B5B' },
  sezioneHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 8,
  },

  // KPI
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 14,
    padding: 12,
    gap: 4,
    alignItems: 'center',
  },
  kpiEmoji: { fontSize: 20 },
  kpiLabel: { fontSize: 10, color: '#888888', textAlign: 'center', lineHeight: 14 },
  kpiValore: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  kpiNote: { fontSize: 9, color: '#555555', textAlign: 'center', lineHeight: 13 },

  // Legenda
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 4,
  },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendaDot: { width: 10, height: 10, borderRadius: 5 },
  legendaLabel: { fontSize: 11, color: '#666666' },

  // Footer
  footer: { marginTop: 16, alignItems: 'center' },
  footerTesto: { fontSize: 11, color: '#333333', textAlign: 'center' },
});
