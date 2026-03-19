// Componente ricerca ingredienti via Open Food Facts con gestione multi-ingrediente
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nanoid } from 'nanoid/non-secure';
import { macroIngrediente, sommaIngredienti } from '../lib/calcoli';
import type { Ingrediente, FoodSearchResult } from '../types/index';

interface Props {
  ingredienti: Ingrediente[];
  onChange: (ingredienti: Ingrediente[]) => void;
}

// ─── API Open Food Facts ────────────────────────────────────────────────────

async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?` +
    `search_terms=${encodeURIComponent(query)}&` +
    `search_simple=1&action=process&json=1&page_size=8&` +
    `fields=id,product_name,brands,nutriments`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.products || [])
    .filter(
      (p: Record<string, unknown>) =>
        p.product_name &&
        (p.nutriments as Record<string, unknown>)?.proteins_100g != null &&
        (p.nutriments as Record<string, unknown>)?.carbohydrates_100g != null &&
        (p.nutriments as Record<string, unknown>)?.fat_100g != null
    )
    .map((p: Record<string, unknown>): FoodSearchResult => {
      const n = p.nutriments as Record<string, number>;
      return {
        id: (p.id as string) || (p.code as string) || nanoid(),
        nome: p.product_name as string,
        brand: (p.brands as string) || '',
        per100: {
          proteine: Number(n.proteins_100g) || 0,
          carboidrati: Number(n.carbohydrates_100g) || 0,
          grassi: Number(n.fat_100g) || 0,
        },
      };
    });
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function FoodSearchInput({ ingredienti, onChange }: Props): React.JSX.Element {
  const [ricercaAperta, setRicercaAperta] = useState(false);
  const [query, setQuery] = useState('');
  const [risultati, setRisultati] = useState<FoodSearchResult[]>([]);
  const [cercando, setCercando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totali = sommaIngredienti(ingredienti);

  // Debounce ricerca
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setRisultati([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCercando(true);
      try {
        const res = await searchFoods(text.trim());
        setRisultati(res);
      } catch {
        setRisultati([]);
      } finally {
        setCercando(false);
      }
    }, 600);
  }, []);

  const aggiungiDaRicerca = useCallback(
    (food: FoodSearchResult) => {
      const nuovo: Ingrediente = {
        uid: nanoid(),
        nome: food.nome,
        brand: food.brand,
        grammi: 100,
        per100: food.per100,
      };
      onChange([...ingredienti, nuovo]);
      setRicercaAperta(false);
      setQuery('');
      setRisultati([]);
    },
    [ingredienti, onChange]
  );

  const aggiornaGrammi = useCallback(
    (uid: string, delta: number) => {
      onChange(
        ingredienti.map((ing) =>
          ing.uid === uid ? { ...ing, grammi: Math.max(10, ing.grammi + delta) } : ing
        )
      );
    },
    [ingredienti, onChange]
  );

  const rimuovi = useCallback(
    (uid: string) => {
      onChange(ingredienti.filter((ing) => ing.uid !== uid));
    },
    [ingredienti, onChange]
  );

  return (
    <View style={styles.container}>
      {/* Totale macro header (se ci sono ingredienti) */}
      {ingredienti.length > 0 && (
        <View style={styles.totaleHeader}>
          <Text style={styles.totaleKcal}>{totali.kcal} kcal</Text>
          <View style={styles.totaleMacroRiga}>
            <Text style={styles.totaleP}>P {totali.proteine_g}g</Text>
            <Text style={styles.totaleC}>C {totali.carboidrati_g}g</Text>
            <Text style={styles.totaleG}>G {totali.grassi_g}g</Text>
          </View>
        </View>
      )}

      {/* Lista ingredienti aggiunti */}
      {ingredienti.map((ing) => {
        const m = macroIngrediente(ing.per100, ing.grammi);
        return (
          <View key={ing.uid} style={styles.ingredienteCard}>
            <View style={styles.ingHeader}>
              <View style={styles.ingColorDot} />
              <View style={styles.ingInfo}>
                <Text style={styles.ingNome} numberOfLines={1}>
                  {ing.nome}
                </Text>
                {ing.brand !== '' && (
                  <Text style={styles.ingBrand} numberOfLines={1}>
                    {ing.brand}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => rimuovi(ing.uid)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color="#D45B5B" />
              </TouchableOpacity>
            </View>

            {/* Macro calcolati */}
            <View style={styles.ingMacroRiga}>
              <Text style={styles.ingMacro}>
                P {m.proteine}g · C {m.carboidrati}g · G {m.grassi}g · {m.kcal} kcal
              </Text>
            </View>

            {/* Grammi con +/- */}
            <View style={styles.grammiRiga}>
              <TouchableOpacity
                style={styles.grammiBtn}
                onPress={() => aggiornaGrammi(ing.uid, -10)}
              >
                <Text style={styles.grammiBtnTesto}>-</Text>
              </TouchableOpacity>
              <Text style={styles.grammiValore}>{ing.grammi}g</Text>
              <TouchableOpacity
                style={styles.grammiBtn}
                onPress={() => aggiornaGrammi(ing.uid, 10)}
              >
                <Text style={styles.grammiBtnTesto}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Vista ricerca expanded */}
      {ricercaAperta ? (
        <View style={styles.ricercaBox}>
          <View style={styles.ricercaInputRiga}>
            <TextInput
              style={styles.ricercaInput}
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Cerca alimento..."
              placeholderTextColor="#555555"
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={() => {
                setRicercaAperta(false);
                setQuery('');
                setRisultati([]);
              }}
            >
              <Text style={styles.annullaBtn}>Annulla</Text>
            </TouchableOpacity>
          </View>

          {cercando && <ActivityIndicator size="small" color="#4A6741" style={styles.loader} />}

          {risultati.length > 0 && (
            <FlatList
              data={risultati}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.risultatiLista}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.risultatoCard}
                  onPress={() => aggiungiDaRicerca(item)}
                >
                  <Text style={styles.risultatoNome} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  {item.brand !== '' && (
                    <Text style={styles.risultatoBrand} numberOfLines={1}>
                      {item.brand}
                    </Text>
                  )}
                  <Text style={styles.risultatoMacro}>
                    P {item.per100.proteine}g · C {item.per100.carboidrati}g · G{' '}
                    {item.per100.grassi}g / 100g
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}

          {!cercando && query.length >= 2 && risultati.length === 0 && (
            <Text style={styles.nessunRisultato}>Nessun risultato</Text>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.aggiungiBtn}
          onPress={() => setRicercaAperta(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#3A6EA5" />
          <Text style={styles.aggiungiBtnTesto}>Aggiungi ingrediente</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 8 },

  // Totale header
  totaleHeader: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  totaleKcal: { fontSize: 22, fontWeight: '700', color: '#D4A84B' },
  totaleMacroRiga: { flexDirection: 'row', gap: 16 },
  totaleP: { fontSize: 13, fontWeight: '600', color: '#5DB85D' },
  totaleC: { fontSize: 13, fontWeight: '600', color: '#D4A84B' },
  totaleG: { fontSize: 13, fontWeight: '600', color: '#D45B5B' },

  // Ingrediente card
  ingredienteCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#333333',
  },
  ingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A6741',
  },
  ingInfo: { flex: 1 },
  ingNome: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  ingBrand: { fontSize: 11, color: '#888888' },
  ingMacroRiga: { paddingLeft: 16 },
  ingMacro: { fontSize: 12, color: '#AAAAAA' },
  grammiRiga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 4,
  },
  grammiBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grammiBtnTesto: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  grammiValore: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', minWidth: 50, textAlign: 'center' },

  // Ricerca
  ricercaBox: { gap: 8 },
  ricercaInputRiga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ricercaInput: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  annullaBtn: { fontSize: 14, color: '#888888' },
  loader: { marginVertical: 8 },
  risultatiLista: { maxHeight: 250 },
  risultatoCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  risultatoNome: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  risultatoBrand: { fontSize: 11, color: '#888888', marginTop: 1 },
  risultatoMacro: { fontSize: 12, color: '#AAAAAA', marginTop: 4 },
  nessunRisultato: { fontSize: 13, color: '#555555', textAlign: 'center', paddingVertical: 12 },

  // Bottone aggiungi
  aggiungiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  aggiungiBtnTesto: { fontSize: 14, fontWeight: '600', color: '#3A6EA5' },
});
