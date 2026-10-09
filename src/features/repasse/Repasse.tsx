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
import { Stepper } from '@/components/ui/Stepper'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { MixSabores, mixSortido } from './MixSabores'

const ABAS: Array<{ valor: TipoParceiro; rotulo: string }> = [
  { valor: 'vendedor', rotulo: 'Vendedor' }, { valor: 'motorista', rotulo: 'Motorista' }, { valor: 'ponto', rotulo: 'Ponto' }, { valor: 'rede', rotulo: 'Rede' },
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
  const [unidadesPequeno, setUnidadesPequeno] = useState(tipo === 'ponto' ? 0 : 1)
  const [unidadesGrande, setUnidadesGrande] = useState(tipo === 'ponto' ? 1 : 0)
  const [pagamento, setPagamento] = useState<Pagamento>('pix')
  const [enviando, setEnviando] = useState(false)

  const pecasPequenoPorUnidade = cad.pecasPorForma.pequeno
  const pecasGrandePorUnidade = tipo === 'ponto' ? 24 : cad.pecasPorForma.grande
  const totalPequeno = unidadesPequeno * pecasPequenoPorUnidade
  const totalGrande = unidadesGrande * pecasGrandePorUnidade

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
      setUnidadesPequeno(tipo === 'ponto' ? 0 : 1)
      setUnidadesGrande(tipo === 'ponto' ? 1 : 0)
    } catch (e) {
      mostrarErro(e)
    } finally {
      setEnviando(false)
    }
  }

  const escolhido = lista.find((p) => p.id === parceiroId)

  return (
    <Tela titulo="Repasse a parceiro" voltar subtitulo="Parceiro → formas/tamanhos → recebimento">
      <Abas
        abas={ABAS}
        ativa={tipo}
        aoMudar={(t) => {
          setParams({ tipo: t }, { replace: true })
          setParceiroId(null)
          setUnidadesPequeno(t === 'ponto' ? 0 : 1)
          setUnidadesGrande(t === 'ponto' ? 1 : 0)
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
                  <span className="flex-1 font-bold">{p.nome}</span>
                  {p.status !== 'ativo' && (
                    <span className="text-[13px] uppercase tracking-[0.08em] text-cinza">{p.status}</span>
                  )}
                  {p.id === parceiroId && <Check className="size-5" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio>
            Nenhum {ABAS.find((a) => a.valor === tipo)?.rotulo.toLowerCase()} cadastrado.
            {sessao.papel === 'dono' && (
              <>
                {' '}
                <Link to={`/rede?aba=${tipo}`} className="underline">
                  Cadastrar na Rede
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
              <div className="rounded-deco border border-fio bg-carvao p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-base block text-osso">Peças Pequenas</span>
                    <span className="text-[13px] text-cinza block">
                      {unidadesPequeno} forma{unidadesPequeno !== 1 ? 's' : ''} ({totalPequeno} peças){tipo !== 'rede' ? ` · ${reais(precoPequenoPadrao)}/peça` : ' · preço variável'}
                    </span>
                  </div>
                  <Stepper
                    rotulo="Formas pequenas"
                    valor={unidadesPequeno}
                    min={0}
                    max={20}
                    aoMudar={setUnidadesPequeno}
                  />
                </div>
              </div>

              <div className="rounded-deco border border-fio bg-carvao p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-base block text-osso">Peças Grandes</span>
                    <span className="text-[13px] text-cinza block">
                      {unidadesGrande} {tipo === 'ponto' ? 'caixa' : 'forma'}{unidadesGrande !== 1 ? 's' : ''} ({totalGrande} peças) · {reais(precoGrande)}/peça
                    </span>
                  </div>
                  <Stepper
                    rotulo={tipo === 'ponto' ? 'Caixas grandes' : 'Formas grandes'}
                    valor={unidadesGrande}
                    min={0}
                    max={20}
                    aoMudar={setUnidadesGrande}
                  />
                </div>
              </div>
            </div>
          </Secao>

          {totalPequeno > 0 && (
            <Secao titulo={`Mix — Brownies Pequenos (${somaMixPequeno} de ${totalPequeno})`}>
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
            <Secao titulo={`Mix — Brownies Grandes (${somaMixGrande} de ${totalGrande})`}>
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
            <Aviso tom="aviso">Selecione ao menos 1 forma de peças pequenas ou grandes acima.</Aviso>
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

