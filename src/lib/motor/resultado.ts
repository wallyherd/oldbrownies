// B5.8 — resultado do mês e equilíbrio.
import type { GrupoCusto } from '@/lib/db/tipos'

export type FixosPorGrupo = Record<GrupoCusto, number>

export function somarFixos(
  custos: Array<{ valorMensal: number; grupo: GrupoCusto; visibilidade: 'todos' | 'mentor' }>,
  incluirMentor = false,
): FixosPorGrupo {
  const soma: FixosPorGrupo = { ponto: 0, empresa: 0, pessoal: 0, divida: 0 }
  for (const c of custos) {
    if (c.visibilidade === 'mentor' && !incluirMentor) continue
    soma[c.grupo] += c.valorMensal
  }
  return soma
}

export interface EntradaResultado {
  margem: number
  faturamento: number
  fixos: FixosPorGrupo
  provisaoImposto: number
  custoFuncionario?: number
  mensalidadeIfood?: number
}

export function resultadoMes(e: EntradaResultado) {
  // A Maria Eduarda já deve vir desativada no banco, mas por segurança não contamos se houver funcionária.
  let fixosEmpresa = e.fixos.ponto + e.fixos.empresa
  if (e.custoFuncionario !== undefined) {
    fixosEmpresa += e.custoFuncionario
  }
  if (e.mensalidadeIfood) {
    fixosEmpresa += e.mensalidadeIfood
  }
  const imposto = e.faturamento * e.provisaoImposto
  const lucroEmpresa = e.margem - fixosEmpresa - imposto
  const sobra = lucroEmpresa - e.fixos.pessoal - e.fixos.divida
  const faltaParaOAzul = Math.max(0, fixosEmpresa + e.fixos.pessoal + e.fixos.divida + imposto - e.margem)
  return { fixosEmpresa, imposto, lucroEmpresa, sobra, faltaParaOAzul }
}

export function equilibrioEmPecas(
  custosMês: number, // fixos da empresa + contas pessoais + dívida + etc
  precoMedio: number,
  taxaMaquininha: number,
  provisaoImposto: number,
  custoVariavelMixPequeno: number,
  comissaoLoja: number,
  fatorDsr: number,
  encargosFolha: number
): number {
  const lucroLoja = precoMedio * (1 - taxaMaquininha - provisaoImposto) - custoVariavelMixPequeno - precoMedio * comissaoLoja * (1 + fatorDsr) * (1 + encargosFolha)
  return lucroLoja > 0 ? custosMês / lucroLoja : Infinity
}

// Ritmo linear: o que foi feito até hoje, esticado para o mês inteiro.
export function projetarMes(valorAteHoje: number, diaDoMes: number, diasNoMes: number): number {
  return diaDoMes > 0 ? (valorAteHoje / diaDoMes) * diasNoMes : 0
}
