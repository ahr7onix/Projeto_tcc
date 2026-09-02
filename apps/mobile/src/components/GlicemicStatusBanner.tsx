import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useAccessibleMode } from '@/hooks/use-accessible-mode';
import {
  buscarUltimaGlicemia,
  type ClassificacaoGlicemia,
} from '@/lib/api/registros';
import { colors, radius, spacing, typography } from '@/lib/theme';

/** Acima disso, o valor é velho demais para ser tratado como "estado atual". */
const LIMITE_MINUTOS_LEITURA_RECENTE = 4 * 60;

const CONDUTA: Record<ClassificacaoGlicemia, string> = {
  hipoglicemia_grave: 'Procure atendimento médico imediatamente.',
  hipoglicemia:
    'Consuma algo com açúcar de ação rápida (suco, mel, refrigerante comum) e meça novamente em 15 minutos.',
  normal: 'Continue seu acompanhamento normalmente.',
  hiperglicemia:
    'Beba água, evite carboidratos agora e monitore novamente daqui a pouco.',
  hiperglicemia_grave: 'Procure atendimento médico o quanto antes.',
};

const LABEL: Record<ClassificacaoGlicemia, string> = {
  hipoglicemia_grave: 'Hipoglicemia grave',
  hipoglicemia: 'Hipoglicemia',
  normal: 'Normal',
  hiperglicemia: 'Hiperglicemia',
  hiperglicemia_grave: 'Hiperglicemia grave',
};

function tintDaSeveridade(severidade: 'critico' | 'atencao' | 'normal') {
  if (severidade === 'critico') {
    return { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as const };
  }
  if (severidade === 'atencao') {
    return { bg: colors.warningSoft, fg: colors.warning, icon: 'warning' as const };
  }
  return { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' as const };
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()} às ${hora}:${min}`;
}

export function GlicemicStatusBanner() {
  const { isSimplified } = useAccessibleMode();

  const { data } = useQuery({
    queryKey: ['glicemia-ultimo'],
    queryFn: buscarUltimaGlicemia,
    refetchInterval: 5 * 60 * 1000,
  });

  const registro = data?.registro ?? null;
  const semLeituraRecente =
    !registro || registro.minutosDesdeRegistro > LIMITE_MINUTOS_LEITURA_RECENTE;

  if (!registro) {
    return null;
  }

  if (semLeituraRecente) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.topo}>
          <Ionicons name="time-outline" size={isSimplified ? 26 : 20} color={colors.textMuted} />
          <Text style={[styles.status, isSimplified && styles.statusGrande, { color: colors.textMuted }]}>
            Sem leitura recente de glicemia
          </Text>
        </View>
        <Text style={[styles.corpo, isSimplified && styles.corpoGrande]}>
          Sua última medição foi em {formatarDataHora(registro.dataHora)}. Registre uma nova
          leitura para acompanhar seu estado atual.
        </Text>
      </View>
    );
  }

  const tint = tintDaSeveridade(registro.avaliacao.severidade);
  const rotulo = LABEL[registro.avaliacao.classificacao];
  const conduta = CONDUTA[registro.avaliacao.classificacao];

  return (
    <View style={[styles.card, { backgroundColor: tint.bg }]}>
      <View style={styles.topo}>
        <Ionicons name={tint.icon} size={isSimplified ? 30 : 22} color={tint.fg} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.valor, isSimplified && styles.valorGrande, { color: tint.fg }]}>
            {registro.valor} mg/dL
          </Text>
          <Text style={[styles.status, isSimplified && styles.statusGrande, { color: tint.fg }]}>
            {rotulo}
          </Text>
        </View>
      </View>

      <Text style={[styles.quando, isSimplified && styles.corpoGrande]}>
        {formatarDataHora(registro.dataHora)}
      </Text>

      <Text style={[styles.corpo, isSimplified && styles.corpoGrande, { color: tint.fg }]}>
        {conduta}
      </Text>

      <Text style={[styles.disclaimer, isSimplified && styles.disclaimerGrande]}>
        Isto é uma ferramenta de apoio e não substitui avaliação médica. Em caso de emergência,
        procure atendimento imediatamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    elevation: 2,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  valor: { ...typography.h2, fontWeight: '800' },
  valorGrande: { fontSize: 30 },
  status: { ...typography.caption, fontWeight: '700' },
  statusGrande: { fontSize: 16 },
  quando: { ...typography.caption, color: colors.textMuted },
  corpo: { ...typography.body, lineHeight: 20 },
  corpoGrande: { fontSize: 17, lineHeight: 24 },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  disclaimerGrande: { fontSize: 13, lineHeight: 18 },
});
