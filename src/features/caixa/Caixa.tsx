import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  FileText,
  Filter,
  Plus,
  Minus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react'
import { db } from '@/lib/db/banco'
import type { TipoMovimentacaoCaixa } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { reais } from '@/lib/formato'
import { Campo } from '@/components/ui/basicos'
import { Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { categoriaParaCanal, excluirMovimentacao, formatarItensVendaCaixa } from '@/lib/operacoes/caixa'
import { GraficosCaixa } from './GraficosCaixa'
import { ModalLancamento } from './ModalLancamento'
import { RelatorioImprimir } from './RelatorioImprimir'

type TipoPeriodo = 'hoje' | '7dias' | 'mes' | '30dias' | 'personalizado'

export function Caixa() {
  const sessao = useSessao()
  const cad = useCadastros()
  const [periodo, setPeriodo] = useState<TipoPeriodo>('mes')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10))

  const [abaAtiva, setAbaAtiva] = useState<'extrato' | 'graficos'>('extrato')
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'entrada' | 'saida'>('todas')
  const [busca, setBusca] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [modalTipo, setModalTipo] = useState<TipoMovimentacaoCaixa>('saida')
  const [relatorioAberto, setRelatorioAberto] = useState(false)

  // Atualiza datas quando o atalho de período muda
  function mudarPeriodo(p: TipoPeriodo) {
    setPeriodo(p)
    const hoje = new Date()
    const hojeStr = hoje.toISOString().slice(0, 10)

    if (p === 'hoje') {
      setDataInicio(hojeStr)
      setDataFim(hojeStr)
    } else if (p === '7dias') {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 6)
      setDataInicio(d7.toISOString().slice(0, 10))
      setDataFim(hojeStr)
    } else if (p === 'mes') {
      setDataInicio(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`)
      setDataFim(hojeStr)
    } else if (p === '30dias') {
      const d30 = new Date()
      d30.setDate(d30.getDate() - 29)
      setDataInicio(d30.toISOString().slice(0, 10))
      setDataFim(hojeStr)
    }
  }

  // Carrega todas as movimentações da empresa
  const todasMovs = useLiveQuery(
    () =>
      db.movimentacoesCaixa
        .where('empresaId')
        .equals(sessao.empresaId)
        .filter((m) => !m.deletedAt)
        .toArray(),
    [sessao.empresaId],
  )

  // Migração/Sincronização suave de vendas legadas para o caixa se ainda não constarem
  useEffect(() => {
    async function reconciliarVendasLegadas() {
      try {
        const vendas = (await db.vendas.where('empresaId').equals(sessao.empresaId).toArray()).filter(
          (v) => !v.deletedAt,
        )
        const movs = await db.movimentacoesCaixa.where('empresaId').equals(sessao.empresaId).toArray()
        const refsExistentes = new Set(movs.map((m) => m.referenciaId).filter(Boolean))

        for (const v of vendas) {
          if (!refsExistentes.has(v.id)) {
            const itens = (await db.vendaItens.where('vendaId').equals(v.id).toArray()).filter(
              (i) => !i.deletedAt,
            )
            const valorTotal = itens.reduce((s, i) => s + i.qtd * i.precoUnitario, 0)
            if (valorTotal > 0) {
              const categoria = categoriaParaCanal(v.canal)
              const detalhes = formatarItensVendaCaixa(
                itens,
                (sId) => cad.saborPorId.get(sId)?.nome,
                (pId) => cad.produtoPorId.get(pId)?.nome,
              )
              const agora = new Date().toISOString()
              await db.movimentacoesCaixa.add({
                id: crypto.randomUUID(),
                empresaId: sessao.empresaId,
                data: v.data.slice(0, 10),
                tipo: 'entrada',
                categoria,
                descricao: v.observacao ? `${categoria} · ${v.observacao}` : categoria,
                valor: valorTotal,
                formaPagamento: v.pagamento,
                origem: 'venda',
                referenciaId: v.id,
                detalhes,
                registradoPor: v.registradaPor || sessao.nome,
                createdAt: v.createdAt || agora,
                updatedAt: agora,
                updatedBy: sessao.userId,
                deletedAt: null,
              })
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao reconciliar vendas legadas no caixa:', err)
      }
    }
    void reconciliarVendasLegadas()
  }, [sessao.empresaId, sessao.userId, sessao.nome, cad])

  // Filtra as movimentações pelo período e pelos filtros de visualização
  const movsNoPeriodo = useMemo(() => {
    if (!todasMovs) return []
    return todasMovs
      .filter((m) => {
        const d = m.data.slice(0, 10)
        return d >= dataInicio && d <= dataFim
      })
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt))
  }, [todasMovs, dataInicio, dataFim])

  const movsFiltradas = useMemo(() => {
    return movsNoPeriodo.filter((m) => {
      if (filtroTipo !== 'todas' && m.tipo !== filtroTipo) return false
      if (busca.trim()) {
        const q = busca.toLowerCase()
        const cat = m.categoria.toLowerCase()
        const desc = m.descricao.toLowerCase()
        const det = (m.detalhes ?? '').toLowerCase()
        if (!cat.includes(q) && !desc.includes(q) && !det.includes(q)) return false
      }
      return true
    })
  }, [movsNoPeriodo, filtroTipo, busca])

  // Totais
  const totalEntradas = useMemo(
    () =>
      movsNoPeriodo.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0),
    [movsNoPeriodo],
  )
  const totalSaidas = useMemo(
    () =>
      movsNoPeriodo.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0),
    [movsNoPeriodo],
  )
  const saldoLiquido = totalEntradas - totalSaidas

  async function handleExcluir(id: string, categoria: string, valor: number) {
    if (!window.confirm(`Deseja excluir a movimentação "${categoria}" de ${reais(valor)}?`)) return
    try {
      await excluirMovimentacao(id)
      mostrarToast('Movimentação excluída do caixa.')
    } catch (err) {
      mostrarErro(err)
    }
  }

  const periodoRotulo = useMemo(() => {
    if (periodo === 'hoje') return 'Hoje'
    if (periodo === '7dias') return 'Últimos 7 dias'
    if (periodo === 'mes') return 'Este Mês'
    if (periodo === '30dias') return 'Últimos 30 dias'
    return `${dataInicio.slice(8, 10)}/${dataInicio.slice(5, 7)} a ${dataFim.slice(8, 10)}/${dataFim.slice(5, 7)}`
  }, [periodo, dataInicio, dataFim])

  return (
    <Tela
      titulo="Caixa"
      subtitulo="Controle financeiro e fluxo de caixa"
      acao={
        <button
          type="button"
          onClick={() => setRelatorioAberto(true)}
          className="flex items-center gap-1.5 rounded-deco border border-ouro/40 bg-ouro/10 px-3 py-1.5 text-xs font-bold text-ouro hover:bg-ouro/20"
        >
          <FileText className="size-4" />
          <span className="hidden sm:inline">Relatório</span>
        </button>
      }
    >
      {/* 1. Barra de Período */}
      <section className="space-y-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <Calendar className="size-4 text-cinza shrink-0 mr-1" />
          {(['hoje', '7dias', 'mes', '30dias', 'personalizado'] as TipoPeriodo[]).map((p) => {
            const rotulos: Record<TipoPeriodo, string> = {
              hoje: 'Hoje',
              '7dias': '7 Dias',
              mes: 'Este Mês',
              '30dias': '30 Dias',
              personalizado: 'Personalizado',
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => mudarPeriodo(p)}
                className={`rounded-deco px-3 py-1 font-bold whitespace-nowrap transition-colors ${
                  periodo === p
                    ? 'bg-osso text-carvao'
                    : 'border border-fio bg-carvao text-cinza hover:text-osso'
                }`}
              >
                {rotulos[p]}
              </button>
            )
          })}
        </div>

        {periodo === 'personalizado' && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-fio">
            <Campo
              rotulo="De"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <Campo
              rotulo="Até"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        )}
      </section>

      {/* 2. Resumo de Métricas (Grade Art Deco) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Entradas */}
        <div className="rounded-deco border border-verde/30 bg-verde/5 p-3 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-verde font-bold uppercase tracking-wider">
            <span>Entradas</span>
            <ArrowDownLeft className="size-4 shrink-0 text-verde" />
          </div>
          <p className="font-titulo text-lg sm:text-2xl font-bold text-verde mt-1 font-mono">
            {reais(totalEntradas)}
          </p>
        </div>

        {/* Saídas */}
        <div className="rounded-deco border border-vermelho/30 bg-vermelho/5 p-3 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-vermelho font-bold uppercase tracking-wider">
            <span>Saídas</span>
            <ArrowUpRight className="size-4 shrink-0 text-vermelho" />
          </div>
          <p className="font-titulo text-lg sm:text-2xl font-bold text-vermelho mt-1 font-mono">
            {reais(totalSaidas)}
          </p>
        </div>

        {/* Saldo Líquido */}
        <div
          className={`rounded-deco border p-3 sm:p-4 relative overflow-hidden ${
            saldoLiquido >= 0
              ? 'border-ouro/30 bg-ouro/5 text-ouro'
              : 'border-vermelho/40 bg-vermelho/10 text-vermelho'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cinza">
            <span>Saldo Líquido</span>
            <Wallet className="size-4 shrink-0" />
          </div>
          <p
            className={`font-titulo text-lg sm:text-2xl font-bold mt-1 font-mono ${
              saldoLiquido >= 0 ? 'text-ouro' : 'text-vermelho'
            }`}
          >
            {reais(saldoLiquido)}
          </p>
        </div>

        {/* Total Lançamentos */}
        <div className="rounded-deco border border-fio bg-carvao p-3 sm:p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cinza">
            <span>Lançamentos</span>
            <Filter className="size-4 shrink-0" />
          </div>
          <p className="font-titulo text-lg sm:text-2xl font-bold text-osso mt-1 font-mono">
            {movsNoPeriodo.length}
          </p>
        </div>
      </section>

      {/* 3. Ações de Adicionar Entrada / Saída */}
      <section className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setModalTipo('entrada')
            setModalAberto(true)
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-deco border border-verde/40 bg-verde/15 hover:bg-verde/25 py-3 text-sm font-bold text-verde active:scale-[0.98] transition-all"
        >
          <Plus className="size-4" /> Nova Entrada
        </button>

        <button
          type="button"
          onClick={() => {
            setModalTipo('saida')
            setModalAberto(true)
          }}
          className="flex-1 flex items-center justify-center gap-2 rounded-deco border border-vermelho/40 bg-vermelho/15 hover:bg-vermelho/25 py-3 text-sm font-bold text-vermelho active:scale-[0.98] transition-all"
        >
          <Minus className="size-4" /> Nova Saída
        </button>
      </section>

      {/* 4. Abas de Visualização (Extrato vs Gráficos) */}
      <section className="space-y-4">
        <div className="flex border-b border-fio">
          <button
            type="button"
            onClick={() => setAbaAtiva('extrato')}
            className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              abaAtiva === 'extrato'
                ? 'border-ouro text-ouro'
                : 'border-transparent text-cinza hover:text-osso'
            }`}
          >
            Extrato Discriminado ({movsFiltradas.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('graficos')}
            className={`flex-1 py-2 text-center text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              abaAtiva === 'graficos'
                ? 'border-ouro text-ouro'
                : 'border-transparent text-cinza hover:text-osso'
            }`}
          >
            Gráficos & Análise
          </button>
        </div>

        {/* Conteúdo Aba: Gráficos */}
        {abaAtiva === 'graficos' && <GraficosCaixa movimentacoes={movsNoPeriodo} />}

        {/* Conteúdo Aba: Extrato */}
        {abaAtiva === 'extrato' && (
          <div className="space-y-3">
            {/* Filtros da lista */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
                <input
                  type="text"
                  placeholder="Buscar categoria, detalhe..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="campo w-full pl-9 text-xs"
                />
              </div>
              <div className="flex rounded-deco border border-fio p-0.5 bg-carvao">
                {(['todas', 'entrada', 'saida'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFiltroTipo(t)}
                    className={`px-2.5 py-1 text-xs font-bold rounded capitalize transition-colors ${
                      filtroTipo === t
                        ? 'bg-osso text-carvao'
                        : 'text-cinza hover:text-osso'
                    }`}
                  >
                    {t === 'todas' ? 'Todas' : t === 'entrada' ? 'Entradas' : 'Saídas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Movimentações */}
            {movsFiltradas.length === 0 ? (
              <div className="rounded-deco border border-fio bg-carvao p-8 text-center text-cinza">
                Nenhuma movimentação encontrada para os filtros selecionados.
              </div>
            ) : (
              <ul className="divide-y divide-fio rounded-deco border border-fio bg-carvao overflow-hidden">
                {movsFiltradas.map((m) => {
                  const ehEntrada = m.tipo === 'entrada'
                  const dataFormatada =
                    m.data.slice(8, 10) + '/' + m.data.slice(5, 7)

                  return (
                    <li
                      key={m.id}
                      className="p-3.5 flex items-start justify-between gap-3 hover:bg-grafite/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Ícone Indicador */}
                        <div
                          className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            ehEntrada
                              ? 'bg-verde/15 text-verde border border-verde/30'
                              : 'bg-vermelho/15 text-vermelho border border-vermelho/30'
                          }`}
                        >
                          {ehEntrada ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </div>

                        {/* Textos e Detalhes */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-osso">
                              {m.categoria}
                            </span>
                            {m.origem === 'venda' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-ouro/15 text-ouro font-semibold">
                                Venda Automática
                              </span>
                            )}
                            {m.formaPagamento && (
                              <span className="text-[11px] text-cinza uppercase">
                                · {m.formaPagamento}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-cinza mt-0.5">{m.descricao}</p>

                          {/* Detalhes de Produtos e Quantidades */}
                          {m.detalhes && (
                            <div className="mt-1.5 p-2 rounded bg-grafite/60 border border-fio text-xs text-osso/90">
                              <span className="text-[11px] text-ouro font-bold block mb-0.5">
                                Itens vendidos:
                              </span>
                              {m.detalhes}
                            </div>
                          )}

                          <span className="text-[11px] text-cinza/80 mt-1 block font-mono">
                            {dataFormatada} {m.registradoPor ? `· por ${m.registradoPor}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Valor e Ações */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span
                          className={`font-titulo text-base font-bold font-mono ${
                            ehEntrada ? 'text-verde' : 'text-vermelho'
                          }`}
                        >
                          {ehEntrada ? '+' : '−'} {reais(m.valor)}
                        </span>

                        {m.origem === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleExcluir(m.id, m.categoria, m.valor)}
                            className="p-1 text-cinza hover:text-vermelho transition-colors"
                            title="Excluir lançamento manual"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Modal de Novo Lançamento */}
      <ModalLancamento
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        tipoInicial={modalTipo}
      />

      {/* Modal de Relatório para Impressão e CSV */}
      <RelatorioImprimir
        aberto={relatorioAberto}
        aoFechar={() => setRelatorioAberto(false)}
        movimentacoes={movsNoPeriodo}
        periodoRotulo={periodoRotulo}
        empresaNome={cad.empresa.nome}
      />
    </Tela>
  )
}
