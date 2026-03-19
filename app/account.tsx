// Schermata profilo/account — renderizzata come Modal a schermo intero
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useProfilo } from '../hooks/useProfilo';
import { esportaTutto } from '../lib/export';
import type { ProfiloUpdate } from '../types/index';
import type { OpzioniExport } from '../lib/export';

interface Props {
  visibile: boolean;
  onChiudi: () => void;
}

interface FormProfilo {
  nome: string;
  peso_kg: string;
  altezza_cm: string;
  eta: string;
  fm_attuale: string;
  fm_target: string;
  bmr: string;
  obiettivo_acqua_ml: string;
  nutrizionista: string;
  palestra: string;
  data_ultima_bia: string;
}

const FORM_DEFAULTS: FormProfilo = {
  nome: '',
  peso_kg: '',
  altezza_cm: '',
  eta: '',
  fm_attuale: '',
  fm_target: '',
  bmr: '1650',
  obiettivo_acqua_ml: '2500',
  nutrizionista: '',
  palestra: '',
  data_ultima_bia: '',
};

function profiloToForm(p: NonNullable<ReturnType<typeof useProfilo>['profilo']>): FormProfilo {
  return {
    nome: p.nome ?? '',
    peso_kg: p.peso_kg !== null ? String(p.peso_kg) : '',
    altezza_cm: p.altezza_cm !== null ? String(p.altezza_cm) : '',
    eta: p.eta !== null ? String(p.eta) : '',
    fm_attuale: p.fm_attuale !== null ? String(p.fm_attuale) : '',
    fm_target: p.fm_target !== null ? String(p.fm_target) : '',
    bmr: String(p.bmr),
    obiettivo_acqua_ml: String(p.obiettivo_acqua_ml),
    nutrizionista: p.nutrizionista ?? '',
    palestra: p.palestra ?? '',
    data_ultima_bia: p.data_ultima_bia ?? '',
  };
}

function formToProfilo(f: FormProfilo): ProfiloUpdate {
  const num = (s: string): number | null => {
    const v = parseFloat(s.replace(',', '.'));
    return isNaN(v) ? null : v;
  };
  const intVal = (s: string): number | null => {
    const v = parseInt(s, 10);
    return isNaN(v) ? null : v;
  };
  return {
    nome: f.nome.trim() || null,
    peso_kg: num(f.peso_kg),
    altezza_cm: intVal(f.altezza_cm),
    eta: intVal(f.eta),
    fm_attuale: num(f.fm_attuale),
    fm_target: num(f.fm_target),
    bmr: intVal(f.bmr) ?? 1650,
    obiettivo_acqua_ml: intVal(f.obiettivo_acqua_ml) ?? 2500,
    nutrizionista: f.nutrizionista.trim() || null,
    palestra: f.palestra.trim() || null,
    data_ultima_bia: f.data_ultima_bia.trim() || null,
  };
}

type Periodo = 'settimana' | 'mese' | 'personalizzato';

function dataOggi(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function sottraiGiorni(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AccountModal({ visibile, onChiudi }: Props): React.JSX.Element {
  const { profilo, loading, salvando, error, aggiorna, aggiornaProfilo } = useProfilo();
  const [form, setForm] = useState<FormProfilo>(FORM_DEFAULTS);
  const [email, setEmail] = useState<string>('');

  // ── Export state ──
  const [periodo, setPeriodo] = useState<Periodo>('mese');
  const [dataInizioCustom, setDataInizioCustom] = useState('');
  const [dataFineCustom, setDataFineCustom] = useState('');
  const [opzioniExport, setOpzioniExport] = useState<OpzioniExport>({
    alimentazione: true,
    allenamento: true,
    riepilogo: true,
  });
  const [esportando, setEsportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  // Carica profilo all'apertura
  useEffect(() => {
    if (!visibile) return;
    void aggiorna();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibile]);

  // Sincronizza form quando arriva il profilo
  useEffect(() => {
    if (profilo) {
      setForm(profiloToForm(profilo));
    }
  }, [profilo]);

  const set = useCallback((key: keyof FormProfilo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSalva = useCallback(async () => {
    try {
      await aggiornaProfilo(formToProfilo(form));
      onChiudi();
    } catch {
      // errore già in error state
    }
  }, [form, aggiornaProfilo, onChiudi]);

  const handleEsporta = useCallback(async () => {
    setErrorExport(null);
    let dataInizio: string;
    let dataFine: string;
    if (periodo === 'settimana') {
      dataInizio = sottraiGiorni(6);
      dataFine = dataOggi();
    } else if (periodo === 'mese') {
      dataInizio = sottraiGiorni(29);
      dataFine = dataOggi();
    } else {
      dataInizio = dataInizioCustom.trim();
      dataFine = dataFineCustom.trim();
      if (!dataInizio || !dataFine) {
        setErrorExport('Inserisci data inizio e fine nel formato YYYY-MM-DD');
        return;
      }
      if (dataInizio > dataFine) {
        setErrorExport('La data inizio deve essere precedente alla data fine');
        return;
      }
    }
    setEsportando(true);
    try {
      await esportaTutto(dataInizio, dataFine, opzioniExport);
    } catch (e) {
      setErrorExport((e as Error).message);
    } finally {
      setEsportando(false);
    }
  }, [periodo, dataInizioCustom, dataFineCustom, opzioniExport]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: () => {
          void supabase.auth.signOut();
          onChiudi();
        },
      },
    ]);
  }, [onChiudi]);

  return (
    <Modal
      visible={visibile}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onChiudi}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitolo}>Profilo</Text>
          <TouchableOpacity onPress={onChiudi} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading && !profilo ? (
          <ActivityIndicator size="large" color="#22C55E" style={styles.loader} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {error !== null && <Text style={styles.errore}>{error}</Text>}

            {/* ── Dati personali ── */}
            <Sezione titolo="Dati personali">
              <Campo label="Nome" value={form.nome} onChangeText={(v) => set('nome', v)} placeholder="Rocco" />
              <Campo label="Età" value={form.eta} onChangeText={(v) => set('eta', v)} placeholder="30" keyboardType="numeric" />
              <Campo label="Peso (kg)" value={form.peso_kg} onChangeText={(v) => set('peso_kg', v)} placeholder="80.0" keyboardType="decimal-pad" />
              <Campo label="Altezza (cm)" value={form.altezza_cm} onChangeText={(v) => set('altezza_cm', v)} placeholder="178" keyboardType="numeric" />
            </Sezione>

            {/* ── Composizione corporea ── */}
            <Sezione titolo="Composizione corporea">
              <Campo label="FM attuale (%)" value={form.fm_attuale} onChangeText={(v) => set('fm_attuale', v)} placeholder="18.5" keyboardType="decimal-pad" />
              <Campo label="FM target (%)" value={form.fm_target} onChangeText={(v) => set('fm_target', v)} placeholder="12.0" keyboardType="decimal-pad" />
              <Campo label="Data ultima BIA" value={form.data_ultima_bia} onChangeText={(v) => set('data_ultima_bia', v)} placeholder="2026-03-01" />
            </Sezione>

            {/* ── Parametri metabolici ── */}
            <Sezione titolo="Parametri metabolici">
              <Campo label="BMR (kcal)" value={form.bmr} onChangeText={(v) => set('bmr', v)} placeholder="1650" keyboardType="numeric" />
              <Campo label="Obiettivo acqua (ml)" value={form.obiettivo_acqua_ml} onChangeText={(v) => set('obiettivo_acqua_ml', v)} placeholder="2500" keyboardType="numeric" />
            </Sezione>

            {/* ── Riferimenti ── */}
            <Sezione titolo="Riferimenti">
              <Campo label="Nutrizionista" value={form.nutrizionista} onChangeText={(v) => set('nutrizionista', v)} placeholder="Dr. Rossi" />
              <Campo label="Palestra" value={form.palestra} onChangeText={(v) => set('palestra', v)} placeholder="Gym Center" />
            </Sezione>

            {/* ── Account ── */}
            <Sezione titolo="Account">
              <View style={styles.campoReadonly}>
                <Text style={styles.campoLabel}>Email</Text>
                <Text style={styles.campoEmailValore}>{email}</Text>
              </View>
            </Sezione>

            {/* ── Esporta dati ── */}
            <Sezione titolo="Esporta per la nutrizionista">
              {/* Selettore periodo */}
              <View style={styles.exportPeriodoRiga}>
                {(['settimana', 'mese', 'personalizzato'] as Periodo[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.exportPeriodoBtn, periodo === p && styles.exportPeriodoBtnAttivo]}
                    onPress={() => setPeriodo(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.exportPeriodoBtnTesto, periodo === p && styles.exportPeriodoBtnTestoAttivo]}>
                      {p === 'settimana' ? 'Ultima settimana' : p === 'mese' ? 'Ultimo mese' : 'Personalizzato'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date personalizzate */}
              {periodo === 'personalizzato' && (
                <View style={styles.exportDateRiga}>
                  <TextInput
                    style={styles.exportDateInput}
                    value={dataInizioCustom}
                    onChangeText={setDataInizioCustom}
                    placeholder="Inizio (YYYY-MM-DD)"
                    placeholderTextColor="#555555"
                    returnKeyType="next"
                  />
                  <Text style={styles.exportDateSep}>→</Text>
                  <TextInput
                    style={styles.exportDateInput}
                    value={dataFineCustom}
                    onChangeText={setDataFineCustom}
                    placeholder="Fine (YYYY-MM-DD)"
                    placeholderTextColor="#555555"
                    returnKeyType="done"
                  />
                </View>
              )}

              {/* Toggle cosa esportare */}
              <ToggleRiga
                label="Report alimentazione"
                valore={opzioniExport.alimentazione}
                onToggle={(v) => setOpzioniExport((prev) => ({ ...prev, alimentazione: v }))}
              />
              <ToggleRiga
                label="Report allenamento"
                valore={opzioniExport.allenamento}
                onToggle={(v) => setOpzioniExport((prev) => ({ ...prev, allenamento: v }))}
              />
              <ToggleRiga
                label="Riepilogo settimanale"
                valore={opzioniExport.riepilogo}
                onToggle={(v) => setOpzioniExport((prev) => ({ ...prev, riepilogo: v }))}
                isLast
              />
            </Sezione>

            {errorExport !== null && (
              <Text style={styles.erroreExport}>{errorExport}</Text>
            )}

            {/* Bottone Esporta CSV */}
            <TouchableOpacity
              style={[styles.btnEsporta, esportando && styles.btnDisabilitato]}
              onPress={() => { void handleEsporta(); }}
              disabled={esportando}
              activeOpacity={0.8}
            >
              {esportando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnEsportaInner}>
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.btnEsportaTesto}>Esporta CSV</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Bottone salva */}
            <TouchableOpacity
              style={[styles.btnSalva, salvando && styles.btnDisabilitato]}
              onPress={() => { void handleSalva(); }}
              disabled={salvando}
              activeOpacity={0.8}
            >
              {salvando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnSalvaTesto}>Salva</Text>
              )}
            </TouchableOpacity>

            {/* Bottone logout */}
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#D45B5B" />
              <Text style={styles.btnLogoutTesto}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Sotto-componenti ─────────────────────────────────────────────────────────

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.sezione}>
      <Text style={styles.sezioneTitolo}>{titolo}</Text>
      <View style={styles.sezioneCorpo}>{children}</View>
    </View>
  );
}

interface CampoProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}

interface ToggleRigaProps {
  label: string;
  valore: boolean;
  onToggle: (v: boolean) => void;
  isLast?: boolean;
}

function ToggleRiga({ label, valore, onToggle, isLast = false }: ToggleRigaProps): React.JSX.Element {
  return (
    <View style={[styles.campo, isLast && styles.campoNoBottom]}>
      <Text style={styles.campoLabel}>{label}</Text>
      <Switch
        value={valore}
        onValueChange={onToggle}
        trackColor={{ false: '#333333', true: '#22C55E' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function Campo({ label, value, onChangeText, placeholder, keyboardType = 'default' }: CampoProps): React.JSX.Element {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <TextInput
        style={styles.campoInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#555555"
        keyboardType={keyboardType}
        returnKeyType="done"
      />
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  headerTitolo: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
  errore: { fontSize: 13, color: '#D45B5B', marginBottom: 4 },

  sezione: { gap: 4 },
  sezioneTitolo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sezioneCorpo: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
  },

  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  campoLabel: {
    width: 160,
    fontSize: 14,
    color: '#CCCCCC',
  },
  campoInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  campoReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  campoEmailValore: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    textAlign: 'right',
  },

  btnSalva: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabilitato: { backgroundColor: '#333333' },
  btnSalvaTesto: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  btnLogoutTesto: { fontSize: 15, color: '#D45B5B', fontWeight: '600' },

  // Export
  exportPeriodoRiga: {
    flexDirection: 'row',
    padding: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  exportPeriodoBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#242424',
  },
  exportPeriodoBtnAttivo: { backgroundColor: '#22C55E' },
  exportPeriodoBtnTesto: { fontSize: 11, color: '#888888', fontWeight: '600', textAlign: 'center' },
  exportPeriodoBtnTestoAttivo: { color: '#FFFFFF' },

  exportDateRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  exportDateInput: {
    flex: 1,
    backgroundColor: '#242424',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FFFFFF',
  },
  exportDateSep: { fontSize: 14, color: '#555555' },

  campoNoBottom: { borderBottomWidth: 0 },

  erroreExport: { fontSize: 13, color: '#D45B5B', marginTop: -8 },

  btnEsporta: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnEsportaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnEsportaTesto: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
