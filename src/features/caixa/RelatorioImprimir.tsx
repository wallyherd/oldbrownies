import { X, Printer, Download } from 'lucide-react'
import type { MovimentacaoCaixa } from '@/lib/db/tipos'
import { reais } from '@/lib/formato'
import { Botao } from '@/components/ui/basicos'

interface Props {
  aberto: boolean
  aoFechar: () => void
  movimentacoes: MovimentacaoCaixa[]
  periodoRotulo: string
  empresaNome: string
}

export function RelatorioImprimir({
  aberto,
  aoFechar,
  movimentacoes,
  periodoRotulo,
  empresaNome,
}: Props) {
  if (!aberto) return null

  const totalEntradas = movimentacoes
    .filter((m) => m.tipo === 'entrada')
    .reduce((s, m) => s + m.valor, 0)

  const totalSaidas = movimentacoes
    .filter((m) => m.tipo === 'saida')
    .reduce((s, m) => s + m.valor, 0)

  const saldoLiquido = totalEntradas - totalSaidas

  // Agrupamento por categoria
  const porCategoria = movimentacoes.reduce((acc, m) => {
    if (!acc[m.categoria]) acc[m.categoria] = { entradas: 0, saidas: 0, total: 0 }
    if (m.tipo === 'entrada') {
      acc[m.categoria].entradas += m.valor
    } else {
      acc[m.categoria].saidas += m.valor
    }
    acc[m.categoria].total = acc[m.categoria].entradas - acc[m.categoria].saidas
    return acc
  }, {} as Record<string, { entradas: number; saidas: number; total: number }>)

  function exportarCsv() {
    const cabecalho = ['Data', 'Tipo', 'Categoria', 'Descricao', 'Detalhes', 'Pagamento', 'Valor (R$)']
    const linhas = movimentacoes.map((m) => [
      m.data.slice(0, 10),
      m.tipo.toUpperCase(),
      `"${m.categoria.replace(/"/g, '""')}"`,
      `"${m.descricao.replace(/"/g, '""')}"`,
      `"${(m.detalhes ?? '').replace(/"/g, '""')}"`,
      m.formaPagamento ?? '',
      m.valor.toFixed(2).replace('.', ','),
    ])

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas.map((l) => l.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-caixa-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl rounded-deco border border-fio bg-carvao p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Barra superior de ações */}
        <div className="flex items-center justify-between border-b border-fio pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="font-titulo text-base sm:text-lg font-bold text-osso tracking-wider">
              Relatório de Fluxo de Caixa
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-ouro/15 text-ouro font-semibold">
              {periodoRotulo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={exportarCsv} aria-label="Exportar CSV">
              <Download className="size-4 shrink-0" />
              <span className="hidden sm:inline">CSV</span>
            </Botao>
            <Botao onClick={() => window.print()} aria-label="Imprimir">
              <Printer className="size-4 shrink-0" />
              <span className="hidden sm:inline">Imprimir</span>
            </Botao>
            <button
              type="button"
              onClick={aoFechar}
              className="rounded p-1 text-cinza hover:text-osso ml-1"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo do Relatório */}
        <div className="overflow-y-auto pt-4 space-y-6 flex-1 pr-1 text-osso print:text-black">
          {/* Cabeçalho da Empresa */}
          <div className="border-b border-fio pb-4">
            <p className="font-titulo text-lg font-bold tracking-widest text-ouro">
              {empresaNome || 'OLD BROWNIES'}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold mt-1">Demonstrativo de Fluxo de Caixa</h1>
            <p className="text-xs text-cinza mt-0.5">
              Período: {periodoRotulo} · Gerado em: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Cards Resumo Geral */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-deco border border-fio bg-grafite/40 p-3">
              <p className="text-[11px] text-cinza font-bold uppercase tracking-wider">Entradas</p>
              <p className="text-base sm:text-lg font-bold text-verde font-mono mt-1">
                {reais(totalEntradas)}
              </p>
            </div>
            <div className="rounded-deco border border-fio bg-grafite/40 p-3">
              <p className="text-[11px] text-cinza font-bold uppercase tracking-wider">Saídas</p>
              <p className="text-base sm:text-lg font-bold text-vermelho font-mono mt-1">
                {reais(totalSaidas)}
              </p>
            </div>
            <div className="rounded-deco border border-fio bg-grafite/40 p-3">
              <p className="text-[11px] text-cinza font-bold uppercase tracking-wider">Saldo Líquido</p>
              <p
                className={`text-base sm:text-lg font-bold font-mono mt-1 ${
                  saldoLiquido >= 0 ? 'text-ouro' : 'text-vermelho'
                }`}
              >
                {reais(saldoLiquido)}
              </p>
            </div>
            <div className="rounded-deco border border-fio bg-grafite/40 p-3">
              <p className="text-[11px] text-cinza font-bold uppercase tracking-wider">Lançamentos</p>
              <p className="text-base sm:text-lg font-bold text-osso font-mono mt-1">
                {movimentacoes.length}
              </p>
            </div>
          </div>

          {/* Tabela de Resumo por Categoria */}
          <div>
            <h3 className="font-titulo text-sm uppercase tracking-wider font-bold mb-2 text-ouro">
              Totais por Categoria
            </h3>
            <div className="rounded-deco border border-fio overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-grafite text-cinza border-b border-fio">
                  <tr>
                    <th className="p-2.5">Categoria</th>
                    <th className="p-2.5 text-right">Entradas</th>
                    <th className="p-2.5 text-right">Saídas</th>
                    <th className="p-2.5 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fio">
                  {Object.entries(porCategoria).map(([cat, val]) => (
                    <tr key={cat} className="hover:bg-grafite/30">
                      <td className="p-2.5 font-medium">{cat}</td>
                      <td className="p-2.5 text-right text-verde font-mono">
                        {val.entradas ? reais(val.entradas) : '—'}
                      </td>
                      <td className="p-2.5 text-right text-vermelho font-mono">
                        {val.saidas ? reais(val.saidas) : '—'}
                      </td>
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          val.total >= 0 ? 'text-osso' : 'text-vermelho'
                        }`}
                      >
                        {reais(val.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalhamento de Movimentações */}
          <div>
            <h3 className="font-titulo text-sm uppercase tracking-wider font-bold mb-2 text-ouro">
              Extrato Discriminado de Lançamentos ({movimentacoes.length})
            </h3>
            <div className="rounded-deco border border-fio overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-grafite text-cinza border-b border-fio">
                  <tr>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Categoria</th>
                    <th className="p-2.5">Descrição / Produtos</th>
                    <th className="p-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fio">
                  {movimentacoes.map((m) => (
                    <tr key={m.id} className="hover:bg-grafite/30">
                      <td className="p-2.5 font-mono text-cinza whitespace-nowrap">
                        {m.data.slice(8, 10)}/{m.data.slice(5, 7)}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            m.tipo === 'entrada'
                              ? 'bg-verde/15 text-verde'
                              : 'bg-vermelho/15 text-vermelho'
                          }`}
                        >
                          {m.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium">{m.categoria}</td>
                      <td className="p-2.5 max-w-[200px] truncate" title={m.detalhes || m.descricao}>
                        <span>{m.descricao}</span>
                        {m.detalhes && (
                          <span className="block text-[11px] text-cinza truncate">
                            {m.detalhes}
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-2.5 text-right font-mono font-bold whitespace-nowrap ${
                          m.tipo === 'entrada' ? 'text-verde' : 'text-vermelho'
                        }`}
                      >
                        {m.tipo === 'entrada' ? '+' : '−'} {reais(m.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
