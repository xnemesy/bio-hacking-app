// Modal/Sheet per aggiungere un pasto con tutti i campi
import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { caloriePasto, sommaIngredienti } from '../lib/calcoli';
import FoodSearchInput from './FoodSearchInput';
import { useTemplates } from '../hooks/useTemplates';
import RecentPastiList from './RecentPastiList';
import { useRecentPastiStore, type RecentPasto } from '../store/recentPastiStore';
import type { Pasto, PastoFormData, PastoInsert, TipoPasto, Porzione, Ingrediente, TipoPastoTemplate, PastoTemplate } from '../types/index';
import { PASTO_FORM_DEFAULTS } from '../types/index';

interface Props {
  visibile: boolean;
  giornoId: string;
  onChiudi: () => void;
  onSalva: (dati: PastoInsert) => Promise<void>;
  pastoInModifica?: Pasto;
}

function pastoToFormData(pasto: Pasto): PastoFormData {
  return {
    tipo_pasto: pasto.tipo_pasto,
    nome: pasto.nome ?? '',
    proteine_g: String(pasto.proteine_g),
    carboidrati_g: String(pasto.carboidrati_g),
    grassi_g: String(pasto.grassi_g),
    acqua_ml: String(pasto.acqua_ml),
    omega3: pasto.omega3,
    porzione: pasto.porzione,
    fame_emotiva: pasto.fame_emotiva,
    note: pasto.note ?? '',
  };
}

const TIPI_PASTO: { value: TipoPasto; label: string }[] = [
  { value: 'colazione', label: '☀️ Colazione' },
  { value: 'spuntino_1_am', label: '🍎 Spuntino AM' },
  { value: 'spuntino_2_am', label: '🥜 Spuntino AM 2' },
  { value: 'pranzo', label: '🍽️ Pranzo' },
  { value: 'spuntino_3_pm', label: '🥝 Spuntino PM' },
  { value: 'cena', label: '🌙 Cena' },
];

/** Mappa TipoPasto app → TipoPastoTemplate DB per filtrare i template */
const TIPO_TO_TEMPLATE: Partial<Record<TipoPasto, TipoPastoTemplate>> = {
  colazione: 'Colazione',
  spuntino_1_am: 'Spuntino AM',
  pranzo: 'Pranzo',
  spuntino_3_pm: 'Spuntino PM',
  cena: 'Cena',
};

const PORZIONI: { value: Porzione; label: string }[] = [
  { value: 'pesato', label: '⚖️ Pesato' },
  { value: 'stimato', label: '👁️ Stimato' },
  { value: 'non_rispettato', label: '❌ Non rispettato' },
];

function parseNum(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) || n < 0 ? 0 : n;
}

export default function AggiuntaPastoModal({
  visibile,
  giornoId,
  onChiudi,
  onSalva,
  pastoInModifica,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<PastoFormData>(
    pastoInModifica ? pastoToFormData(pastoInModifica) : { ...PASTO_FORM_DEFAULTS }
  );
  const [ingredienti, setIngredienti] = useState<Ingrediente[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [templateSelezionato, setTemplateSelezionato] = useState<string | null>(null);
  const { getTemplatesByTipo } = useTemplates();
  const { getRecentByTipo, addRecent } = useRecentPastiStore();

  // Template disponibili per il tipo_pasto corrente
  const tipoTemplate = TIPO_TO_TEMPLATE[form.tipo_pasto];
  const templateDisponibili = tipoTemplate ? getTemplatesByTipo(tipoTemplate) : [];
  const recentiPerTipo = getRecentByTipo(form.tipo_pasto);
  const templateAttivo = templateDisponibili.find(t => t.id === templateSelezionato) ?? null;

  const aggiorna = useCallback(
    <K extends keyof PastoFormData>(chiave: K, valore: PastoFormData[K]) => {
      setForm((prev) => ({ ...prev, [chiave]: valore }));
      // De-seleziona template se l'utente modifica macro o cambia tipo_pasto
      if (['proteine_g', 'carboidrati_g', 'grassi_g', 'tipo_pasto'].includes(chiave as string)) {
        setTemplateSelezionato(null);
      }
    },
    []
  );

  const selezionaTemplate = useCallback((template: PastoTemplate) => {
    setTemplateSelezionato(template.id);
    setForm(prev => ({
      ...prev,
      nome: template.nome,
      proteine_g: String(template.proteine_g),
      carboidrati_g: String(template.carboidrati_g),
      grassi_g: String(template.grassi_g),
    }));
    // Svuota ingredienti se c'erano — i template precompilano i macro manuali
    setIngredienti([]);
  }, []);

  const selezionaRecente = useCallback((recente: RecentPasto) => {
    setTemplateSelezionato(null);
    setIngredienti([]);
    setForm(prev => ({
      ...prev,
      nome: recente.nome ?? '',
      proteine_g: String(recente.proteine_g),
      carboidrati_g: String(recente.carboidrati_g),
      grassi_g: String(recente.grassi_g),
      acqua_ml: String(recente.acqua_ml),
      omega3: recente.omega3,
      porzione: recente.porzione ?? prev.porzione,
    }));
  }, []);

  // kcal live: se ci sono ingredienti usa quelli, altrimenti i macro manuali
  const totaliIng = sommaIngredienti(ingredienti);
  const kcalLive =
    ingredienti.length > 0
      ? totaliIng.kcal
      : caloriePasto(parseNum(form.proteine_g), parseNum(form.carboidrati_g), parseNum(form.grassi_g));

  const handleSalva = async (): Promise<void> => {
    setSalvando(true);
    try {
      // Se ci sono ingredienti usa i totali da quelli, altrimenti i macro manuali
      const usaIngredienti = ingredienti.length > 0;
      const dati: PastoInsert = {
        giorno_id: giornoId,
        tipo_pasto: form.tipo_pasto,
        nome: form.nome.trim() !== '' ? form.nome.trim() : undefined,
        proteine_g: usaIngredienti ? totaliIng.proteine_g : parseNum(form.proteine_g),
        carboidrati_g: usaIngredienti ? totaliIng.carboidrati_g : parseNum(form.carboidrati_g),
        grassi_g: usaIngredienti ? totaliIng.grassi_g : parseNum(form.grassi_g),
        // ← MAI includere calorie_pasto (GENERATED COLUMN)
        acqua_ml: parseNum(form.acqua_ml),
        omega3: form.omega3,
        porzione: form.porzione,
        fame_emotiva: form.fame_emotiva,
        note: form.note.trim() !== '' ? form.note.trim() : undefined,
      };
      await onSalva(dati);
      // Aggiorna i recenti con il pasto appena salvato
      addRecent({
        tipo_pasto: dati.tipo_pasto,
        nome: dati.nome ?? null,
        proteine_g: dati.proteine_g,
        carboidrati_g: dati.carboidrati_g,
        grassi_g: dati.grassi_g,
        acqua_ml: dati.acqua_ml ?? 0,
        omega3: dati.omega3 ?? false,
        porzione: dati.porzione ?? null,
      });
      setForm({ ...PASTO_FORM_DEFAULTS });
      setIngredienti([]);
      setTemplateSelezionato(null);
      onChiudi();
    } catch {
      // errore gestito in usePasti
    } finally {
      setSalvando(false);
    }
  };

  const handleChiudi = (): void => {
    setForm({ ...PASTO_FORM_DEFAULTS });
    setIngredienti([]);
    setTemplateSelezionato(null);
    onChiudi();
  };

  return (
    <Modal
      visible={visibile}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleChiudi}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={handleChiudi} style={styles.btnChiudi}>
            <Text style={styles.btnChiudiTesto}>Annulla</Text>
          </TouchableOpacity>
          <Text style={styles.titolo}>{pastoInModifica ? 'Modifica Pasto' : 'Aggiungi Pasto'}</Text>
          <TouchableOpacity
            onPress={() => void handleSalva()}
            disabled={salvando}
            style={styles.btnSalva}
          >
            {salvando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnSalvaTesto}>Salva</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tipo pasto picker */}
          <Section titolo="Tipo pasto">
            <View style={styles.chipRiga}>
              {TIPI_PASTO.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, form.tipo_pasto === t.value && styles.chipAttivo]}
                  onPress={() => aggiorna('tipo_pasto', t.value)}
                >
                  <Text
                    style={[
                      styles.chipTesto,
                      form.tipo_pasto === t.value && styles.chipTestoAttivo,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* Pasti recenti */}
          {recentiPerTipo.length > 0 && (
            <Section titolo="">
              <RecentPastiList
                tipoPasto={form.tipo_pasto}
                recenti={recentiPerTipo}
                onSelect={selezionaRecente}
              />
            </Section>
          )}

          {/* Template Laudisio */}
          {templateDisponibili.length > 0 && (
            <Section titolo="Piano Laudisio">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                <View style={styles.templateRiga}>
                  {templateDisponibili.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.templateChip,
                        templateSelezionato === t.id && styles.templateChipAttivo,
                      ]}
                      onPress={() => selezionaTemplate(t)}
                    >
                      <Text
                        style={[
                          styles.templateChipTesto,
                          templateSelezionato === t.id && styles.templateChipTestoAttivo,
                        ]}
                        numberOfLines={1}
                      >
                        {t.nome}
                      </Text>
                      <Text style={styles.templateChipKcal}>
                        {Math.round(t.proteine_g * 4 + t.carboidrati_g * 4 + t.grassi_g * 9)} kcal
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {templateAttivo?.descrizione && (
                <Text style={styles.templateHint}>{templateAttivo.descrizione}</Text>
              )}
            </Section>
          )}

          {/* Nome (opzionale) */}
          <Section titolo="Nome / Descrizione (opzionale)">
            <TextInput
              style={styles.input}
              value={form.nome}
              onChangeText={(v) => aggiorna('nome', v)}
              placeholder="es. Pollo e riso"
              placeholderTextColor="#555555"
              returnKeyType="next"
            />
          </Section>

          {/* Ricerca ingredienti */}
          <Section titolo="Ingredienti (ricerca Open Food Facts)">
            <FoodSearchInput ingredienti={ingredienti} onChange={setIngredienti} />
          </Section>

          {/* Macronutrienti manuali (fallback se nessun ingrediente) */}
          <Section titolo={`Macronutrienti${ingredienti.length > 0 ? ' (da ingredienti)' : ''}  —  ${Math.round(kcalLive)} kcal`}>
            <View style={styles.macroRiga}>
              <MacroInput
                label="Proteine"
                colore="#5DB85D"
                valore={form.proteine_g}
                onChange={(v) => aggiorna('proteine_g', v)}
              />
              <MacroInput
                label="Carbo"
                colore="#D4A84B"
                valore={form.carboidrati_g}
                onChange={(v) => aggiorna('carboidrati_g', v)}
              />
              <MacroInput
                label="Grassi"
                colore="#D45B5B"
                valore={form.grassi_g}
                onChange={(v) => aggiorna('grassi_g', v)}
              />
            </View>
          </Section>

          {/* Acqua */}
          <Section titolo="Acqua (ml)">
            <TextInput
              style={styles.input}
              value={form.acqua_ml}
              onChangeText={(v) => aggiorna('acqua_ml', v)}
              placeholder="0"
              placeholderTextColor="#555555"
              keyboardType="numeric"
              returnKeyType="done"
            />
          </Section>

          {/* Toggle Omega-3 */}
          <Section titolo="">
            <ToggleRiga
              label="🐟 Omega-3 preso"
              valore={form.omega3}
              onChange={(v) => aggiorna('omega3', v)}
            />
          </Section>

          {/* Porzione picker */}
          <Section titolo="Porzione">
            <View style={styles.chipRiga}>
              {PORZIONI.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, form.porzione === p.value && styles.chipAttivo]}
                  onPress={() => aggiorna('porzione', p.value)}
                >
                  <Text
                    style={[
                      styles.chipTesto,
                      form.porzione === p.value && styles.chipTestoAttivo,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* Toggle fame emotiva */}
          <Section titolo="">
            <ToggleRiga
              label="😔 Fame emotiva"
              valore={form.fame_emotiva}
              onChange={(v) => aggiorna('fame_emotiva', v)}
            />
          </Section>

          {/* Note */}
          <Section titolo="Note (opzionale)">
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={form.note}
              onChangeText={(v) => aggiorna('note', v)}
              placeholder="Annotazioni libere..."
              placeholderTextColor="#555555"
              multiline
              numberOfLines={3}
              returnKeyType="default"
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sotto-componenti ────────────────────────────────────────────────────────

function Section({
  titolo,
  children,
}: {
  titolo: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      {titolo !== '' && <Text style={styles.sectionTitolo}>{titolo}</Text>}
      {children}
    </View>
  );
}

interface MacroInputProps {
  label: string;
  colore: string;
  valore: string;
  onChange: (v: string) => void;
}

function MacroInput({ label, colore, valore, onChange }: MacroInputProps): React.JSX.Element {
  return (
    <View style={styles.macroInputBox}>
      <Text style={[styles.macroInputLabel, { color: colore }]}>{label}</Text>
      <TextInput
        style={styles.macroInput}
        value={valore}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor="#555555"
        keyboardType="numeric"
        returnKeyType="next"
      />
      <Text style={styles.macroInputUnita}>g</Text>
    </View>
  );
}

interface ToggleRigaProps {
  label: string;
  valore: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRiga({ label, valore, onChange }: ToggleRigaProps): React.JSX.Element {
  return (
    <View style={styles.toggleRiga}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={valore}
        onValueChange={onChange}
        trackColor={{ false: '#333333', true: '#4A6741' }}
        thumbColor={valore ? '#FFFFFF' : '#888888'}
      />
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#242424',
  },
  titolo: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  btnChiudi: { padding: 4 },
  btnChiudiTesto: { fontSize: 16, color: '#888888' },
  btnSalva: {
    backgroundColor: '#4A6741',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  btnSalvaTesto: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  scroll: { padding: 16, gap: 4, paddingBottom: 40 },
  section: { gap: 8, marginBottom: 16 },
  sectionTitolo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  chipRiga: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  chipAttivo: { backgroundColor: '#4A6741', borderColor: '#4A6741' },
  chipTesto: { fontSize: 13, color: '#888888' },
  chipTestoAttivo: { color: '#FFFFFF', fontWeight: '600' },
  macroRiga: { flexDirection: 'row', gap: 10 },
  macroInputBox: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  macroInputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  macroInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  macroInputUnita: { fontSize: 11, color: '#555555' },
  toggleRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  toggleLabel: { fontSize: 15, color: '#CCCCCC' },
  // Template chip
  templateScroll: { marginHorizontal: -4 },
  templateRiga: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  templateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    minWidth: 100,
  },
  templateChipAttivo: {
    backgroundColor: '#4A6741',
    borderColor: '#5A7F51',
  },
  templateChipTesto: { fontSize: 13, color: '#CCCCCC', fontWeight: '600' },
  templateChipTestoAttivo: { color: '#FFFFFF' },
  templateChipKcal: { fontSize: 11, color: '#666666', marginTop: 2 },
  templateHint: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
