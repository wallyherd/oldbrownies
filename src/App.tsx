import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Papel } from '@/lib/db/tipos'
import { useSessaoOpcional } from '@/lib/sessao'
import { CadastrosProvider } from '@/lib/dados/cadastros'
import { iniciarSincronizacao, puxarTudoDeNovo, sincronizar, useEstadoSync } from '@/lib/sync/sincronizar'
import { sair } from '@/lib/operacoes/acesso'
import { Casca } from '@/components/Casca'
import { Entrar } from '@/features/entrar/Entrar'
import { Hoje } from '@/features/hoje/Hoje'
import { ChecklistSemana } from '@/features/checklist/ChecklistSemana'
import { EditarRotina } from '@/features/checklist/EditarRotina'
import { Vender } from '@/features/vender/Vender'
import { Repasse } from '@/features/repasse/Repasse'
import { VisitaPonto } from '@/features/visita/VisitaPonto'
import { Producao } from '@/features/producao/Producao'
import { Estoque } from '@/features/estoque/Estoque'
import { Rede } from '@/features/rede/Rede'
import { FichaParceiro } from '@/features/rede/FichaParceiro'
import { Placar } from '@/features/placar/Placar'
import { Painel } from '@/features/mentor/Painel'
import { AreaPrivada } from '@/features/mentor/AreaPrivada'
import { Mais } from '@/features/mais/Mais'
import { ListaCompras } from '@/features/compras/ListaCompras'
import { Custos } from '@/features/mais/Custos'
import { Produtos } from '@/features/mais/Produtos'
import { CustosFixos } from '@/features/mais/CustosFixos'
import { Configuracoes } from '@/features/mais/Configuracoes'
import { Equipe } from '@/features/mais/Equipe'
import { IfoodMetricas } from '@/features/mais/IfoodMetricas'
import { Convites } from '@/features/mais/Convites'
import { Dados } from '@/features/mais/Dados'

const INICIO: Record<Papel, string> = { dono: '/hoje', equipe: '/hoje', mentor: '/painel', parceiro: '/entrar' }

const TODOS: Papel[] = ['dono', 'mentor', 'equipe']
const GESTAO: Papel[] = ['dono', 'mentor']

function Carregando() {
  const sessao = useSessaoOpcional()
  const estado = useEstadoSync()
  const [demorou, setDemorou] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDemorou(true), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <div className="size-10 animate-spin rounded-full border-2 border-ouro border-t-transparent" aria-hidden />
      <p className="mt-4 font-bold text-osso text-lg">Abrindo a empresa…</p>
      
      {estado.sincronizando && (
        <p className="mt-1 text-[13px] text-cinza">Sincronizando dados com a nuvem…</p>
      )}

      {estado.erro && (
        <div className="mt-6 max-w-sm rounded-deco border border-vermelho/40 bg-vermelho/10 p-4 text-left">
          <p className="text-[13px] font-bold text-vermelho">Aviso de sincronização:</p>
          <p className="mt-1 text-xs text-cinza line-clamp-3">{estado.erro}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void sincronizar()}
              className="rounded-deco bg-ouro px-3 py-1.5 text-xs font-bold text-carvao active:scale-95"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => sair()}
              className="rounded-deco border border-fio bg-carvao px-3 py-1.5 text-xs text-osso active:scale-95"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      )}

      {demorou && !estado.erro && (
        <div className="mt-6 max-w-xs space-y-2">
          <p className="text-xs text-cinza">A conexão está demorando mais do que o esperado.</p>
          <div className="flex justify-center gap-2">
            {sessao && (
              <button
                type="button"
                onClick={() => void puxarTudoDeNovo(sessao.empresaId)}
                className="rounded-deco border border-fio bg-carvao px-3 py-1.5 text-xs font-bold text-ouro active:scale-95"
              >
                Forçar sincronização
              </button>
            )}
            <button
              type="button"
              onClick={() => sair()}
              className="rounded-deco border border-fio bg-carvao px-3 py-1.5 text-xs text-cinza active:scale-95"
            >
              Trocar de conta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Permitido({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const sessao = useSessaoOpcional()
  if (!sessao) return <Navigate to="/entrar" replace />
  if (!papeis.includes(sessao.papel)) return <Navigate to={INICIO[sessao.papel]} replace />
  return children
}

const ROTAS: Array<{ caminho: string; papeis: Papel[]; tela: ReactNode }> = [
  { caminho: '/hoje', papeis: ['dono', 'equipe', 'mentor'], tela: <Hoje /> },
  { caminho: '/checklist', papeis: TODOS, tela: <ChecklistSemana /> },
  { caminho: '/checklist/editar', papeis: ['dono'], tela: <EditarRotina /> },
  { caminho: '/vender', papeis: ['dono', 'equipe'], tela: <Vender /> },
  { caminho: '/repasse', papeis: ['dono'], tela: <Repasse /> },
  { caminho: '/visita', papeis: ['dono'], tela: <VisitaPonto /> },
  { caminho: '/producao', papeis: TODOS, tela: <Producao /> },
  { caminho: '/estoque', papeis: TODOS, tela: <Estoque /> },
  { caminho: '/rede', papeis: GESTAO, tela: <Rede /> },
  { caminho: '/rede/:id', papeis: GESTAO, tela: <FichaParceiro /> },
  { caminho: '/placar', papeis: GESTAO, tela: <Placar /> },
  { caminho: '/painel', papeis: ['mentor'], tela: <Painel /> },
  { caminho: '/privado', papeis: ['mentor'], tela: <AreaPrivada /> },
  { caminho: '/compras', papeis: TODOS, tela: <ListaCompras /> },
  { caminho: '/mais', papeis: TODOS, tela: <Mais /> },
  { caminho: '/mais/custos', papeis: GESTAO, tela: <Custos /> },
  { caminho: '/mais/produtos', papeis: TODOS, tela: <Produtos /> },
  { caminho: '/mais/fixos', papeis: GESTAO, tela: <CustosFixos /> },
  { caminho: '/mais/configuracoes', papeis: GESTAO, tela: <Configuracoes /> },
  { caminho: '/mais/equipe', papeis: GESTAO, tela: <Equipe /> },
  { caminho: '/mais/ifood', papeis: GESTAO, tela: <IfoodMetricas /> },
  { caminho: '/mais/convites', papeis: GESTAO, tela: <Convites /> },
  { caminho: '/mais/dados', papeis: TODOS, tela: <Dados /> },
]

function AreaLogada() {
  useEffect(() => iniciarSincronizacao(), [])

  return (
    <CadastrosProvider carregando={<Carregando />}>
      <Casca>
        <Routes>
          {ROTAS.map((r) => (
            <Route key={r.caminho} path={r.caminho} element={<Permitido papeis={r.papeis}>{r.tela}</Permitido>} />
          ))}
          <Route path="*" element={<Inicio />} />
        </Routes>
      </Casca>
    </CadastrosProvider>
  )
}

function Inicio() {
  const sessao = useSessaoOpcional()
  return <Navigate to={sessao ? INICIO[sessao.papel] : '/entrar'} replace />
}

export function App() {
  const sessao = useSessaoOpcional()
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="*" element={sessao ? <AreaLogada /> : <Navigate to="/entrar" replace />} />
    </Routes>
  )
}
