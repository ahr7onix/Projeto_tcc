import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, spacing, typography } from '@/lib/theme';

export interface PontoGrafico {
  data: string;
  valor: number;
  /**
   * Cor só deste ponto, quando ele destoa da série. É o que deixa uma glicemia
   * fora da faixa vermelha no meio de uma linha azul.
   */
  cor?: string;
}

/** Faixa alvo pintada ao fundo, para ler o gráfico sem conferir número a número. */
export interface FaixaAlvo {
  min: number;
  max: number;
}

interface Props {
  pontos: PontoGrafico[];
  unidade?: string;
  cor?: string;
  altura?: number;
  vazio?: string;
  faixa?: FaixaAlvo;
}

const MARGEM = { topo: 14, direita: 10, base: 22, esquerda: 38 };

const formatarData = (iso: string): string => {
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
};

/** Uma casa decimal só quando o número precisa: 72 e 72,4. */
const formatarValor = (valor: number): string =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',');

/**
 * Gráfico de linha em SVG, irmão do que o painel web desenha.
 *
 * A largura é medida no layout em vez de sair de um viewBox: com viewBox o
 * texto escalaria junto com o desenho e os rótulos do eixo ficariam de
 * tamanhos diferentes em cada aparelho.
 */
export function GraficoLinha({
  pontos,
  unidade = '',
  cor = colors.primary,
  altura = 180,
  vazio = 'Sem medidas suficientes para montar o gráfico.',
  faixa,
}: Props) {
  const [largura, setLargura] = useState(0);

  const medir = (evento: LayoutChangeEvent) => {
    const nova = evento.nativeEvent.layout.width;
    if (nova !== largura) setLargura(nova);
  };

  if (pontos.length === 0) {
    return (
      <View style={[styles.vazio, { height: altura }]}>
        <Text style={styles.vazioTexto}>{vazio}</Text>
      </View>
    );
  }

  // A faixa entra na escala: sem isso, uma série inteira dentro do alvo
  // deixaria a faixa fora da área desenhada e o fundo apareceria vazio.
  const valores = pontos.map((p) => p.valor);
  if (faixa) valores.push(faixa.min, faixa.max);

  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  // Série constante viraria uma linha colada na borda: abre uma folga fixa.
  const folga = maior === menor ? Math.max(1, maior * 0.05) : (maior - menor) * 0.15;
  const topo = maior + folga;
  const base = menor - folga;

  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = altura - MARGEM.topo - MARGEM.base;

  const x = (i: number) =>
    pontos.length === 1
      ? MARGEM.esquerda + larguraUtil / 2
      : MARGEM.esquerda + (i / (pontos.length - 1)) * larguraUtil;
  const y = (valor: number) =>
    MARGEM.topo + alturaUtil - ((valor - base) / (topo - base)) * alturaUtil;

  const coordenadas = pontos.map((p, i) => ({ ...p, cx: x(i), cy: y(p.valor) }));
  const linha = coordenadas.map((p) => `${p.cx},${p.cy}`).join(' ');

  // Com faixa alvo, as marcas do eixo são os limites dela: ler "180" e "70"
  // diz alguma coisa, ler a média entre o maior e o menor valor não diz nada.
  const marcas = (faixa ? [topo, faixa.max, faixa.min, base] : [topo, (topo + base) / 2, base])
    .map((valor) => ({
      valor,
      y: y(valor),
      limiteDaFaixa: faixa ? valor === faixa.max || valor === faixa.min : false,
    }))
    // Dois rótulos a menos de 12px viram um borrão: fica o de cima.
    .filter((marca, i, todas) => i === 0 || marca.y - todas[i - 1].y > 12);

  return (
    // Leitores de tela não enxergam o SVG: a série inteira vai no rótulo.
    <View
      onLayout={medir}
      style={{ height: altura }}
      accessible
      accessibilityLabel={`Evolução: ${coordenadas
        .map((p) => `${formatarData(p.data)} ${formatarValor(p.valor)}${unidade}`)
        .join(', ')}`}
    >
      {largura > 0 ? (
        <Svg width={largura} height={altura}>
          {faixa ? (
            <Rect
              x={MARGEM.esquerda}
              y={y(faixa.max)}
              width={larguraUtil}
              height={y(faixa.min) - y(faixa.max)}
              fill={colors.successSoft}
            />
          ) : null}

          {marcas.map((marca) => (
            <Line
              key={`linha-${marca.valor}`}
              x1={MARGEM.esquerda}
              y1={marca.y}
              x2={largura - MARGEM.direita}
              y2={marca.y}
              stroke={marca.limiteDaFaixa ? colors.success : colors.border}
              strokeWidth={1}
              strokeDasharray={marca.limiteDaFaixa ? '4 4' : undefined}
            />
          ))}

          {marcas.map((marca) => (
            <SvgText
              key={`rotulo-${marca.valor}`}
              x={MARGEM.esquerda - 6}
              y={marca.y + 4}
              textAnchor="end"
              fontSize={10}
              fill={colors.textMuted}
            >
              {formatarValor(Number(marca.valor.toFixed(1)))}
            </SvgText>
          ))}

          <Polyline
            points={linha}
            fill="none"
            stroke={cor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coordenadas.map((p, i) => (
            <Circle
              key={`ponto-${p.data}-${i}`}
              cx={p.cx}
              cy={p.cy}
              r={4}
              fill={colors.surface}
              stroke={p.cor ?? cor}
              strokeWidth={2}
            />
          ))}

          {/* Só as pontas ganham rótulo: com muitas medidas o eixo vira borrão. */}
          <SvgText
            x={MARGEM.esquerda}
            y={altura - 6}
            textAnchor="start"
            fontSize={10}
            fill={colors.textMuted}
          >
            {formatarData(coordenadas[0].data)}
          </SvgText>
          {coordenadas.length > 1 ? (
            <SvgText
              x={largura - MARGEM.direita}
              y={altura - 6}
              textAnchor="end"
              fontSize={10}
              fill={colors.textMuted}
            >
              {formatarData(coordenadas[coordenadas.length - 1].data)}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  vazioTexto: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
