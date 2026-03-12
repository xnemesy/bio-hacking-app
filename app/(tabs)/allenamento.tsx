// Schermata allenamento: gestione sessioni A/B/C con preset e timer recupero
import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import SupersetCard from '../../components/SupersetCard';
import TimerRecupero from '../../components/TimerRecupero';
import { useGiorno } from '../../hooks/useGiorno';
import { useSessione } from '../../hooks/useSessione';
import type { CompletaSessioneMeta, GruppoEsercizi } from '../../hooks/useSessione';
import { GIORNI_PRESET } from '../../data/esercizi';
import type { GiornoLettera, Sessione } from '../../types/index';

const GIORNO_LABELS: Record<Exclude<GiornoLettera, 'riposo'>, string> = {
  A: '🏋️ Giorno A',
  B: '💪 Giorno B',
  C: '🎯 Giorno C',
};

const GIORNO_DESCR: Record<Exclude<GiornoLettera, 'riposo'>, string> = {
  A: GIORNI_PRESET.A.titolo,
  B: GIORNI_PRESET.B.titolo,
  C: GIORNI_PRESET.C.titolo,
};

// ─── Schermata principale ────────────────────────────────────────────────────

export default function AllenamentoScreen(): React.JSX.Element {
  const { giorno, loading: loadingGiorno, aggiorna: aggiornaGiorno } = useGiorno();
  const {
    sessione,
    gruppi,
    volumeTotale,
    loading,
    salvando,
    error,
    aggiorna,
    iniziaSessione,
    aggiornaCarico,
    completaSessione,
  } = useSessione();

  // Ricarica al focus del tab
  useFocusEffect(
    useCallback(() => {
      void aggiornaGiorno().then(() => {
        if (giorno) void aggiorna(giorno.id);
      });
    }, [aggiornaGiorno, aggiorna, giorno])
  );

  const handleAggiorna = useCallback(() => {
    if (giorno) void aggiorna(giorno.id);
  }, [aggiorna, giorno]);

  if (loadingGiorno || (loading && !sessione)) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4A6741" style={styles.loader} />
      </SafeAreaView>
    );
  }

  // Nessuna sessione → selezione giorno
  if (!sessione) {
    return (
      <SafeAreaView style={styles.container}>
        <IniziaSessioneView
          giornoId={giorno?.id ?? null}
          salvando={salvando}
          onIniziaSessione={iniziaSessione}
        />
      </SafeAreaView>
    );
  }

  const lettera = sessione.giorno_lettera;

  // Giorno di riposo
  if (lettera === 'riposo' || lettera === null) {
    return (
      <SafeAreaView style={styles.container}>
        <RiposoView />
      </SafeAreaView>
    );
  }

  // Workout A/B/C
  return (
    <SafeAreaView style={styles.container}>
      <AllenamentoView
        lettera={lettera}
        gruppi={gruppi}
        volumeTotale={volumeTotale}
        sessione={sessione}
        salvando={salvando}
        error={error}
        onUpdateCarico={aggiornaCarico}
        onCompleta={completaSessione}
        onRefresh={handleAggiorna}
      />
    </SafeAreaView>
  );
}

// ─── Vista: selezione inizio sessione ────────────────────────────────────────

interface IniziaSessioneViewProps {
  giornoId: string | null;
  salvando: boolean;
  onIniziaSessione: (lettera: GiornoLettera, giornoId: string) => Promise<void>;
}

function IniziaSessioneView({ giornoId, salvando, onIniziaSessione }: IniziaSessioneViewProps): React.JSX.Element {
  const [selezione, setSelezione] = useState<GiornoLettera | null>(null);

  const handleAvvia = (): void => {
    if (!selezione || !giornoId) return;
    void (async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onIniziaSessione(selezione, giornoId);
    })();
  };

  return (
    <ScrollView contentContainerStyle={styles.iniziaScroll}>
      <Text style={styles.iniziaTitolo}>💪 Inizia Sessione</Text>
      <Text style={styles.iniziaSottotitolo}>Seleziona il giorno di allenamento</Text>

      <View style={styles.giorniGrid}>
        {(['A', 'B', 'C'] as const).map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.giornoCard, selezione === l && styles.giornoCardAttivo]}
            onPress={() => setSelezione(l)}
            activeOpacity={0.8}
          >
            <Text style={[styles.giornoLettera, selezione === l && styles.giornoLetteraAttiva]}>
              {l}
            </Text>
            <Text style={[styles.giornoLabel, selezione === l && styles.giornoLabelAttivo]}>
              {GIORNO_LABELS[l]}
            </Text>
            <Text style={styles.giornoDescr} numberOfLines={2}>
              {GIORNO_DESCR[l]}
            </Text>
            <Text style={styles.giornoInfo}>
              {GIORNI_PRESET[l].gruppi.length} superset
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Riposo */}
      <TouchableOpacity
        style={[styles.riposoBtn, selezione === 'riposo' && styles.riposaoBtnAttivo]}
        onPress={() => setSelezione('riposo')}
      >
        <Text style={styles.riposoBtnTesto}>🧘 Giorno di riposo</Text>
      </TouchableOpacity>

      {/* Avvia */}
      <TouchableOpacity
        style={[styles.avviaBtn, (!selezione || salvando) && styles.avviaBtnDisabilitato]}
        onPress={handleAvvia}
        disabled={!selezione || salvando || !giornoId}
        activeOpacity={0.8}
      >
        {salvando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.avviaBtnTesto}>Avvia Sessione →</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Vista: giorno di riposo ─────────────────────────────────────────────────

function RiposoView(): React.JSX.Element {
  return (
    <View style={styles.riposoView}>
      <Text style={styles.riposoEmoji}>🧘</Text>
      <Text style={styles.riposoTitolo}>Giorno di riposo</Text>
      <Text style={styles.riposoSottotitolo}>Recupera, idratati e dormi bene.</Text>
    </View>
  );
}

// ─── Vista: allenamento attivo ────────────────────────────────────────────────

interface AllenamentoViewProps {
  lettera: 'A' | 'B' | 'C';
  gruppi: GruppoEsercizi[];
  volumeTotale: number;
  sessione: Sessione;
  salvando: boolean;
  error: string | null;
  onUpdateCarico: (id: string, caricoA: number, caricoB: number) => Promise<void>;
  onCompleta: (meta: CompletaSessioneMeta) => Promise<void>;
  onRefresh: () => void;
}

function AllenamentoView({
  lettera,
  gruppi,
  volumeTotale,
  sessione,
  salvando,
  error,
  onUpdateCarico,
  onCompleta,
  onRefresh,
}: AllenamentoViewProps): React.JSX.Element {
  const preset = GIORNI_PRESET[lettera];

  // Stato footer
  const [durata, setDurata] = useState(
    sessione.durata_min !== null ? String(sessione.durata_min) : ''
  );
  const [rpe, setRpe] = useState<number | null>(sessione.rpe);
  const [cardioExtra, setCardioExtra] = useState(
    String(sessione.cardio_extra_min > 0 ? sessione.cardio_extra_min : 15)
  );
  const [addome, setAddome] = useState(sessione.addome_completato);
  const [idratazione, setIdratazione] = useState(sessione.idratazione_pre);
  const [spuntino, setSpuntino] = useState(sessione.spuntino_pre);
  const [salvato, setSalvato] = useState(false);

  const handleCompleta = useCallback(() => {
    const durataN = parseInt(durata, 10);
    if (isNaN(durataN) || durataN <= 0) {
      Alert.alert('Durata mancante', 'Inserisci la durata della sessione in minuti.');
      return;
    }
    void (async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onCompleta({
        durata_min: durataN,
        rpe,
        cardio_extra_min: parseInt(cardioExtra, 10) || 0,
        addome_completato: addome,
        idratazione_pre: idratazione,
        spuntino_pre: spuntino,
      });
      setSalvato(true);
      onRefresh();
    })();
  }, [durata, rpe, cardioExtra, addome, idratazione, spuntino, onCompleta, onRefresh]);

  return (
    <ScrollView contentContainerStyle={styles.workoutScroll} keyboardShouldPersistTaps="handled">
      {/* Header sessione */}
      <View style={styles.workoutHeader}>
        <View>
          <Text style={styles.workoutTitolo}>{GIORNO_LABELS[lettera]}</Text>
          <Text style={styles.workoutSottotitolo}>{preset.titolo}</Text>
        </View>
        <View style={styles.volumeBadge}>
          <Text style={styles.volumeValore}>{Math.round(volumeTotale)}</Text>
          <Text style={styles.volumeUnita}>kg vol.</Text>
        </View>
      </View>

      {error !== null && (
        <Text style={styles.errore}>⚠️ {error}</Text>
      )}

      {/* Lista gruppi con timer tra l'uno e l'altro */}
      {gruppi.map((gruppo, idx) => (
        <React.Fragment key={gruppo.label}>
          <SupersetCard
            gruppo={gruppo}
            indice={idx}
            onUpdateCarico={onUpdateCarico}
          />
          {idx < gruppi.length - 1 && <TimerRecupero />}
        </React.Fragment>
      ))}

      {/* Addome (solo Giorno B) */}
      {preset.ha_addome && (
        <View style={styles.addomeCard}>
          <Text style={styles.addomeLabel}>💪 Addome</Text>
          <Switch
            value={addome}
            onValueChange={setAddome}
            trackColor={{ false: '#333333', true: '#4A6741' }}
            thumbColor={addome ? '#FFFFFF' : '#888888'}
          />
        </View>
      )}

      {/* Cardio finale (solo Giorno B) */}
      {preset.ha_cardio_finale && (
        <View style={styles.cardioCard}>
          <Text style={styles.cardioLabel}>🏃 Cardio finale</Text>
          <View style={styles.cardioInput}>
            <TextInput
              style={styles.miniInput}
              value={cardioExtra}
              onChangeText={setCardioExtra}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={styles.miniInputLabel}>min</Text>
          </View>
        </View>
      )}

      {/* ─── Footer sessione ─────────────────────────────────── */}
      <View style={styles.footerCard}>
        <Text style={styles.footerTitolo}>Riepilogo Sessione</Text>

        {/* Durata */}
        <FooterRiga label="⏱️ Durata totale (min)">
          <TextInput
            style={styles.footerInput}
            value={durata}
            onChangeText={setDurata}
            placeholder="es. 75"
            placeholderTextColor="#444444"
            keyboardType="numeric"
            returnKeyType="done"
          />
        </FooterRiga>

        {/* RPE */}
        <FooterRiga label="📊 RPE (sforzo percepito)">
          <View style={styles.rpeRiga}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.rpeBtn, rpe === n && styles.rpeBtnAttivo]}
                onPress={() => setRpe(n)}
              >
                <Text style={[styles.rpeTesto, rpe === n && styles.rpeTestoAttivo]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FooterRiga>

        {/* Cardio extra (non Giorno B, già gestito sopra) */}
        {!preset.ha_cardio_finale && (
          <FooterRiga label="🏃 Cardio extra (min)">
            <TextInput
              style={styles.footerInput}
              value={cardioExtra}
              onChangeText={setCardioExtra}
              placeholder="0"
              placeholderTextColor="#444444"
              keyboardType="numeric"
              returnKeyType="done"
            />
          </FooterRiga>
        )}

        {/* Toggle pre-workout */}
        <View style={styles.toggleRiga}>
          <Text style={styles.toggleLabel}>💧 Idratazione pre-allenamento</Text>
          <Switch
            value={idratazione}
            onValueChange={setIdratazione}
            trackColor={{ false: '#333333', true: '#3A6EA5' }}
            thumbColor={idratazione ? '#FFFFFF' : '#888888'}
          />
        </View>
        <View style={styles.toggleRiga}>
          <Text style={styles.toggleLabel}>🥜 Spuntino pre-allenamento</Text>
          <Switch
            value={spuntino}
            onValueChange={setSpuntino}
            trackColor={{ false: '#333333', true: '#D4A84B' }}
            thumbColor={spuntino ? '#FFFFFF' : '#888888'}
          />
        </View>

        {/* Bottone completa */}
        <TouchableOpacity
          style={[styles.completaBtn, salvando && styles.completaBtnDisabilitato]}
          onPress={handleCompleta}
          disabled={salvando}
          activeOpacity={0.8}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.completaBtnTesto}>
              {salvato ? '✅ Sessione salvata' : '💾 Completa Sessione'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Footer riga helper ───────────────────────────────────────────────────────

function FooterRiga({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.footerRiga}>
      <Text style={styles.footerRigaLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  loader: { flex: 1 },

  // Inizio sessione
  iniziaScroll: { padding: 20, gap: 16, paddingBottom: 40 },
  iniziaTitolo: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  iniziaSottotitolo: { fontSize: 14, color: '#888888' },
  giorniGrid: { gap: 10 },
  giornoCard: {
    backgroundColor: '#242424',
    borderRadius: 14,
    padding: 16,
    gap: 4,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  giornoCardAttivo: { borderColor: '#4A6741', backgroundColor: '#1E2E1E' },
  giornoLettera: { fontSize: 32, fontWeight: '900', color: '#555555' },
  giornoLetteraAttiva: { color: '#4A6741' },
  giornoLabel: { fontSize: 16, fontWeight: '700', color: '#888888' },
  giornoLabelAttivo: { color: '#FFFFFF' },
  giornoDescr: { fontSize: 12, color: '#555555' },
  giornoInfo: { fontSize: 11, color: '#4A6741', marginTop: 4 },
  riposoBtn: {
    backgroundColor: '#242424',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  riposaoBtnAttivo: { borderColor: '#888888', backgroundColor: '#2A2A2A' },
  riposoBtnTesto: { fontSize: 16, color: '#888888', fontWeight: '600' },
  avviaBtn: {
    backgroundColor: '#4A6741',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  avviaBtnDisabilitato: { backgroundColor: '#2A2A2A' },
  avviaBtnTesto: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  // Riposo
  riposoView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  riposoEmoji: { fontSize: 64 },
  riposoTitolo: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  riposoSottotitolo: { fontSize: 15, color: '#888888', textAlign: 'center' },

  // Workout
  workoutScroll: { padding: 14, gap: 12, paddingBottom: 40 },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutTitolo: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  workoutSottotitolo: { fontSize: 12, color: '#888888', marginTop: 2 },
  volumeBadge: { alignItems: 'flex-end' },
  volumeValore: { fontSize: 24, fontWeight: '700', color: '#4A6741' },
  volumeUnita: { fontSize: 11, color: '#888888' },
  errore: { fontSize: 12, color: '#D45B5B', textAlign: 'center' },

  // Addome / cardio
  addomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 12,
    padding: 14,
  },
  addomeLabel: { fontSize: 15, color: '#CCCCCC', fontWeight: '600' },
  cardioCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 12,
    padding: 14,
  },
  cardioLabel: { fontSize: 15, color: '#CCCCCC', fontWeight: '600' },
  cardioInput: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    width: 52,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingVertical: 6,
  },
  miniInputLabel: { fontSize: 13, color: '#888888' },

  // Footer
  footerCard: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginTop: 4,
  },
  footerTitolo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footerRiga: { gap: 8 },
  footerRigaLabel: { fontSize: 14, color: '#CCCCCC' },
  footerInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  rpeRiga: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeBtnAttivo: { backgroundColor: '#4A6741', borderColor: '#4A6741' },
  rpeTesto: { fontSize: 14, fontWeight: '600', color: '#666666' },
  rpeTestoAttivo: { color: '#FFFFFF' },
  toggleRiga: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 14, color: '#CCCCCC', flex: 1 },
  completaBtn: {
    backgroundColor: '#4A6741',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  completaBtnDisabilitato: { backgroundColor: '#333333' },
  completaBtnTesto: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
