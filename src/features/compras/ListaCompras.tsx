import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/banco'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { novoId } from '@/lib/db/id'
import { Secao, Tela } from '@/components/ui/Tela'
import { Botao, Campo } from '@/components/ui/basicos'
import { Check, Edit2, Trash2 } from 'lucide-react'
import { cx } from '@/lib/cx'

export function ListaCompras() {
  const sessao = useSessao()
  const cad = useCadastros()
  const dono = sessao.papel === 'dono'
  
  const comprasPendentes = useLiveQuery(
    () => db.listaCompras.where({ empresaId: sessao.empresaId }).filter(c => !c.concluido && !c.deletedAt).toArray(),
    [sessao.empresaId]
  )
  
  const [insumoId, setInsumoId] = useState('')
  const [qtd, setQtd] = useState('')
  
  async function adicionar() {
    if (!insumoId || !qtd) return
    const id = novoId()
    await db.listaCompras.add({
      id,
      empresaId: sessao.empresaId,
      insumoId,
      quantidadeNecessaria: Number(qtd.replace(',', '.')),
      concluido: false,
      valorPago: null,
      compradoPor: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: sessao.userId,
      deletedAt: null
    })
    await db.outbox.add({ tabela: 'listaCompras', registroId: id, criadoEm: new Date().toISOString() })
    setInsumoId('')
    setQtd('')
  }
  
  async function marcarConcluido(id: string, valorPago: number) {
    await db.listaCompras.update(id, {
      concluido: true,
      valorPago,
      compradoPor: sessao.userId,
      updatedAt: new Date().toISOString(),
      updatedBy: sessao.userId
    })
    await db.outbox.add({ tabela: 'listaCompras', registroId: id, criadoEm: new Date().toISOString() })
  }
  
  async function apagar(id: string) {
    await db.listaCompras.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: sessao.userId
    })
    await db.outbox.add({ tabela: 'listaCompras', registroId: id, criadoEm: new Date().toISOString() })
  }

  return (
    <Tela titulo="Lista de Compras" subtitulo="Itens para comprar">
      {dono && (
        <Secao titulo="Adicionar Item">
          <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
            <Campo rotulo="Insumo" render={(id) => (
              <select id={id} className="caixa" value={insumoId} onChange={e => setInsumoId(e.target.value)}>
                <option value="">Selecione...</option>
                {cad.insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
              </select>
            )} />
            <Campo rotulo="Qtd" type="number" step="0.01" value={qtd} onChange={e => setQtd(e.target.value)} />
            <Botao onClick={adicionar} disabled={!insumoId || !qtd}>Add</Botao>
          </div>
        </Secao>
      )}

      <Secao titulo="Itens Pendentes">
        {!comprasPendentes?.length ? (
          <p className="text-cinza">Tudo comprado!</p>
        ) : (
          <ul className="divide-y divide-fio border-y border-fio">
            {comprasPendentes.map(c => {
              const insumo = cad.insumos.find(i => i.id === c.insumoId)
              return (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{insumo?.nome}</p>
                    <p className="text-sm text-cinza">{c.quantidadeNecessaria} {insumo?.unidade}</p>
                  </div>
                  <div className="flex gap-2">
                    {dono && (
                      <button onClick={() => apagar(c.id)} className="p-2 text-vermelho">
                        <Trash2 className="size-5" />
                      </button>
                    )}
                    <button onClick={() => {
                      const v = window.prompt(`Valor total pago por ${c.quantidadeNecessaria} ${insumo?.unidade} de ${insumo?.nome}?`)
                      if (v) marcarConcluido(c.id, Number(v.replace(',', '.')))
                    }} className="flex items-center gap-1 rounded bg-verde px-3 py-1 text-sm font-bold text-preto">
                      <Check className="size-4" /> Comprado
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Secao>
    </Tela>
  )
}
