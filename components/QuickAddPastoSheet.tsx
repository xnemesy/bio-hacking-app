import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecentPastiStore, type RecentPasto } from '../store/recentPastiStore';
import { useTemplates } from '../hooks/useTemplates';
import RecentPastiList from './RecentPastiList';
import type { TipoPasto, PastoInsert, PastoTemplate, TipoPastoTemplate } from '../types/index';
import { caloriePasto } from '../lib/calcoli';

const TIPI_PASTO: { value: TipoPasto; label: string }[] = [
  { value: 'colazione', label: '☀️ Colazione' },
  { value: 'spuntino_1_am', label: '🍎 Spuntino AM' },
  { value: 'spuntino_2_am', label: '🥜 Spuntino AM 2' },
  { value: 'pranzo', label: '🍽️ Pranzo' },
  { value: 'spuntino_3_pm', label: '🥝 Spuntino PM' },
  { value: 'cena', label: '🌙 Cena' },
];

const TIPO_TO_TEMPLATE: Partial<Record<TipoPasto, TipoPastoTemplate>> = {
  colazione: 'Colazione',
  spuntino_1_am: 'Spuntino AM',
  pranzo: 'Pranzo',
  spuntino_3_pm: 'Spuntino PM',
  cena: 'Cena',
};

interface Props {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
  giornoId: string;
  data: string;
  onSalva: (dati: PastoInsert) => Promise<void>;
  onNavigateToFull: (datiDabottomSheet: Partial<PastoInsert>) => void;
}

export default function QuickAddPastoSheet({
  bottomSheetModalRef,
  giornoId,
  data,
  onSalva,
  onNavigateToFull,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [tipoPasto, setTipoPasto] = useState<TipoPasto>('colazione');
  const [preview, setPreview] = useState<{ tipo: 'recente' | 'template'; dati: RecentPasto | PastoTemplate } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { getRecentByTipo, addRecent } = useRecentPastiStore();
  const { getTemplatesByTipo } = useTemplates();

  const recentiPerTipo = getRecentByTipo(tipoPasto);
  const tipoTemplate = TIPO_TO_TEMPLATE[tipoPasto];
  const templateDisponibili = tipoTemplate ? getTemplatesByTipo(tipoTemplate) : [];

  const handleSelectRecente = useCallback((recente: RecentPasto) => {
    setPreview({ tipo: 'recente', dati: recente });
  }, []);

  const handleSelectTemplate = useCallback((template: PastoTemplate) => {
    setPreview({ tipo: 'template', dati: template });
  }, []);

  const handleConferma = async () => {
    if (!preview) return;
    setSalvando(true);
    
    try {
      let pastoInsert: PastoInsert;

      if (preview.tipo === 'recente') {
        const r = preview.dati as RecentPasto;
        pastoInsert = {
          giorno_id: giornoId,
          tipo_pasto: tipoPasto,
          nome: r.nome ?? undefined,
          proteine_g: r.proteine_g,
          carboidrati_g: r.carboidrati_g,
          grassi_g: r.grassi_g,
          acqua_ml: r.acqua_ml,
          omega3: r.omega3,
          porzione: r.porzione ?? undefined,
        };
      } else {
        const t = preview.dati as PastoTemplate;
        pastoInsert = {
          giorno_id: giornoId,
          tipo_pasto: tipoPasto,
          nome: t.nome,
          proteine_g: t.proteine_g,
          carboidrati_g: t.carboidrati_g,
          grassi_g: t.grassi_g,
          acqua_ml: 0,
          omega3: false,
          porzione: 'pesato',
          note: t.descrizione ?? undefined,
        };
      }

      await onSalva(pastoInsert);
      
      addRecent({
        tipo_pasto: pastoInsert.tipo_pasto,
        nome: pastoInsert.nome ?? null,
        proteine_g: pastoInsert.proteine_g,
        carboidrati_g: pastoInsert.carboidrati_g,
        grassi_g: pastoInsert.grassi_g,
        acqua_ml: pastoInsert.acqua_ml ?? 0,
        omega3: pastoInsert.omega3 ?? false,
        porzione: pastoInsert.porzione ?? null,
      });

      setPreview(null);
      bottomSheetModalRef.current?.dismiss();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  const handleModifica = () => {
    if (!preview) return;
    
    let partialInsert: Partial<PastoInsert> = {
      tipo_pasto: tipoPasto,
    };

    if (preview.tipo === 'recente') {
      const r = preview.dati as RecentPasto;
      partialInsert = {
        ...partialInsert,
        nome: r.nome ?? undefined,
        proteine_g: r.proteine_g,
        carboidrati_g: r.carboidrati_g,
        grassi_g: r.grassi_g,
        acqua_ml: r.acqua_ml,
        omega3: r.omega3,
        porzione: r.porzione ?? undefined,
      };
    } else {
        const t = preview.dati as PastoTemplate;
        partialInsert = {
          ...partialInsert,
          nome: t.nome,
          proteine_g: t.proteine_g,
          carboidrati_g: t.carboidrati_g,
          grassi_g: t.grassi_g,
          acqua_ml: 0,
          omega3: false,
          porzione: 'pesato',
          note: t.descrizione ?? undefined,
        };
    }
    
    bottomSheetModalRef.current?.dismiss();
    onNavigateToFull(partialInsert);
  };

  const handleCustomPasto = () => {
    bottomSheetModalRef.current?.dismiss();
    onNavigateToFull({ tipo_pasto: tipoPasto });
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['65%', '90%']}
      index={0}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      onChange={(index) => {
        if (index === -1) {
          setPreview(null); // Reset preview on close
        }
      }}
    >
      <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Aggiungi Pasto Rapido</Text>
          <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()}>
             <Ionicons name="close" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Picker Tipo Pasto (Orizzontale) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipoContainer}>
             {TIPI_PASTO.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, tipoPasto === t.value && styles.chipAttivo]}
                  onPress={() => {
                    setTipoPasto(t.value);
                    setPreview(null);
                  }}
                >
                  <Text
                    style={[
                      styles.chipTesto,
                      tipoPasto === t.value && styles.chipTestoAttivo,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          {/* Pasti recenti */}
          {recentiPerTipo.length > 0 && (
             <View style={styles.section}>
               <RecentPastiList
                 tipoPasto={tipoPasto}
                 recenti={recentiPerTipo}
                 onSelect={handleSelectRecente}
               />
             </View>
          )}

          {/* Template Laudisio */}
          {templateDisponibili.length > 0 && (
            <View style={styles.section}>
               <Text style={styles.sectionTitolo}>PIANO LAUDISIO</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                 <View style={styles.templateRiga}>
                   {templateDisponibili.map((t) => (
                     <TouchableOpacity
                       key={t.id}
                       style={[
                         styles.templateChip,
                         preview?.tipo === 'template' && (preview.dati as PastoTemplate).id === t.id && styles.templateChipAttivo,
                       ]}
                       onPress={() => handleSelectTemplate(t)}
                     >
                       <Text
                         style={[
                           styles.templateChipTesto,
                           preview?.tipo === 'template' && (preview.dati as PastoTemplate).id === t.id && styles.templateChipTestoAttivo,
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
             </View>
          )}

          {/* Pulsante Inserisci Custom */}
          <TouchableOpacity style={styles.btnCustom} onPress={handleCustomPasto}>
             <Text style={styles.btnCustomTesto}>Inserimento manuale / personalizzato  →</Text>
          </TouchableOpacity>

        </BottomSheetScrollView>

        {/* Floating Preview/Confirm Bar */}
        {preview && (
          <View style={styles.previewContainer}>
             <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {preview.dati.nome ?? 'Pasto personalizzato'}
                </Text>
                <Text style={styles.previewMacro}>
                  P{Math.round(preview.dati.proteine_g)} C{Math.round(preview.dati.carboidrati_g)} G{Math.round(preview.dati.grassi_g)} — {Math.round(caloriePasto(preview.dati.proteine_g, preview.dati.carboidrati_g, preview.dati.grassi_g))} kcal
                </Text>
             </View>
             
             <View style={styles.previewActions}>
                <TouchableOpacity style={styles.btnAzioneModifica} onPress={handleModifica}>
                  <Text style={styles.btnAzioneTestoScuro}>Modifica</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnAzioneConferma} onPress={handleConferma} disabled={salvando}>
                  {salvando ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.btnAzioneTestoChiaro}>Conferma</Text>
                  )}
                </TouchableOpacity>
             </View>
          </View>
        )}

      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#1E1E1E',
  },
  handleIndicator: {
    backgroundColor: '#555',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100, // Make room for preview
  },
  tipoContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333333',
    height: 36,
  },
  chipAttivo: { backgroundColor: '#4A6741', borderColor: '#4A6741' },
  chipTesto: { fontSize: 13, color: '#888888' },
  chipTestoAttivo: { color: '#FFFFFF', fontWeight: '600' },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitolo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
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
  btnCustom: {
    marginHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#222',
    marginTop: 8,
  },
  btnCustomTesto: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  previewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2A2A2A',
    borderTopWidth: 1,
    borderTopColor: '#444',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'column',
    gap: 12,
  },
  previewInfo: {
    gap: 4,
  },
  previewTitle: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: 'bold',
  },
  previewMacro: {
    fontSize: 13,
    color: '#AAA',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnAzioneModifica: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAzioneTestoScuro: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnAzioneConferma: {
    flex: 2,
    backgroundColor: '#4A6741',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAzioneTestoChiaro: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
