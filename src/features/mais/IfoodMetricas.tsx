import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/banco'
import { Tela, Secao } from '@/components/ui/Tela'
import { Botao, Campo } from '@/components/ui/basicos'
import { useSessao } from '@/lib/sessao'
import { gravar, novoId, op } from '@/lib/sync/gravar'
import { diaComercial, inicioSemana } from '@/lib/motor/dia'
import { useCadastros } from '@/lib/dados/cadastros'

export function IfoodMetricas() {
  const sessao = useSessao()
  const cad = useCadastros()
  const hoje = diaComercial(new Date(), cad.config.horaViradaDia)
  const domingoAtual = inicioSemana(hoje)

  const metricas = useLiveQuery(() => db.metricasIfood.orderBy('dataReferencia').reverse().toArray()) ?? []
  const cancelamentos = useLiveQuery(() => db.cancelamentos.orderBy('data').reverse().toArray()) ?? []

  const [nota, setNota] = useState('')
  const [culpa, setCulpa] = useState<'loja' | 'motoboy' | 'app'>('loja')
  const [motivo, setMotivo] = useState('')
  const [dataCancelamento, setDataCancelamento] = useState(hoje)

  async function salvarNota(e: React.FormEvent) {
    e.preventDefault()
    if (!nota) return
    const id = novoId()
    await gravar(
      op('metricasIfood', { id, dataReferencia: domingoAtual, nota: parseFloat(nota) })
    )
    setNota('')
  }

  async function salvarCancelamento(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo || !dataCancelamento) return
    const id = novoId()
    await gravar(
      op('cancelamentos', { id, data: dataCancelamento, motivo, culpa, registradoPor: sessao.userId })
    )
    setMotivo('')
    setDataCancelamento(hoje)
    setCulpa('loja')
  }

  return (
    <Tela titulo="Métricas iFood" voltar>
      <Secao titulo="Nota da Semana">
        <form onSubmit={(e) => void salvarNota(e)} className="space-y-4 p-4 border border-fio rounded bg-grafite">
          <Campo
            rotulo="Nota média do iFood (Domingo atual)"
            type="number"
            step="0.1"
            max="5"
            min="0"
            required
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <Botao type="submit" bloco>Registrar Nota</Botao>
        </form>
        <div className="mt-4 px-4">
          <p className="font-bold text-sm mb-2">Histórico de Notas</p>
          {metricas.map((m) => (
            <div key={m.id} className="flex justify-between py-1 border-b border-fio">
              <span className="text-cinza">{m.dataReferencia}</span>
              <span className="font-bold">{m.nota.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Registro de Cancelamento">
        <form onSubmit={(e) => void salvarCancelamento(e)} className="space-y-4 p-4 border border-fio rounded bg-grafite">
          <Campo
            rotulo="Data do cancelamento"
            type="date"
            required
            value={dataCancelamento}
            onChange={(e) => setDataCancelamento(e.target.value)}
          />
          <label className="block space-y-1">
            <span className="rotulo">Culpa</span>
            <select
              className="campo"
              value={culpa}
              onChange={(e) => setCulpa(e.target.value as 'loja' | 'motoboy' | 'app')}
            >
              <option value="loja">Loja (erro de pedido, atraso nosso)</option>
              <option value="motoboy">Motoboy</option>
              <option value="app">Aplicativo iFood</option>
            </select>
          </label>
          <Campo
            rotulo="Motivo"
            type="text"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <Botao type="submit" bloco>Registrar Cancelamento</Botao>
        </form>

        <div className="mt-4 px-4">
          <p className="font-bold text-sm mb-2">Últimos Cancelamentos</p>
          {cancelamentos.map((c) => (
            <div key={c.id} className="py-2 border-b border-fio">
              <div className="flex justify-between">
                <span className="text-cinza text-sm">{c.data}</span>
                <span className={`text-sm font-bold ${c.culpa === 'loja' ? 'text-vermelho' : 'text-ambar'}`}>{c.culpa}</span>
              </div>
              <p className="text-sm mt-1">{c.motivo}</p>
            </div>
          ))}
        </div>
      </Secao>
    </Tela>
  )
}
