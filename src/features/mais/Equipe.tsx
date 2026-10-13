import { useState } from 'react'
import { Tela, Secao } from '@/components/ui/Tela'
import { Botao, Campo } from '@/components/ui/basicos'
import { useCadastros } from '@/lib/dados/cadastros'
import { gravar, novoId, op } from '@/lib/sync/gravar'
import type { Funcionario } from '@/lib/db/tipos'
import { diasFaltandoExperiencia } from '@/lib/motor/funcionario'
import { diaComercial, inicioMes, somarDias, diasEntre } from '@/lib/motor/dia'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/banco'
import { useChecklist } from '@/lib/dados/hooks'
import { montarDia } from '@/features/checklist/tarefas'

export function Equipe() {
  const cad = useCadastros()
  const hoje = diaComercial(new Date(), cad.config.horaViradaDia)
  const mesAtual = inicioMes(hoje)

  // Fetch data for quality bonus
  const metricasIfood = useLiveQuery(() => db.metricasIfood.where('dataReferencia').aboveOrEqual(mesAtual).toArray()) ?? []
  const cancelamentos = useLiveQuery(() => db.cancelamentos.where('data').aboveOrEqual(mesAtual).toArray()) ?? []
  const checklist = useChecklist(mesAtual, hoje)

  return (
    <Tela titulo="Equipe" voltar>
      <Secao titulo="Funcionários Ativos">
        {cad.funcionarios.length === 0 ? (
          <p className="p-4 text-cinza text-sm text-center">Nenhum funcionário cadastrado.</p>
        ) : (
          <div className="space-y-4 p-4">
            {cad.funcionarios.map((f) => (
              <FichaFuncionario 
                key={f.id} 
                funcionario={f} 
                hoje={hoje}
                metricasIfood={metricasIfood}
                cancelamentos={cancelamentos}
                checklist={checklist}
              />
            ))}
          </div>
        )}
      </Secao>
      <Secao titulo="Adicionar Funcionário">
        <FormAdicionar horaViradaDia={cad.config.horaViradaDia} />
      </Secao>
    </Tela>
  )
}

function FichaFuncionario({ 
  funcionario: f, hoje, metricasIfood, cancelamentos, checklist 
}: { 
  funcionario: Funcionario
  hoje: string
  metricasIfood: Array<{ nota: number }>
  cancelamentos: Array<{ culpa: string }>
  checklist: any 
}) {
  const faltam = diasFaltandoExperiencia(f, hoje)
  
  // Bônus de qualidade (só a partir do Nível 1)
  const mediaIfood = metricasIfood.length > 0 ? metricasIfood.reduce((acc, m) => acc + m.nota, 0) / metricasIfood.length : 0
  const falhasLoja = cancelamentos.filter(c => c.culpa === 'loja').length
  
  // Calcular progresso do checklist
  let diasComChecklist = 0
  let diasTotal = 0
  if (checklist) {
    const totalDiasMes = diasEntre(inicioMes(hoje), hoje) + 1
    for (let i = 0; i < totalDiasMes; i++) {
      const d = somarDias(inicioMes(hoje), i)
      const tarefasDia = montarDia(checklist, d, 'equipe', hoje)
      const obrigatorias = tarefasDia.filter(t => t.obrigatoria)
      if (obrigatorias.length > 0) {
        diasTotal++
        const feitas = obrigatorias.filter(t => t.status === 'feito').length
        if (feitas === obrigatorias.length) diasComChecklist++
      }
    }
  }
  const pctChecklist = diasTotal > 0 ? diasComChecklist / diasTotal : 1

  const ganhaBonusQualidade = f.fase !== 'experiencia' && mediaIfood >= 4.7 && falhasLoja === 0 && pctChecklist >= 0.9

  async function promover(novaFase: Funcionario['fase'], motivo: 'fim_experiencia' | 'antecipacao' | 'criterio') {
    if (!window.confirm(`Mudar fase para ${novaFase}?`)) return
    await gravar(
      op('funcionarios', { ...f, fase: novaFase, faseDesde: hoje }),
      op('mudancasFase', {
        id: novoId(),
        funcionarioId: f.id,
        data: hoje,
        de: f.fase,
        para: novaFase,
        motivo,
        registradoPor: 'dono',
      })
    )
  }

  return (
    <div className="border border-fio rounded p-4 bg-grafite space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">{f.nome}</p>
          <p className="text-sm text-cinza">Fase atual: <span className="text-osso font-medium capitalize">{f.fase}</span></p>
          <p className="text-sm text-cinza">Admissão: {f.admissao.split('-').reverse().join('/')}</p>
        </div>
        {f.fase === 'experiencia' && (
          <div className="text-right">
            <span className="text-xs bg-azul/20 text-azul px-2 py-1 rounded">
              {faltam} dias p/ fim exp.
            </span>
          </div>
        )}
      </div>

      {f.fase !== 'experiencia' && (
        <div className="mt-4 pt-4 border-t border-fio/50">
          <p className="text-sm font-bold mb-2">Bônus de Qualidade (Mês Atual)</p>
          <div className="space-y-1 text-sm text-cinza">
            <p>Nota iFood: <span className={mediaIfood >= 4.7 ? 'text-verde' : 'text-vermelho'}>{mediaIfood.toFixed(1)}</span> (Meta: 4.7)</p>
            <p>Cancelamentos loja: <span className={falhasLoja === 0 ? 'text-verde' : 'text-vermelho'}>{falhasLoja}</span> (Meta: 0)</p>
            <p>Checklist equipe: <span className={pctChecklist >= 0.9 ? 'text-verde' : 'text-vermelho'}>{(pctChecklist * 100).toFixed(0)}%</span> (Meta: 90%)</p>
          </div>
          <div className="mt-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${ganhaBonusQualidade ? 'bg-verde/20 text-verde' : 'bg-vermelho/20 text-vermelho'}`}>
              {ganhaBonusQualidade ? 'Bônus de R$ 100 garantido' : 'Bônus em risco'}
            </span>
          </div>
        </div>
      )}

      {f.fase === 'experiencia' && (
        <div className="flex gap-2 pt-2">
          <Botao pequeno onClick={() => void promover('nivel1', 'fim_experiencia')}>Efetivar Nível 1</Botao>
          <Botao pequeno variante="fantasma" onClick={() => void promover('nivel1', 'antecipacao')}>Antecipar Nível 1</Botao>
        </div>
      )}
      {f.fase === 'nivel1' && (
        <div className="flex gap-2 pt-2">
          <Botao pequeno onClick={() => void promover('nivel2', 'criterio')}>Promover Nível 2</Botao>
        </div>
      )}
      {f.fase === 'nivel2' && (
        <div className="flex gap-2 pt-2">
          <Botao pequeno onClick={() => void promover('nivel3', 'criterio')}>Promover Nível 3</Botao>
        </div>
      )}
    </div>
  )
}

function FormAdicionar({ horaViradaDia }: { horaViradaDia: number }) {
  const hoje = diaComercial(new Date(), horaViradaDia)
  const [nome, setNome] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome) return
    const id = novoId()
    const fimExp = somarDias(hoje, 59)
    await gravar(
      op('funcionarios', {
        id,
        nome,
        membroId: novoId(),
        admissao: hoje,
        fimExperiencia: fimExp,
        fase: 'experiencia',
        faseDesde: hoje,
        usaVT: true,
        viagensDia: 2,
        diasMesVT: 26,
      })
    )
    setNome('')
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="p-4 space-y-4">
      <Campo 
        rotulo="Nome da Funcionária" 
        value={nome} 
        onChange={(e) => setNome(e.target.value)} 
        required 
      />
      <Botao type="submit" bloco>Cadastrar na Experiência</Botao>
    </form>
  )
}
