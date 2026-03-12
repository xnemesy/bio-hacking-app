// Grafico a barre orizzontali SVG — volume per gruppo muscolare
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import type { BarraVolume } from '../hooks/useProgressi';

interface Props {
  data: BarraVolume[];
  title?: string;
}

const COLORI_GRUPPO: Record<string, string> = {
  Petto: '#5DB85D',
  Schiena: '#3A6EA5',
  Spalle: '#D4A84B',
  Deltoidi: '#D4A84B',
  Gambe: '#A55A3A',
  Bicipiti: '#6A3AA5',
  Tricipiti: '#A5853A',
  Core: '#3AA5A5',
  Cardio: '#D45B5B',
  Altro: '#555555',
};

const BAR_H = 20;
const BAR_GAP = 10;
const PAD_L = 80;  // etichette gruppo
const PAD_R = 48;  // etichette volume
const PAD_T = 8;
const PAD_B = 4;

export default function GraficoColonne({ data, title }: Props): React.JSX.Element {
  const { width: winW } = useWindowDimensions();
  const svgW = winW - 32;
  const barW = svgW - PAD_L - PAD_R;

  const { barre, svgH } = useMemo(() => {
    if (data.length === 0) return { barre: [], svgH: 60 };
    const maxVol = Math.max(...data.map((d) => d.volume));
    const h = PAD_T + data.length * (BAR_H + BAR_GAP) - BAR_GAP + PAD_B;
    return {
      barre: data.map((d, i) => ({
        ...d,
        y: PAD_T + i * (BAR_H + BAR_GAP),
        barWidth: maxVol > 0 ? (d.volume / maxVol) * barW : 0,
        colore: COLORI_GRUPPO[d.gruppo] ?? '#555555',
      })),
      svgH: h,
    };
  }, [data, barW]);

  const isEmpty = data.length === 0;

  return (
    <View style={styles.container}>
      {title !== undefined && title !== '' && (
        <Text style={styles.title}>{title}</Text>
      )}

      {isEmpty ? (
        <View style={styles.vuoto}>
          <Text style={styles.vuotoTesto}>Nessun allenamento registrato</Text>
        </View>
      ) : (
        <Svg width={svgW} height={svgH}>
          {barre.map((b, i) => (
            <React.Fragment key={i}>
              {/* Etichetta gruppo */}
              <SvgText
                x={PAD_L - 6}
                y={b.y + BAR_H / 2 + 4}
                fontSize="11"
                fill="#CCCCCC"
                textAnchor="end"
              >
                {b.gruppo}
              </SvgText>

              {/* Sfondo barra */}
              <Rect
                x={PAD_L} y={b.y}
                width={barW} height={BAR_H}
                rx="4" fill="#2A2A2A"
              />

              {/* Barra dati */}
              <Rect
                x={PAD_L} y={b.y}
                width={Math.max(b.barWidth, 2)} height={BAR_H}
                rx="4" fill={b.colore}
                fillOpacity="0.85"
              />

              {/* Etichetta volume */}
              <SvgText
                x={PAD_L + barW + 6}
                y={b.y + BAR_H / 2 + 4}
                fontSize="10"
                fill="#888888"
                textAnchor="start"
              >
                {b.volume > 999
                  ? `${(b.volume / 1000).toFixed(1)}t`
                  : `${b.volume}kg`}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#242424',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  vuoto: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vuotoTesto: {
    fontSize: 13,
    color: '#444444',
    fontStyle: 'italic',
  },
});
