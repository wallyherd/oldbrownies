import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import type { TipoMovimentacaoCaixa } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { Botao, Campo } from '@/components/ui/basicos'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, lancarMovimentacao } from '@/lib/operacoes/caixa'

interface Props {
  aberto: boolean
  aoFechar: () => void
  tipoInicial?: TipoMovimentacaoCaixa
  aoSalvar?: () => void
}

export function ModalLancamento({ aberto, aoFechar, tipoInicial = 'saida', aoSalvar }: Props) {
  const sessao = useSessao()
  const hojeStr = new Date().toISOString().slice(0, 10)

  const [tipo, setTipo] = useState<TipoMovimentacaoCaixa>(tipoInicial)
  const [valorStr, setValorStr] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descricao, setDescricao] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [data, setData] = useState(hojeStr)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (aberto) {
      setTipo(tipoInicial)
      setValorStr('')
      setCategoria(tipoInicial === 'saida' ? CATEGORIAS_SAIDA[0] : CATEGORIAS_ENTRADA[0])
      setDescricao('')
      setFormaPagamento('pix')
      setData(hojeStr)
      setErro(null)
    }
  }, [aberto, tipoInicial, hojeStr])

  // Quando muda tipo, ajusta categoria inicial
  function mudarTipo(novoTipo: TipoMovimentacaoCaixa) {
    setTipo(novoTipo)
    setCategoria(novoTipo === 'saida' ? CATEGORIAS_SAIDA[0] : CATEGORIAS_ENTRADA[0])
  }

  if (!aberto) return null

  const ehOutro = categoria.trim().toLowerCase() === 'outro'
  const listaCategorias = tipo === 'saida' ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const vLimpo = valorStr.replace(/\./g, '').replace(',', '.')
    const vNum = parseFloat(vLimpo)

    if (isNaN(vNum) || vNum <= 0) {
      setErro('Digite um valor numérico válido maior que zero.')
      return
    }

    if (ehOutro && !descricao.trim()) {
      setErro('A descrição é obrigatória quando a categoria for "Outro".')
      return
    }

    setEnviando(true)
    try {
      await lancarMovimentacao({
        data,
        tipo,
        categoria,
        descricao: descricao.trim() || categoria,
        valor: vNum,
        formaPagamento,
        origem: 'manual',
        registradoPor: sessao.nome,
      })

      mostrarToast(`Lançamento de ${tipo === 'entrada' ? 'entrada' : 'saída'} registrado com sucesso!`)
      aoSalvar?.()
      aoFechar()
    } catch (err) {
      mostrarErro(err)
      setErro(err instanceof Error ? err.message : 'Erro ao salvar lançamento')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-deco border border-fio bg-carvao p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-fio pb-3">
          <h2 className="font-titulo text-lg font-bold text-osso tracking-wider">
            {tipo === 'entrada' ? '+ Nova Entrada' : '− Nova Saída'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded p-1 text-cinza hover:text-osso"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="space-y-4 pt-4">
          {erro && (
            <div className="rounded border border-vermelho/50 bg-vermelho/10 p-2.5 text-xs text-vermelho">
              {erro}
            </div>
          )}

          {/* Seletor Tipo: Entrada ou Saída */}
          <div>
            <label className="rotulo block mb-1">Tipo de Operação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => mudarTipo('entrada')}
                className={`py-2 text-sm font-bold rounded-deco border transition-all ${
                  tipo === 'entrada'
                    ? 'border-verde bg-verde/15 text-verde shadow-sm'
                    : 'border-fio bg-grafite/40 text-cinza'
                }`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => mudarTipo('saida')}
                className={`py-2 text-sm font-bold rounded-deco border transition-all ${
                  tipo === 'saida'
                    ? 'border-vermelho bg-vermelho/15 text-vermelho shadow-sm'
                    : 'border-fio bg-grafite/40 text-cinza'
                }`}
              >
                − Saída
              </button>
            </div>
          </div>

          {/* Valor */}
          <div>
            <Campo
              rotulo="Valor (R$)"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="rotulo block mb-1">Categoria</label>
            <select
              className="campo w-full font-medium"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {listaCategorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Se for "Outro", campo obrigatório especificando */}
          {ehOutro && (
            <div className="p-3 rounded-deco border border-ouro/40 bg-ouro/5 space-y-1">
              <span className="text-[11px] font-bold text-ouro uppercase tracking-wider block">
                Obrigatório para categoria "Outro":
              </span>
              <Campo
                rotulo="O que foi? (Especifique o motivo)"
                type="text"
                placeholder="Ex: Manutenção da batedeira, consultoria, etc."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              />
            </div>
          )}

          {/* Se NÃO for "Outro", descrição opcional */}
          {!ehOutro && (
            <div>
              <Campo
                rotulo="Descrição / Detalhe (Opcional)"
                type="text"
                placeholder="Ex: Compra de chocolate Callebaut, pagamento diarista..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          )}

          {/* Forma de Pagamento e Data */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="rotulo block mb-1">Pagamento</label>
              <select
                className="campo w-full"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="transferencia">Transferência / Boleto</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <Campo
                rotulo="Data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-fio">
            <Botao type="button" variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={enviando} variante={tipo === 'entrada' ? 'ok' : 'perigo'}>
              <Check className="size-4 shrink-0" />
              {enviando ? 'Salvando...' : 'Salvar no Caixa'}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  )
}
