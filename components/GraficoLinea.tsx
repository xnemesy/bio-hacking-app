// Grafico a linea SVG — bilancio calorico 30 giorni
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import type { PuntoBilancio } from '../hooks/useProgressi';

interface Props {
  data: PuntoBilancio[];
  title?: string;
}

// Layout fisso
const PAD_L = 52;   // spazio asse Y + etichette
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 28;   // spazio asse X + etichette
const H_PLOT = 160; // altezza area dati
const H_SVG = H_PLOT + PAD_T + PAD_B;

/** Genera 4 label Y spaziati uniformemente */
function yLabels(min: number, max: number): number[] {
  const step = (max - min) / 3;
  return [min, min + step, min + 2 * step, max].map((v) => Math.round(v));
}

export default function GraficoLinea({ data, title }: Props): React.JSX.Element {
  const { width: winW } = useWindowDimensions();
  const svgW = winW - 32; // padding schermata
  const plotW = svgW - PAD_L - PAD_R;

  const { path, zeroY, puntiCerchi, yMin, yMax, yLabs, xEtichette } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', zeroY: PAD_T + H_PLOT / 2, puntiCerchi: [], yMin: -500, yMax: 500, yLabs: [], xEtichette: [] };
    }

    const valori = data.map((d) => d.bilancio);
    const rawMin = Math.min(...valori);
    const rawMax = Math.max(...valori);
    const pad = Math.max(Math.abs(rawMax - rawMin) * 0.15, 150);
    const yMinC = rawMin - pad;
    const yMaxC = rawMax + pad;
    const range = yMaxC - yMinC;

    const toY = (v: number): number =>
      PAD_T + ((yMaxC - v) / range) * H_PLOT;

    const toX = (i: number): number =>
      PAD_L + (i / Math.max(data.length - 1, 1)) * plotW;

    // Linea SVG path
    const p = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.bilancio).toFixed(1)}`)
      .join(' ');

    // Cerchi dei data points (ogni 3 giorni)
    const cerchi = data
      .filter((_, i) => i % 3 === 0 || i === data.length - 1)
      .map((d, _, arr) => {
        const origIdx = data.indexOf(d);
        return {
          cx: toX(origIdx),
          cy: toY(d.bilancio),
          positivo: d.bilancio >= 0,
          label: d.label,
        };
      });

    // Zero line Y position
    const zY = toY(0);

    // X etichette: ogni 7 giorni + l'ultimo
    const xEt = data
      .filter((_, i) => i === 0 || i % 7 === 0 || i === data.length - 1)
      .map((d, _, arr) => ({ label: d.label, x: toX(data.indexOf(d)) }));

    return {
      path: p,
      zeroY: zY,
      puntiCerchi: cerchi,
      yMin: yMinC,
      yMax: yMaxC,
      yLabs: yLabels(yMinC, yMaxC),
      xEtichette: xEt,
    };
  }, [data, plotW]);

  const isEmpty = data.length === 0;

  return (
    <View style={styles.container}>
      {title !== undefined && title !== '' && (
        <Text style={styles.title}>{title}</Text>
      )}

      {isEmpty ? (
        <View style={styles.vuoto}>
          <Text style={styles.vuotoTesto}>Nessun dato disponibile</Text>
        </View>
      ) : (
        <Svg width={svgW} height={H_SVG}>
          <Defs>
            <SvgGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4A6741" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#4A6741" stopOpacity="0" />
            </SvgGradient>
            <SvgGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#D45B5B" stopOpacity="0" />
              <Stop offset="1" stopColor="#D45B5B" stopOpacity="0.3" />
            </SvgGradient>
          </Defs>

          {/* Linee guida Y orizzontali */}
          {yLabs.map((v) => {
            const y = PAD_T + ((yMax - v) / (yMax - yMin)) * H_PLOT;
            return (
              <React.Fragment key={v}>
                <Line
                  x1={PAD_L} y1={y} x2={svgW - PAD_R} y2={y}
                  stroke="#2A2A2A" strokeWidth="1"
                />
                <SvgText
                  x={PAD_L - 4} y={y + 4}
                  fontSize="9" fill="#666666"
                  textAnchor="end"
                >
                  {v > 0 ? `+${v}` : String(v)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Zero line tratteggiata */}
          <Line
            x1={PAD_L} y1={zeroY} x2={svgW - PAD_R} y2={zeroY}
            stroke="#555555" strokeWidth="1.5" strokeDasharray="4,3"
          />
          <SvgText x={PAD_L - 4} y={zeroY + 4} fontSize="9" fill="#888888" textAnchor="end">0</SvgText>

          {/* Linea dati */}
          <Path d={path} fill="none" stroke="#4A6741" strokeWidth="2" strokeLinejoin="round" />

          {/* Cerchi data points */}
          {puntiCerchi.map((p, i) => (
            <Circle
              key={i}
              cx={p.cx} cy={p.cy}
              r={3}
              fill={p.positivo ? '#4A6741' : '#D45B5B'}
              stroke="#1A1A1A"
              strokeWidth="1.5"
            />
          ))}

          {/* Etichette X */}
          {xEtichette.map((e, i) => (
            <SvgText
              key={i}
              x={e.x} y={H_SVG - 4}
              fontSize="9" fill="#666666"
              textAnchor="middle"
            >
              {e.label}
            </SvgText>
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
    height: H_SVG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vuotoTesto: {
    fontSize: 13,
    color: '#444444',
    fontStyle: 'italic',
  },
});
