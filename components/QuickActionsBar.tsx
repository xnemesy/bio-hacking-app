import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import type { Sessione } from '../types/index';

interface Props {
  giornoId: string;
  data: string;
  sessione: Sessione | null;
  omega3: boolean;
  onRefresh: () => Promise<void>;
  onOpenPasto: () => void;
}

/** Cerca record Extra di oggi. Se non c'è, lo crea vuoto */
async function getOrCreateExtraRecord(giornoId: string) {
  const { data: existing, error: errCerca } = await supabase
    .from('pasti')
    .select('id, acqua_ml, omega3')
    .eq('giorno_id', giornoId)
    .eq('tipo_pasto', 'Extra')
    .maybeSingle();

  if (errCerca) throw errCerca;

  if (existing) {
    return existing;
  }

  // Create new
  const { data: nuovo, error: errInsert } = await supabase
    .from('pasti')
    .insert({
      giorno_id: giornoId,
      tipo_pasto: 'Extra',
      proteine_g: 0,
      carboidrati_g: 0,
      grassi_g: 0,
      acqua_ml: 0,
      omega3: false,
    })
    .select('id, acqua_ml, omega3')
    .single();

  if (errInsert) throw errInsert;
  return nuovo;
}

export default function QuickActionsBar({
  giornoId,
  data,
  sessione,
  omega3,
  onRefresh,
  onOpenPasto,
}: Props): React.JSX.Element {
  const navigation = useNavigation<any>();
  const [loadingAcqua, setLoadingAcqua] = useState(false);
  const [loadingOmega, setLoadingOmega] = useState(false);

  // Quick Action Acqua (Default 250ml)
  const handleAddAcqua = async (ml: number = 250) => {
    setLoadingAcqua(true);
    try {
      const extra = await getOrCreateExtraRecord(giornoId);
      await supabase
        .from('pasti')
        .update({ acqua_ml: extra.acqua_ml + ml })
        .eq('id', extra.id);
        
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.warn);
      await onRefresh();
    } catch (e) {
      console.error('Errore aggiunta acqua:', e);
    } finally {
      setLoadingAcqua(false);
    }
  };

  const handleLongPressAcqua = () => {
    Alert.alert('Seleziona quantità', 'Aggiungi acqua al totale di oggi', [
      { text: '100ml', onPress: () => handleAddAcqua(100) },
      { text: '250ml', onPress: () => handleAddAcqua(250) },
      { text: '500ml', onPress: () => handleAddAcqua(500) },
      { text: '750ml', onPress: () => handleAddAcqua(750) },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  // Quick Action Omega-3
  const handleToggleOmega3 = async () => {
    setLoadingOmega(true);
    try {
      const extra = await getOrCreateExtraRecord(giornoId);
      await supabase
        .from('pasti')
        .update({ omega3: !omega3 })
        .eq('id', extra.id);
        
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(console.warn);
      await onRefresh();
    } catch (e) {
      console.error('Errore toggle omega3:', e);
    } finally {
      setLoadingOmega(false);
    }
  };

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {/* Botton + Pasto */}
      <TouchableOpacity 
        style={styles.pill} 
        activeOpacity={0.7}
        onPress={onOpenPasto}
      >
        <Text style={styles.pillIcon}>🍽️</Text>
        <Text style={styles.pillText}>+ Pasto</Text>
      </TouchableOpacity>

      {/* Bottone Acqua */}
      <TouchableOpacity 
        style={styles.pill} 
        activeOpacity={0.7}
        onPress={() => handleAddAcqua(250)}
        onLongPress={handleLongPressAcqua}
        disabled={loadingAcqua}
      >
        {loadingAcqua ? (
          <ActivityIndicator size="small" color="#FFF" style={styles.indicator} />
        ) : (
          <Text style={styles.pillIcon}>💧</Text>
        )}
        <Text style={styles.pillText}>+ 250ml</Text>
      </TouchableOpacity>

      {/* Bottone Sessione */}
      <TouchableOpacity 
        style={[styles.pill, sessione ? styles.pillAttiva : undefined]} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Allenamento')}
      >
        <Text style={styles.pillIcon}>💪</Text>
        <Text style={[styles.pillText, sessione ? styles.pillTextAttivo : undefined]}>
          {sessione ? 'Sessione in corso' : '+ Sessione'}
        </Text>
      </TouchableOpacity>

      {/* Bottone Omega-3 */}
      <TouchableOpacity 
        style={[styles.pill, omega3 ? styles.pillAttiva : undefined]} 
        activeOpacity={0.7}
        onPress={handleToggleOmega3}
        disabled={loadingOmega}
      >
        {loadingOmega ? (
          <ActivityIndicator size="small" color="#FFF" style={styles.indicator} />
        ) : (
          <Text style={styles.pillIcon}>{omega3 ? '✔' : '💊'}</Text>
        )}
        <Text style={[styles.pillText, omega3 ? styles.pillTextAttivo : undefined]}>
          Omega-3
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 44,
    minHeight: 44,
  },
  container: {
    gap: 10,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  pillAttiva: {
    backgroundColor: '#4A6741',
    borderColor: '#5A7F51',
  },
  pillIcon: {
    fontSize: 16,
  },
  pillText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextAttivo: {
    color: '#FFF',
  },
  indicator: {
    marginRight: 4,
  }
});
