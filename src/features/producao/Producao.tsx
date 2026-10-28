import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus } from 'lucide-react'
import type { CodigoTamanho } from '@/lib/db/tipos'
import { useSessao, veCustos } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { lerDaEmpresa, useHoje } from '@/lib/dados/consultas'
import { dataCurta, numero, reais } from '@/lib/formato'
import { registrarProducao } from '@/lib/operacoes/estoque'
import { Botao, Campo, Numero } from '@/components/ui/basicos'
import { Stepper } from '@/components/ui/Stepper'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

type Qtds = Record<string, number> // chave: saborId|tamanho -> quantidade em unidades (brownies)

function Historico() {
  const { empresaId } = useSessao()
  const cad = useCadastros()
  const dados = useLiveQuery(async () => {
    const [producoes, itens] = await Promise.all([lerDaEmpresa('producoes', empresaId), lerDaEmpresa('producaoItens', empresaId)])
    return producoes.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
      .map((p) => ({ producao: p, itens: itens.filter((i) => i.producaoId === p.id) }))
  }, [empresaId])
  if (!dados?.length) return <p className="text-cinza">Nenhuma produção lançada ainda.</p>
  return (
    <ul className="divide-y divide-fio border-y border-fio">
      {dados.map(({ producao, itens }) => (
        <li key={producao.id} className="py-3">
          <p className="font-bold">{dataCurta(producao.data)} · {producao.responsavel}</p>
          <p className="text-[14px] text-cinza">
            {itens.map((i) => {
              const saborNome = cad.saborPorId.get(i.saborId)?.nome ?? i.saborId
              const max = cad.pecasPorForma[i.tamanho] || 35
              const pecasAprox = Math.round(i.formas * max)
              if (Number.isInteger(i.formas) && i.formas >= 1) {
                return `${saborNome} ${i.tamanho} × ${i.formas} ${i.formas === 1 ? 'forma' : 'formas'} (${pecasAprox} und)`
              }
              return `${saborNome} ${i.tamanho} × ${pecasAprox} und (${numero(i.formas, 2)} f)`
            }).join(' · ')}
          </p>
        </li>
      ))}
    </ul>
  )
}

function ControleUnidades({
  saborNome,
  tamanho,
  maxForma,
  valor,
  aoMudar,
}: {
  saborNome: string
  tamanho: CodigoTamanho
  maxForma: number
  valor: number
  aoMudar: (v: number) => void
}) {
  const [editando, setEditando] = useState(false)
  const [textoInput, setTextoInput] = useState(String(valor))

  const atualizarValor = (novo: number) => {
    const limpo = Math.max(0, Math.floor(novo))
    aoMudar(limpo)
  }

  const diminuir = () => {
    if (valor <= 2) {
      atualizarValor(0)
    } else {
      atualizarValor(valor - 1)
    }
  }

  const aumentar = () => {
    if (valor === 0) {
      atualizarValor(2)
    } else {
      atualizarValor(valor + 1)
    }
  }

  const invalido = valor === 1
  const meia = Math.round(maxForma / 2)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label={`Menos ${saborNome} ${tamanho}`}
          disabled={valor <= 0}
          onClick={diminuir}
          className="size-10 sm:size-11 flex shrink-0 items-center justify-center rounded-deco border border-fio active:scale-95 active:bg-grafite disabled:opacity-30 touch-manipulation"
        >
          <Minus className="size-4" />
        </button>

        <div className="relative min-w-16 sm:min-w-20">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Quantidade de ${saborNome} ${tamanho}`}
            value={editando ? textoInput : valor || ''}
            placeholder="0"
            onFocus={() => {
              setEditando(true)
              setTextoInput(valor ? String(valor) : '')
            }}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setTextoInput(val)
              const num = Number(val)
              aoMudar(num)
            }}
            onBlur={() => {
              setEditando(false)
              const num = Number(textoInput) || 0
              aoMudar(num)
            }}
            className={`w-full text-center font-bold text-lg sm:text-xl bg-carvao rounded-md border py-1.5 focus:outline-none ${
              invalido ? 'border-vermelho text-vermelho' : valor > 0 ? 'border-primary text-white' : 'border-fio text-cinza'
            }`}
          />
        </div>

        <button
          type="button"
          aria-label={`Mais ${saborNome} ${tamanho}`}
          onClick={aumentar}
          className="size-10 sm:size-11 flex shrink-0 items-center justify-center rounded-deco border border-fio active:scale-95 active:bg-grafite touch-manipulation"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between text-xs px-0.5">
        {invalido ? (
          <span className="text-vermelho font-semibold">Mínimo 2 und</span>
        ) : valor > 0 ? (
          <span className="text-cinza">
            {(valor / maxForma).toFixed(2).replace('.', ',')} f
          </span>
        ) : (
          <span className="text-cinza/60">0 und</span>
        )}

        <div className="flex gap-1">
          {valor === 0 ? (
            <>
              <button
                type="button"
                onClick={() => atualizarValor(2)}
                className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-fio/40 hover:bg-fio text-cinza hover:text-white"
                title="Mínimo: 2 unidades"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => atualizarValor(meia)}
                className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-fio/40 hover:bg-fio text-cinza hover:text-white"
                title={`Meia forma: ${meia} unidades`}
              >
                ½ ({meia})
              </button>
              <button
                type="button"
                onClick={() => atualizarValor(maxForma)}
                className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-fio/40 hover:bg-fio text-cinza hover:text-white"
                title={`Forma cheia: ${maxForma} unidades`}
              >
                Cheia ({maxForma})
              </button>
            </>
          ) : (
            <>
              {valor !== maxForma && (
                <button
                  type="button"
                  onClick={() => atualizarValor(maxForma)}
                  className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-fio/40 hover:bg-fio text-cinza hover:text-white"
                >
                  Cheia ({maxForma})
                </button>
              )}
              <button
                type="button"
                onClick={() => atualizarValor(0)}
                className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-vermelho/20 hover:bg-vermelho/30 text-vermelho"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Producao() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const [data, setData] = useState(hoje)
  const [responsavel, setResponsavel] = useState('Maria Eduarda')
  const [diaria, setDiaria] = useState(String(cad.config.diariaProducao))
  const [pecas, setPecas] = useState<Qtds>({})
  const [modo, setModo] = useState<'unidades' | 'formas'>('unidades')
  const [enviando, setEnviando] = useState(false)
  const podeLancar = sessao.papel !== 'mentor'

  const resumo = useMemo(() => {
    const itens = Object.entries(pecas).filter(([, q]) => q > 0).map(([chave, q]) => {
      const [saborId, tamanho] = chave.split('|') as [string, CodigoTamanho]
      const maxPecas = cad.pecasPorForma[tamanho]
      const f = Number((q / maxPecas).toFixed(4))
      return { saborId, tamanho, formas: f, pecas: q }
    })
    const totalFormas = itens.reduce((s, i) => s + i.formas, 0)
    const totalPecas = itens.reduce((s, i) => s + i.pecas, 0)
    const gasPorForma = cad.config.gasMesReferencia / (cad.config.formasReferencia * cad.config.semanasPorMes)
    const jornadas = Math.max(1, Math.ceil(totalFormas / cad.config.capacidadeJornada))
    const custo = (Number(diaria.replace(',', '.')) || 0) + gasPorForma * totalFormas
    return { itens, totalFormas, pecas: totalPecas, jornadas, custo }
  }, [pecas, diaria, cad])

  const temItemInvalido = Object.values(pecas).some((q) => q === 1)
  const podeSubmeter = podeLancar && resumo.pecas > 0 && !temItemInvalido && !enviando

  async function lancar() {
    if (temItemInvalido) {
      mostrarErro(new Error('A forma pode ser produzida com qualquer quantidade a partir de 2 unidades por sabor.'))
      return
    }
    setEnviando(true)
    try {
      await registrarProducao(
        { data, responsavel, diariaPaga: Number(diaria.replace(',', '.')) || 0, itens: resumo.itens },
        { horaViradaDia: cad.config.horaViradaDia, sabores: cad.saborPorId, pecasPorForma: cad.pecasPorForma },
      )
      mostrarToast(`Produção lançada: ${resumo.pecas} brownies em ${resumo.itens.length} ${resumo.itens.length === 1 ? 'lote' : 'lotes'}`)
      setPecas({})
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const renderControle = (saborId: string, tamanho: CodigoTamanho) => {
    const chave = `${saborId}|${tamanho}`
    const max = cad.pecasPorForma[tamanho]
    const qtd = pecas[chave] ?? 0
    const saborNome = cad.saborPorId.get(saborId)?.nome ?? saborId

    if (modo === 'unidades') {
      return (
        <ControleUnidades
          saborNome={saborNome}
          tamanho={tamanho}
          maxForma={max}
          valor={qtd}
          aoMudar={(v) => setPecas({ ...pecas, [chave]: v })}
        />
      )
    }

    const formasAtuais = Math.round(qtd / max)
    return (
      <div className="flex flex-col gap-1.5">
        <Stepper
          compacto
          rotulo={`formas de ${saborNome} ${tamanho}`}
          valor={formasAtuais}
          max={cad.config.capacidadeJornada}
          passo={1}
          aoMudar={(v) => setPecas({ ...pecas, [chave]: v * max })}
        />
        <span className="text-xs text-cinza px-0.5">
          {formasAtuais > 0 ? `${formasAtuais} f (${formasAtuais * max} und)` : '0 formas'}
        </span>
      </div>
    )
  }

  return (
    <Tela titulo="Produção" voltar={sessao.papel === 'dono'} subtitulo="Cada sabor e tamanho vira um lote com validade">
      {podeLancar && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <Campo rotulo="Diária paga" inputMode="decimal" value={diaria} onChange={(e) => setDiaria(e.target.value)} />
          </div>
          <Campo rotulo="Quem produziu" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />

          <Secao titulo="Produção por sabor">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-deco border border-fio bg-grafite/30 p-3 sm:p-4">
              <div>
                <span className="font-bold block text-[15px]">Modo de Lançamento</span>
                <span className="text-[13px] text-cinza block">
                  {modo === 'unidades'
                    ? 'Por brownies (de 2 und até o máximo de 35 peq · 24 gde por forma)'
                    : 'Por formas completas (1 forma = 35 pequenos ou 24 grandes)'}
                </span>
              </div>
              <div className="inline-flex rounded-lg border border-fio bg-carvao p-1 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setModo('unidades')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${modo === 'unidades' ? 'bg-primary text-white shadow' : 'text-cinza hover:text-white'}`}
                >
                  Brownies (2 ao máx)
                </button>
                <button
                  type="button"
                  onClick={() => setModo('formas')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${modo === 'formas' ? 'bg-primary text-white shadow' : 'text-cinza hover:text-white'}`}
                >
                  Formas inteiras
                </button>
              </div>
            </div>

            <ul className="divide-y divide-fio border-y border-fio">
              {cad.sabores.filter((s) => s.ativo).map((s) => (
                <li key={s.id} className="py-3">
                  <p className="mb-2 font-bold leading-tight">
                    {s.nome} <span className="text-[13px] font-semibold text-cinza">· validade {s.validadeDias} dias</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <span className="rotulo block mb-1">Pequeno · máx 35</span>
                      {renderControle(s.id, 'pequeno')}
                    </div>
                    <div>
                      <span className="rotulo block mb-1">Grande · máx 24</span>
                      {renderControle(s.id, 'grande')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Secao>

          <section className="moldura grid grid-cols-3 gap-2 sm:gap-3 bg-carvao p-3 sm:p-4">
            <Numero
              rotulo="Formas"
              valor={numero(resumo.totalFormas, 2)}
              detalhe={`${resumo.jornadas} jornada${resumo.jornadas > 1 ? 's' : ''}`}
            />
            <Numero rotulo="Brownies" valor={numero(resumo.pecas)} detalhe={`${resumo.itens.length} ${resumo.itens.length === 1 ? 'lote' : 'lotes'}`} />
            {veCustos(sessao.papel) ? (
              <Numero
                rotulo="Custo jornada"
                valor={reais(resumo.custo)}
                detalhe={resumo.pecas ? `${reais(resumo.custo / resumo.pecas)} por brownie` : 'diária + gás'}
              />
            ) : (
              <Numero rotulo="Lotes" valor={resumo.itens.length} />
            )}
          </section>

          {temItemInvalido && (
            <p className="text-[14px] text-vermelho font-semibold">
              A forma pode ser produzida com qualquer quantidade a partir de 2 unidades (itens com 1 unidade não são permitidos).
            </p>
          )}

          {resumo.totalFormas > cad.config.capacidadeJornada && (
            <p className="text-[14px] text-ambar">
              Acima de {cad.config.capacidadeJornada} formas: precisa de uma segunda jornada (e outra diária).
            </p>
          )}

          <Botao bloco disabled={!podeSubmeter} onClick={lancar}>
            Lançar produção
          </Botao>
        </>
      )}
      <Secao titulo="Últimas produções"><Historico /></Secao>
    </Tela>
  )
}
