import { useMemo } from 'react'
import { Tela, Secao } from '@/components/ui/Tela'
import { Barra, Numero, Aviso, Selo } from '@/components/ui/basicos'
import { useCadastros } from '@/lib/dados/cadastros'
import { useSessao } from '@/lib/sessao'
import { useResumoVendas, useChecklist } from '@/lib/dados/hooks'
import type { ResumoVenda } from '@/lib/dados/indicadores'
import { diaComercial, inicioSemana, somarDias, inicioMes, diasEntre } from '@/lib/motor/dia'
import { reais, pct, dataCurta } from '@/lib/formato'
import { montarDia } from '@/features/checklist/tarefas'
import { calcularPagamento } from '@/lib/motor/funcionario'

export function MinhaSemana() {
  const cad = useCadastros()
  const sessao = useSessao()
  const hoje = diaComercial(new Date(), cad.config.horaViradaDia)
  const segunda = inicioSemana(hoje)
  const domingo = somarDias(segunda, 6)
  const mesAtual = inicioMes(hoje)

  // Vendas da semana (segunda a domingo)
  const vendasSemana = useResumoVendas(segunda, domingo) ?? []
  // Vendas do mês para cálculo de comissão
  const vendasMes = useResumoVendas(mesAtual, hoje) ?? []

  // Checklist da equipe
  const checklist = useChecklist(mesAtual, hoje)

  // Faturamento da semana (loja + ifood)
  const faturamentoSemana = useMemo(() => {
    return vendasSemana
      .filter((r: ResumoVenda) => r.venda.canal === 'loja' || r.venda.canal === 'ifood')
      .reduce((s: number, r: ResumoVenda) => s + r.bruto, 0)
  }, [vendasSemana])

  // Pedidos do iFood nesta semana
  const pedidosIfoodSemana = useMemo(() => {
    return vendasSemana.filter((r: ResumoVenda) => r.venda.canal === 'ifood').length
  }, [vendasSemana])

  // Metas da semana (da tabela 2.8 ou padrão)
  // Meta padrão proporcional aos 15/dia na loja + iFood
  const metaRS = 1750
  const superMetaRS = Math.ceil(metaRS * 1.2) // 2.100

  // Funcionária
  const func = cad.funcionarios.find((f) => f.membroId === sessao.membroId) ?? cad.funcionarios[0]

  // Faturamento do mês loja e ifood
  const brutoMesLoja = useMemo(() => {
    return vendasMes.filter((r: ResumoVenda) => r.venda.canal === 'loja').reduce((s: number, r: ResumoVenda) => s + r.bruto, 0)
  }, [vendasMes])

  const brutoMesIfood = useMemo(() => {
    return vendasMes.filter((r: ResumoVenda) => r.venda.canal === 'ifood').reduce((s: number, r: ResumoVenda) => s + r.bruto, 0)
  }, [vendasMes])

  // Checklist cumprimento %
  const pctChecklist = useMemo(() => {
    if (!checklist) return 1
    const totalDias = diasEntre(mesAtual, hoje) + 1
    let feitasTotal = 0
    let obrigTotal = 0
    for (let i = 0; i < totalDias; i++) {
      const d = somarDias(mesAtual, i)
      const tarefas = montarDia(checklist, d, 'equipe', hoje).filter((t) => t.rotinaTarefaId && t.obrigatoria)
      obrigTotal += tarefas.length
      feitasTotal += tarefas.filter((t) => t.status === 'feito').length
    }
    return obrigTotal > 0 ? feitasTotal / obrigTotal : 1
  }, [checklist, mesAtual, hoje])

  // Simulação de pagamento/recebimento dela (sem custos da empresa)
  const estimativa = useMemo(() => {
    if (!func) return null
    return calcularPagamento({
      fase: func.fase,
      diasNoMes: 30,
      diasNestaFase: 30,
      baseLoja: brutoMesLoja,
      baseIfood: brutoMesIfood,
      fatorDsr: cad.config.fatorDsr ?? 0.20,
      semanas: [{ meta: faturamentoSemana >= metaRS, superMeta: faturamentoSemana >= superMetaRS }],
      notaIfood: 5.0,
      cancelamentosFalhaLoja: 0,
      checklistEquipe: pctChecklist,
      trimestreBateuMeta: false,
      usaVT: func.usaVT,
      viagensDia: func.viagensDia,
      diasMesVT: func.diasMesVT,
      tarifaOnibus: cad.config.tarifaOnibus ?? 4.95,
      encargosFolha: cad.config.encargosFolha ?? 0.30,
    })
  }, [func, brutoMesLoja, brutoMesIfood, cad.config, faturamentoSemana, metaRS, superMetaRS, pctChecklist])

  return (
    <Tela titulo="Minha semana" subtitulo={`${dataCurta(segunda)} a ${dataCurta(domingo)}`}>
      <Secao titulo="Faturamento × Meta (Loja + iFood)">
        <div className="space-y-3 rounded-deco border border-fio bg-carvao p-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="rotulo">Realizado na semana</p>
              <p className="text-2xl font-bold text-osso">{reais(faturamentoSemana)}</p>
            </div>
            <div className="text-right">
              <p className="rotulo">Meta da semana</p>
              <p className="text-lg font-bold text-cinza">{reais(metaRS)}</p>
              <p className="text-xs text-cinza">Super meta: {reais(superMetaRS)}</p>
            </div>
          </div>

          <Barra valor={faturamentoSemana} meta={metaRS} />

          {faturamentoSemana >= superMetaRS ? (
            <Aviso tom="ok">Parabéns! Super meta da semana atingida!</Aviso>
          ) : faturamentoSemana >= metaRS ? (
            <Aviso tom="ok">
              Meta batida! Faltam {reais(superMetaRS - faturamentoSemana)} para a super meta (+20%).
            </Aviso>
          ) : (
            <Aviso tom="aviso">
              Faltam {reais(metaRS - faturamentoSemana)} para bater a meta da semana.
            </Aviso>
          )}

          <div className="flex justify-between text-xs text-cinza pt-1">
            <span>Pedidos iFood: {pedidosIfoodSemana}</span>
            <span>Meta: 10 a 15 pedidos</span>
          </div>
        </div>
      </Secao>

      {func && (
        <Secao titulo="Minha Remuneração Estimada (Mês)">
          <div className="rounded-deco border border-fio bg-carvao p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-fio">
              <div>
                <p className="font-bold text-base text-osso">{func.nome}</p>
                <p className="text-xs text-cinza capitalize">Fase: {func.fase}</p>
              </div>
              <Selo tom={func.fase === 'experiencia' ? 'aviso' : 'ok'}>{func.fase}</Selo>
            </div>

            {estimativa && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cinza">Salário-base</span>
                  <span className="font-bold">{reais(estimativa.salarioBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cinza">Comissão loja (4%)</span>
                  <span className="font-bold">{reais(brutoMesLoja * 0.04)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cinza">Comissão iFood (3%)</span>
                  <span className="font-bold">{reais(brutoMesIfood * 0.03)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cinza">DSR sobre comissão (20%)</span>
                  <span className="font-bold">{reais(estimativa.dsr)}</span>
                </div>
                {estimativa.bonusSemana > 0 && (
                  <div className="flex justify-between text-verde">
                    <span>Bônus da semana</span>
                    <span className="font-bold">+{reais(estimativa.bonusSemana)}</span>
                  </div>
                )}
                {estimativa.bonusQualidade > 0 && (
                  <div className="flex justify-between text-verde">
                    <span>Bônus de qualidade</span>
                    <span className="font-bold">+{reais(estimativa.bonusQualidade)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-fio flex justify-between text-base font-bold text-ouro">
                  <span>Total estimado a receber</span>
                  <span>{reais(estimativa.recebe)}</span>
                </div>
              </div>
            )}
          </div>
        </Secao>
      )}

      <Secao titulo="Meu Checklist no Mês">
        <div className="rounded-deco border border-fio bg-carvao p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Numero rotulo="Cumprimento" valor={pct(pctChecklist)} tom={pctChecklist >= 0.9 ? 'ok' : 'aviso'} />
            <div className="text-right">
              <p className="rotulo">Meta de qualidade</p>
              <p className="text-base font-bold text-cinza">90% dos dias</p>
            </div>
          </div>
          {pctChecklist >= 0.9 ? (
            <Aviso tom="ok">Rotina em dia! Qualidade acima de 90%.</Aviso>
          ) : (
            <Aviso tom="aviso">Abaixo de 90%. Fique atenta às tarefas diárias obrigatórias.</Aviso>
          )}
        </div>
      </Secao>
    </Tela>
  )
}
