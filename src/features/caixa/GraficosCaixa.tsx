import { useMemo } from 'react'
import type { MovimentacaoCaixa } from '@/lib/db/tipos'
import { reais } from '@/lib/formato'

interface Props {
  movimentacoes: MovimentacaoCaixa[]
}

const CORES_CATEGORIAS: Record<string, string> = {
  'Matéria Prima': '#f59e0b',
  'Pessoal': '#3b82f6',
  'Fornecedor': '#8b5cf6',
  'Aluguel Empresarial': '#ec4899',
  'Máquinas': '#14b8a6',
  'Marketing': '#f97316',
  'Logística': '#64748b',
  'Venda Pontos Comerciais': '#10b981',
  'Venda Balcão / Loja': '#06b6d4',
  'Venda Evento / Feira': '#84cc16',
  'Aporte': '#a855f7',
  'Outro': '#d97706',
}

function corCategoria(nome: string): string {
  return CORES_CATEGORIAS[nome] ?? '#94a3b8'
}

export function GraficosCaixa({ movimentacoes }: Props) {
  // 1. Agrupamento por Categoria (Saídas e Entradas separadas)
  const { categoriasSaida, categoriasEntrada, totalSaidas, totalEntradas } = useMemo(() => {
    const mapaSaidas: Record<string, number> = {}
    const mapaEntradas: Record<string, number> = {}
    let totS = 0
    let totE = 0

    for (const m of movimentacoes) {
      if (m.tipo === 'saida') {
        mapaSaidas[m.categoria] = (mapaSaidas[m.categoria] ?? 0) + m.valor
        totS += m.valor
      } else {
        mapaEntradas[m.categoria] = (mapaEntradas[m.categoria] ?? 0) + m.valor
        totE += m.valor
      }
    }

    const sortCat = (mapa: Record<string, number>, total: number) =>
      Object.entries(mapa)
        .map(([categoria, valor]) => ({
          categoria,
          valor,
          pct: total > 0 ? (valor / total) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor)

    return {
      categoriasSaida: sortCat(mapaSaidas, totS),
      categoriasEntrada: sortCat(mapaEntradas, totE),
      totalSaidas: totS,
      totalEntradas: totE,
    }
  }, [movimentacoes])

  // 2. Agrupamento por Dia (para gráfico de barras comparativo)
  const dadosDiarios = useMemo(() => {
    const mapa: Record<string, { data: string; entradas: number; saidas: number }> = {}
    for (const m of movimentacoes) {
      const d = m.data.slice(0, 10)
      if (!mapa[d]) mapa[d] = { data: d, entradas: 0, saidas: 0 }
      if (m.tipo === 'entrada') mapa[d].entradas += m.valor
      else mapa[d].saidas += m.valor
    }
    const ordenados = Object.values(mapa).sort((a, b) => a.data.localeCompare(b.data))
    return ordenados
  }, [movimentacoes])

  // 3. Evolução do Saldo Acumulado
  const evolucaoSaldo = useMemo(() => {
    let acumulado = 0
    return dadosDiarios.map((d) => {
      acumulado += d.entradas - d.saidas
      return { data: d.data, saldo: acumulado }
    })
  }, [dadosDiarios])

  const maxDiario = useMemo(() => {
    let max = 100
    for (const d of dadosDiarios) {
      if (d.entradas > max) max = d.entradas
      if (d.saidas > max) max = d.saidas
    }
    return max
  }, [dadosDiarios])

  if (!movimentacoes.length) {
    return (
      <div className="rounded-deco border border-fio bg-carvao p-6 text-center text-cinza">
        Sem movimentações registradas no período para gerar gráficos.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Gráfico 1: Comparativo Entradas vs Saídas por Data */}
      <section className="rounded-deco border border-fio bg-carvao p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-sm uppercase tracking-wider text-osso font-bold">
            Entradas vs. Saídas por Data
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-verde">
              <span className="size-2.5 rounded-full bg-verde inline-block" /> Entradas
            </span>
            <span className="flex items-center gap-1.5 text-vermelho">
              <span className="size-2.5 rounded-full bg-vermelho inline-block" /> Saídas
            </span>
          </div>
        </div>

        {dadosDiarios.length === 0 ? (
          <p className="text-xs text-cinza py-4 text-center">Nenhum dado diário.</p>
        ) : (
          <div className="space-y-2 pt-2">
            <div className="flex items-end gap-2 overflow-x-auto pb-2 pt-4 px-1 min-h-[160px]">
              {dadosDiarios.map((item) => {
                const altE = Math.max(4, Math.round((item.entradas / maxDiario) * 110))
                const altS = Math.max(4, Math.round((item.saidas / maxDiario) * 110))
                const diaFormatado = item.data.slice(8, 10) + '/' + item.data.slice(5, 7)

                return (
                  <div key={item.data} className="flex flex-col items-center flex-1 min-w-[42px] max-w-[60px] group">
                    <div className="flex items-end gap-1 h-[120px] w-full justify-center">
                      {/* Barra Entrada */}
                      <div
                        style={{ height: `${altE}px` }}
                        className="w-3.5 rounded-t bg-verde/80 hover:bg-verde transition-all relative"
                        title={`Entradas: ${reais(item.entradas)}`}
                      />
                      {/* Barra Saída */}
                      <div
                        style={{ height: `${altS}px` }}
                        className="w-3.5 rounded-t bg-vermelho/80 hover:bg-vermelho transition-all relative"
                        title={`Saídas: ${reais(item.saidas)}`}
                      />
                    </div>
                    <span className="text-[10px] text-cinza mt-1 font-mono">{diaFormatado}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Gráfico 2: Despesas por Categoria */}
      <section className="rounded-deco border border-fio bg-carvao p-4 space-y-3">
        <h3 className="font-titulo text-sm uppercase tracking-wider text-osso font-bold">
          Saídas por Categoria ({reais(totalSaidas)})
        </h3>

        {categoriasSaida.length === 0 ? (
          <p className="text-xs text-cinza py-2">Nenhuma saída no período.</p>
        ) : (
          <div className="space-y-3 pt-1">
            {categoriasSaida.map((cat) => (
              <div key={cat.categoria} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-osso flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full inline-block"
                      style={{ backgroundColor: corCategoria(cat.categoria) }}
                    />
                    {cat.categoria}
                  </span>
                  <span className="text-cinza font-mono">
                    {reais(cat.valor)} <span className="text-[11px]">({cat.pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-grafite rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, cat.pct)}%`,
                      backgroundColor: corCategoria(cat.categoria),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gráfico 3: Entradas por Categoria */}
      <section className="rounded-deco border border-fio bg-carvao p-4 space-y-3">
        <h3 className="font-titulo text-sm uppercase tracking-wider text-osso font-bold">
          Entradas por Categoria ({reais(totalEntradas)})
        </h3>

        {categoriasEntrada.length === 0 ? (
          <p className="text-xs text-cinza py-2">Nenhuma entrada no período.</p>
        ) : (
          <div className="space-y-3 pt-1">
            {categoriasEntrada.map((cat) => (
              <div key={cat.categoria} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-osso flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full inline-block"
                      style={{ backgroundColor: corCategoria(cat.categoria) }}
                    />
                    {cat.categoria}
                  </span>
                  <span className="text-cinza font-mono">
                    {reais(cat.valor)} <span className="text-[11px]">({cat.pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-grafite rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, cat.pct)}%`,
                      backgroundColor: corCategoria(cat.categoria),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gráfico 4: Evolução do Saldo Acumulado */}
      {evolucaoSaldo.length > 1 && (
        <section className="rounded-deco border border-fio bg-carvao p-4 space-y-3">
          <h3 className="font-titulo text-sm uppercase tracking-wider text-osso font-bold">
            Trajetória do Saldo Acumulado
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {evolucaoSaldo.slice(-4).map((item) => (
              <div key={item.data} className="rounded border border-fio bg-grafite/50 p-2 text-center">
                <p className="text-[10px] text-cinza font-mono">
                  {item.data.slice(8, 10)}/{item.data.slice(5, 7)}
                </p>
                <p
                  className={`text-sm font-bold font-mono mt-0.5 ${
                    item.saldo >= 0 ? 'text-ouro' : 'text-vermelho'
                  }`}
                >
                  {reais(item.saldo)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
