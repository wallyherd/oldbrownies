import type { Funcionario } from '@/lib/db/tipos'

export type FaseFuncionario = 'experiencia' | 'nivel1' | 'nivel2' | 'nivel3'

const FASES = {
  experiencia: { salarioBase: 1621, comissaoLoja: 0.04, comissaoIfood: 0.03, temBonusSemana: false, temBonusQualidade: false, temBonusTri: false },
  nivel1: { salarioBase: 1800, comissaoLoja: 0.04, comissaoIfood: 0.03, temBonusSemana: true, temBonusQualidade: true, temBonusTri: false },
  nivel2: { salarioBase: 2000, comissaoLoja: 0.05, comissaoIfood: 0.04, temBonusSemana: true, temBonusQualidade: true, temBonusTri: false },
  nivel3: { salarioBase: 2300, comissaoLoja: 0.05, comissaoIfood: 0.04, temBonusSemana: true, temBonusQualidade: true, temBonusTri: true },
}

export interface SemanasBateuMeta {
  meta: boolean
  superMeta: boolean
}

export interface EntradasPagamento {
  fase: FaseFuncionario
  diasNoMes: number
  diasNestaFase: number // para o cálculo proporcional do salário base
  baseLoja: number
  baseIfood: number
  fatorDsr: number
  semanas: SemanasBateuMeta[]
  notaIfood: number
  cancelamentosFalhaLoja: number
  checklistEquipe: number // percentual de 0 a 1
  trimestreBateuMeta: boolean
  usaVT: boolean
  viagensDia: number
  diasMesVT: number
  tarifaOnibus: number
  encargosFolha: number
}

// B5.14
export function calcularPagamento(e: EntradasPagamento) {
  const fase = FASES[e.fase]
  
  // Salário-base proporcional
  const salarioBase = (fase.salarioBase / e.diasNoMes) * e.diasNestaFase

  // Comissão e DSR
  const comissao = (fase.comissaoLoja * e.baseLoja) + (fase.comissaoIfood * e.baseIfood)
  const dsr = comissao * e.fatorDsr

  // Bônus Semana
  let bonusSemana = 0
  if (fase.temBonusSemana) {
    for (const sem of e.semanas) {
      if (sem.superMeta) bonusSemana += 100
      else if (sem.meta) bonusSemana += 50
    }
  }

  // Bônus Qualidade
  let bonusQualidade = 0
  if (fase.temBonusQualidade) {
    if (e.notaIfood >= 4.7 && e.cancelamentosFalhaLoja === 0 && e.checklistEquipe >= 0.9) {
      bonusQualidade = 100
    }
  }

  // Bônus Trimestre
  let bonusTrimestre = 0
  if (fase.temBonusTri && e.trimestreBateuMeta) {
    bonusTrimestre = 500
  }

  const recebe = salarioBase + comissao + dsr + bonusSemana + bonusQualidade + bonusTrimestre

  // Vale Transporte (Desconto máximo de 6% do salário-base integral ou proporcional?)
  // A regra: max(0, custo integral do VT - 6% do salario base)
  let vtEmpresa = 0
  if (e.usaVT) {
    const custoVT = e.viagensDia * e.tarifaOnibus * e.diasMesVT
    const desconto = 0.06 * salarioBase
    vtEmpresa = Math.max(0, custoVT - desconto)
  }

  const custoEmpresa = recebe * (1 + e.encargosFolha) + vtEmpresa

  return {
    salarioBase,
    comissao,
    dsr,
    bonusSemana,
    bonusQualidade,
    bonusTrimestre,
    recebe,
    vtEmpresa,
    custoEmpresa,
  }
}

export function diasFaltandoExperiencia(f: Funcionario, hoje: string): number {
  if (f.fase !== 'experiencia') return 0
  if (hoje > f.fimExperiencia) return 0
  const d1 = new Date(hoje).getTime()
  const d2 = new Date(f.fimExperiencia).getTime()
  return Math.ceil((d2 - d1) / (1000 * 3600 * 24))
}

export function alertasFuncionario(funcionarios: Funcionario[], hoje: string) {
  const alertas: Array<{ tom: 'ok' | 'aviso' | 'alerta', texto: string, link: string }> = []
  
  for (const f of funcionarios) {
    if (f.fase === 'experiencia') {
      const faltam = diasFaltandoExperiencia(f, hoje)
      if (faltam === 0) {
        alertas.push({ tom: 'alerta', texto: `A experiência de ${f.nome} acaba hoje! Registre o resultado.`, link: '/mais/equipe' })
      } else if (faltam <= 15) {
        alertas.push({ tom: 'aviso', texto: `Faltam ${faltam} dias para o fim da experiência de ${f.nome}.`, link: '/mais/equipe' })
      }
    } else if (f.fase === 'nivel2' || f.fase === 'nivel3') {
      alertas.push({ tom: 'ok', texto: `Acompanhe o progresso de metas de ${f.nome} (${f.fase}).`, link: '/mais/equipe' })
    }
  }
  
  return alertas
}
