import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { CodigoTamanho, Pagamento, Parceiro, TipoParceiro } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { cx } from '@/lib/cx'
import { useCadastros } from '@/lib/dados/cadastros'
import { useHoje, useRegistros } from '@/lib/dados/consultas'
import { useEstoque } from '@/lib/dados/hooks'
import { reais } from '@/lib/formato'
import { desfazerVenda, registrarVenda } from '@/lib/operacoes/vendas'
import { Abas } from '@/components/ui/Abas'
import { Aviso, Botao, Vazio } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { MixSabores, mixSortido } from './MixSabores'

const ABAS: Array<{ valor: TipoParceiro; rotulo: string }> = [
  { valor: 'vendedor', rotulo: 'Vendedor' },
  { valor: 'motorista', rotulo: 'Motorista' },
  { valor: 'ponto', rotulo: 'Ponto' },
  { valor: 'rede', rotulo: 'Rede' },
]
const ORDEM_STATUS: Record<string, number> = { ativo: 0, teste: 1, treino: 2, pausado: 3, candidato: 4, saiu: 5 }
const DIAS_MINIMOS_PONTO = 7

export function Repasse() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = useHoje(cad.config.horaViradaDia)
  const [params, setParams] = useSearchParams()
  const tipo = (params.get('tipo') as TipoParceiro) || 'vendedor'
  const parceiros = useRegistros('parceiros')
  const estoque = useEstoque(hoje)
  const [parceiroId, setParceiroId] = useState<string | null>(params.get('parceiro'))

  const pecasPequenoPorUnidade = cad.pecasPorForma.pequeno || 35
  const pecasGrandePorUnidade = tipo === 'ponto' ? 24 : (cad.pecasPorForma.grande || 24)

  // Quantidades livres em peças a partir de 1 peça
  const [qtdPequeno, setQtdPequeno] = useState(tipo === 'ponto' ? 0 : pecasPequenoPorUnidade)
  const [qtdGrande, setQtdGrande] = useState(tipo === 'ponto' ? pecasGrandePorUnidade : 0)
  const [pagamento, setPagamento] = useState<Pagamento>('pix')
  const [enviando, setEnviando] = useState(false)

  const totalPequeno = qtdPequeno
  const totalGrande = qtdGrande

  const [mixPequeno, setMixPequeno] = useState<Record<string, number>>(() => mixSortido(totalPequeno, cad.sabores))
  const [mixGrande, setMixGrande] = useState<Record<string, number>>(() => mixSortido(totalGrande, cad.sabores))

  useEffect(() => {
    setMixPequeno(totalPequeno > 0 ? mixSortido(totalPequeno, cad.sabores) : {})
  }, [totalPequeno, cad.sabores])

  useEffect(() => {
    setMixGrande(totalGrande > 0 ? mixSortido(totalGrande, cad.sabores) : {})
  }, [totalGrande, cad.sabores])

  const lista = useMemo(() => (parceiros ?? [])
    .filter((p) => p.tipo === tipo && p.status !== 'saiu')
    .sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] || a.nome.localeCompare(b.nome, 'pt-BR')), [parceiros, tipo])

  const precoPequenoPadrao = cad.canal('vendedor')?.precoPadrao ?? 8
  const precoGrande = cad.canal('ponto')?.precoPadrao ?? 10

  const getPrecoPequeno = (saborId: string) => {
    if (tipo !== 'rede') return precoPequenoPadrao
    const nome = cad.saborPorId.get(saborId)?.nome.toLowerCase() ?? ''
    if (nome.includes('jack') || nome.includes('honey') || nome.includes('maca') || nome.includes('maçã')) return 5.50
    return 5.00
  }

  const somaMixPequeno = Object.values(mixPequeno).reduce((s, v) => s + v, 0)
  const somaMixGrande = Object.values(mixGrande).reduce((s, v) => s + v, 0)
  const totalPecas = somaMixPequeno + somaMixGrande

  const subtotalPequeno = Object.entries(mixPequeno).reduce((s, [saborId, qtd]) => s + qtd * getPrecoPequeno(saborId), 0)
  const subtotalGrande = somaMixGrande * precoGrande
  const totalValor = subtotalPequeno + subtotalGrande

  const lucroPequeno = Object.entries(mixPequeno).reduce(
    (s, [saborId, qtd]) => s + qtd * (getPrecoPequeno(saborId) - (cad.tabela.variavel[saborId]?.pequeno ?? 0)),
    0,
  )
  const lucroGrande = Object.entries(mixGrande).reduce(
    (s, [saborId, qtd]) => s + qtd * (precoGrande - (cad.tabela.variavel[saborId]?.grande ?? 0)),
    0,
  )
  const lucroTotal = lucroPequeno + lucroGrande

  const precoInvalido =
    (tipo !== 'rede' && totalPequeno > 0 && precoPequenoPadrao >= cad.config.precoFinalRevenda) ||
    (totalGrande > 0 && precoGrande >= cad.config.precoFinalRevenda)

  const mixPequenoIncompleto = totalPequeno > 0 && somaMixPequeno !== totalPequeno
  const mixGrandeIncompleto = totalGrande > 0 && somaMixGrande !== totalGrande
  const semPecas = totalPequeno === 0 && totalGrande === 0
  const desabilitado = enviando || semPecas || mixPequenoIncompleto || mixGrandeIncompleto || precoInvalido

  async function registrar(parceiro: Parceiro) {
    setEnviando(true)
    try {
      const itens: Array<{ saborId: string; tamanho: CodigoTamanho; qtd: number; precoUnitario: number; custoUnitario: number }> = []

      if (totalPequeno > 0) {
        for (const [saborId, qtd] of Object.entries(mixPequeno)) {
          if (qtd > 0) {
            itens.push({
              saborId,
              tamanho: 'pequeno',
              qtd,
              precoUnitario: getPrecoPequeno(saborId),
              custoUnitario: cad.tabela.variavel[saborId]?.pequeno ?? 0,
            })
          }
        }
      }

      if (totalGrande > 0) {
        for (const [saborId, qtd] of Object.entries(mixGrande)) {
          if (qtd > 0) {
            itens.push({
              saborId,
              tamanho: 'grande',
              qtd,
              precoUnitario: precoGrande,
              custoUnitario: cad.tabela.variavel[saborId]?.grande ?? 0,
            })
          }
        }
      }

      const rotuloPagamento = pagamento === 'pix' ? 'Pix' : pagamento === 'dinheiro' ? 'Dinheiro' : 'Cartão'
      const vendaId = await registrarVenda(
        { canal: tipo, pagamento, parceiroId: parceiro.id, itens },
        {
          horaViradaDia: cad.config.horaViradaDia,
          produtoPorId: cad.produtoPorId,
          diasMinimos: (tipo === 'ponto' || tipo === 'rede') ? DIAS_MINIMOS_PONTO : 0,
        },
      )

      mostrarToast(`Repasse a ${parceiro.nome}: ${totalPecas} peças · ${reais(totalValor)} (${rotuloPagamento})`, {
        acao: { rotulo: 'Desfazer', fazer: () => void desfazerVenda(vendaId, cad.config.horaViradaDia) },
      })
      setParceiroId(null)
      setQtdPequeno(tipo === 'ponto' ? 0 : pecasPequenoPorUnidade)
      setQtdGrande(tipo === 'ponto' ? pecasGrandePorUnidade : 0)
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const escolhido = lista.find((p) => p.id === parceiroId)

  return (
    <Tela titulo="Repasse a parceiro" voltar subtitulo="Parceiro → quantidades livres/mix → recebimento">
      <Abas
        abas={ABAS}
        ativa={tipo}
        aoMudar={(t) => {
          setParams({ tipo: t }, { replace: true })
          setParceiroId(null)
          setQtdPequeno(t === 'ponto' ? 0 : pecasPequenoPorUnidade)
          setQtdGrande(t === 'ponto' ? 24 : 0)
          setPagamento('pix')
        }}
      />

      <Secao titulo="Quem">
        {lista.length ? (
          <ul className="space-y-2" role="radiogroup" aria-label="Parceiro">
            {lista.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={p.id === parceiroId}
                  onClick={() => setParceiroId(p.id)}
                  className={cx(
                    'flex min-h-14 w-full items-center gap-3 rounded-deco border px-4 text-left active:scale-[0.99]',
                    p.id === parceiroId ? 'border-osso bg-grafite' : 'border-fio bg-carvao',
                  )}
                >
                  <span className="flex-1">
                    <span className="block font-bold">{p.nome}</span>
                    <span className="block text-[13px] text-cinza">
                      {p.polo ? `polo ${p.polo} · ` : ''}
                      status: {p.status}
                    </span>
                  </span>
                  {p.id === parceiroId && <Check className="size-5 text-verde" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>
            Nenhum parceiro do tipo &quot;{tipo}&quot; cadastrado.{' '}
            {sessao.papel === 'dono' && (
              <>
                Cadastre em{' '}
                <Link to="/rede" className="font-bold underline">
                  Rede
                </Link>
                .
              </>
            )}
          </Vazio>
        )}
      </Secao>

      {escolhido && (
        <>
          <Secao titulo="Quantidades e tamanhos">
            <div className="space-y-3">
              {/* PEÇAS PEQUENAS */}
              <div className="rounded-deco border border-fio bg-carvao p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold text-base block text-osso">Peças Pequenas</span>
                    <span className="text-[13px] text-cinza block">
                      {qtdPequeno} peça{qtdPequeno !== 1 ? 's' : ''}
                      {qtdPequeno > 0 && ` (${(qtdPequeno / pecasPequenoPorUnidade).toFixed(1).replace('.0', '')} forma${qtdPequeno >= pecasPequenoPorUnidade ? 's' : ''})`}
                      {tipo !== 'rede' ? ` · ${reais(precoPequenoPadrao)}/peça` : ' · preço variável'}
                    </span>
                  </div>

                  {/* Controle de quantidade em peças */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label="Diminuir 1 peça pequena"
                      disabled={qtdPequeno <= 0}
                      onClick={() => setQtdPequeno(Math.max(0, qtdPequeno - 1))}
                      className="flex size-11 items-center justify-center rounded-deco border border-fio bg-grafite font-bold text-lg text-osso active:scale-95 disabled:opacity-30 touch-manipulation"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={qtdPequeno || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                        setQtdPequeno(val)
                      }}
                      className="h-11 w-16 rounded-deco border border-fio bg-carvao text-center text-lg font-bold text-osso focus:border-osso focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Aumentar 1 peça pequena"
                      onClick={() => setQtdPequeno(qtdPequeno + 1)}
                      className="flex size-11 items-center justify-center rounded-deco border border-fio bg-grafite font-bold text-lg text-osso active:scale-95 touch-manipulation"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Atalhos rápidos de quantidade */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-fio/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setQtdPequeno(qtdPequeno + 1)}
                    className="rounded-deco border border-fio bg-grafite/60 px-2.5 py-1 text-xs text-cinza active:scale-95 hover:text-osso"
                  >
                    +1 peça
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtdPequeno(qtdPequeno + 5)}
                    className="rounded-deco border border-fio bg-grafite/60 px-2.5 py-1 text-xs text-cinza active:scale-95 hover:text-osso"
                  >
                    +5 peças
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtdPequeno(qtdPequeno + pecasPequenoPorUnidade)}
                    className="rounded-deco border border-fio bg-grafite/60 px-2.5 py-1 text-xs text-cinza active:scale-95 hover:text-osso"
                  >
                    +1 forma ({pecasPequenoPorUnidade} un)
                  </button>
                  {qtdPequeno > 0 && (
                    <button
                      type="button"
                      onClick={() => setQtdPequeno(0)}
                      className="rounded-deco border border-vermelho/30 bg-vermelho/10 px-2 py-1 text-xs text-vermelho active:scale-95 ml-auto"
                    >
                      Zerar
                    </button>
                  )}
                </div>
              </div>

              {/* PEÇAS GRANDES */}
              <div className="rounded-deco border border-fio bg-carvao p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold text-base block text-osso">Peças Grandes</span>
                    <span className="text-[13px] text-cinza block">
                      {qtdGrande} peça{qtdGrande !== 1 ? 's' : ''}
                      {qtdGrande > 0 && ` (${(qtdGrande / pecasGrandePorUnidade).toFixed(1).replace('.0', '')} ${tipo === 'ponto' ? 'cx' : 'forma'}${qtdGrande >= pecasGrandePorUnidade ? 's' : ''})`} · {reais(precoGrande)}/peça
                    </span>
                  </div>

                  {/* Controle de quantidade em peças */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label="Diminuir 1 peça grande"
                      disabled={qtdGrande <= 0}
                      onClick={() => setQtdGrande(Math.max(0, qtdGrande - 1))}
                      className="flex size-11 items-center justify-center rounded-deco border border-fio bg-grafite font-bold text-lg text-osso active:scale-95 disabled:opacity-30 touch-manipulation"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={qtdGrande || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                        setQtdGrande(val)
                      }}
                      className="h-11 w-16 rounded-deco border border-fio bg-carvao text-center text-lg font-bold text-osso focus:border-osso focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Aumentar 1 peça grande"
                      onClick={() => setQtdGrande(qtdGrande + 1)}
                      className="flex size-11 items-center justify-center rounded-deco border border-fio bg-grafite font-bold text-lg text-osso active:scale-95 touch-manipulation"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Atalhos rápidos de quantidade */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-fio/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setQtdGrande(qtdGrande + 1)}
                    className="rounded-deco border border-fio bg-grafite/60 px-2.5 py-1 text-xs text-cinza active:scale-95 hover:text-osso"
                  >
                    +1 peça
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtdGrande(qtdGrande + 5)}
                    className="rounded-deco border border-fio bg-grafite/60 px-2.5 py-1 text-xs text-cinza active:scale-95 hover:text-osso"
                  >
                    +5 peças
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtdGrande(qtdGrande + pecasGrandePorUnidade)}
                    className="rounded-deco border border-fio bg-grafite/60 px-2.5 py-1 text-xs text-cinza active:scale-95 hover:text-osso"
                  >
                    +{tipo === 'ponto' ? '1 caixa' : '1 forma'} ({pecasGrandePorUnidade} un)
                  </button>
                  {qtdGrande > 0 && (
                    <button
                      type="button"
                      onClick={() => setQtdGrande(0)}
                      className="rounded-deco border border-vermelho/30 bg-vermelho/10 px-2 py-1 text-xs text-vermelho active:scale-95 ml-auto"
                    >
                      Zerar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Secao>

          {totalPequeno > 0 && (
            <Secao
              titulo={`Mix — Brownies Pequenos (${somaMixPequeno} de ${totalPequeno})`}
              direita={somaMixPequeno !== totalPequeno ? (
                <button
                  type="button"
                  onClick={() => setQtdPequeno(somaMixPequeno)}
                  className="text-xs text-ouro underline active:opacity-70 font-semibold"
                >
                  Ajustar total para {somaMixPequeno}
                </button>
              ) : undefined}
            >
              <MixSabores
                total={totalPequeno}
                mix={mixPequeno}
                aoMudar={setMixPequeno}
                sabores={cad.sabores}
                tamanho="pequeno"
                estoque={estoque?.saldoItem}
              />
            </Secao>
          )}

          {totalGrande > 0 && (
            <Secao
              titulo={`Mix — Brownies Grandes (${somaMixGrande} de ${totalGrande})`}
              direita={somaMixGrande !== totalGrande ? (
                <button
                  type="button"
                  onClick={() => setQtdGrande(somaMixGrande)}
                  className="text-xs text-ouro underline active:opacity-70 font-semibold"
                >
                  Ajustar total para {somaMixGrande}
                </button>
              ) : undefined}
            >
              <MixSabores
                total={totalGrande}
                mix={mixGrande}
                aoMudar={setMixGrande}
                sabores={cad.sabores}
                tamanho="grande"
                estoque={estoque?.saldoItem}
              />
            </Secao>
          )}

          {semPecas && (
            <Aviso tom="aviso">Selecione ao menos 1 peça (pequena ou grande) acima.</Aviso>
          )}

          {precoInvalido && (
            <Aviso tom="alerta">
              Repasse igual ou acima do preço final ({reais(cad.config.precoFinalRevenda)}): o parceiro não tem margem.
            </Aviso>
          )}

          <Secao titulo="Forma de pagamento">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPagamento('pix')}
                className={cx(
                  'flex min-h-12 flex-col items-center justify-center rounded-deco border text-center font-bold transition-all active:scale-[0.98] touch-manipulation',
                  pagamento === 'pix'
                    ? 'border-osso bg-osso text-tinta'
                    : 'border-fio bg-carvao text-cinza hover:text-osso',
                )}
              >
                <span className="text-[14px] sm:text-base">Pix</span>
              </button>
              <button
                type="button"
                onClick={() => setPagamento('dinheiro')}
                className={cx(
                  'flex min-h-12 flex-col items-center justify-center rounded-deco border text-center font-bold transition-all active:scale-[0.98] touch-manipulation',
                  pagamento === 'dinheiro'
                    ? 'border-osso bg-osso text-tinta'
                    : 'border-fio bg-carvao text-cinza hover:text-osso',
                )}
              >
                <span className="text-[14px] sm:text-base">Dinheiro</span>
              </button>
              <button
                type="button"
                onClick={() => setPagamento('maquininha')}
                className={cx(
                  'flex min-h-12 flex-col items-center justify-center rounded-deco border text-center font-bold transition-all active:scale-[0.98] touch-manipulation',
                  pagamento === 'maquininha'
                    ? 'border-osso bg-osso text-tinta'
                    : 'border-fio bg-carvao text-cinza hover:text-osso',
                )}
              >
                <span className="text-[14px] sm:text-base">Cartão</span>
              </button>
            </div>
          </Secao>

          <div className="moldura bg-carvao p-4 space-y-2">
            <p className="text-3xl font-bold">{reais(totalValor)}</p>
            <div className="text-cinza text-[14px] space-y-0.5">
              {somaMixPequeno > 0 && (
                <p>
                  {somaMixPequeno} pequenas {tipo !== 'rede' ? `× ${reais(precoPequenoPadrao)}` : ''} = {reais(subtotalPequeno)}
                </p>
              )}
              {somaMixGrande > 0 && (
                <p>
                  {somaMixGrande} grandes × {reais(precoGrande)} = {reais(subtotalGrande)}
                </p>
              )}
              <p className="pt-1 text-osso font-semibold">
                {totalPecas} peças no total · recebimento em{' '}
                {pagamento === 'pix' ? 'Pix' : pagamento === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
              </p>
            </div>
            {sessao.papel === 'dono' && (
              <p className="mt-2 text-[15px] border-t border-fio pt-2">
                Este repasse deixa <strong className="text-verde">{reais(lucroTotal)}</strong> para a Old Brownies.
              </p>
            )}
          </div>

          <Botao bloco variante="ok" disabled={desabilitado} onClick={() => registrar(escolhido)}>
            <Check className="size-5" aria-hidden />
            {pagamento === 'pix' && 'Pix recebido — registrar'}
            {pagamento === 'dinheiro' && 'Dinheiro recebido — registrar'}
            {pagamento === 'maquininha' && 'Cartão aprovado — registrar'}
          </Botao>
        </>
      )}
    </Tela>
  )
}
