import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, KeyRound, LogOut } from 'lucide-react'
import type { Papel } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { sair, sairDaConta } from '@/lib/operacoes/acesso'
import { alterarSenhaNuvem } from '@/lib/sync/auth'
import { Botao, Campo } from '@/components/ui/basicos'
import { Folha } from '@/components/ui/Folha'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarErro, mostrarToast } from '@/components/ui/Toast'

interface Item { para: string; rotulo: string; detalhe?: string; papeis: Papel[] }

const GRUPOS: Array<{ titulo: string; itens: Item[] }> = [
  {
    titulo: 'Operação',
    itens: [
      { para: '/hoje', rotulo: 'Hoje do dono', detalhe: 'leitura', papeis: ['mentor'] },
      { para: '/checklist', rotulo: 'Checklist da semana', papeis: ['dono', 'equipe'] },
      { para: '/placar', rotulo: 'Placar da semana', papeis: ['dono'] },
      { para: '/producao', rotulo: 'Produção', papeis: ['dono', 'mentor'] },
      { para: '/compras', rotulo: 'Lista de Compras', papeis: ['dono', 'equipe', 'mentor'] },
      { para: '/estoque', rotulo: 'Estoque', papeis: ['dono', 'mentor'] },
      { para: '/visita', rotulo: 'Visita ao ponto', papeis: ['dono'] },
      { para: '/repasse', rotulo: 'Repasse a parceiro', papeis: ['dono', 'equipe'] },
    ],
  },
  {
    titulo: 'Números',
    itens: [
      { para: '/caixa', rotulo: 'Fluxo de Caixa', detalhe: 'entradas, saídas, categorias e relatórios', papeis: ['dono', 'mentor'] },
      { para: '/mais/custos', rotulo: 'Custos', detalhe: 'custo do brownie e lucro por canal', papeis: ['dono', 'mentor'] },
      { para: '/mais/produtos', rotulo: 'Tabela da casa', detalhe: 'produtos, preços e promoções', papeis: ['dono', 'mentor', 'equipe'] },
      { para: '/mais/fixos', rotulo: 'Custos fixos', papeis: ['dono', 'mentor'] },
    ],
  },
  {
    titulo: 'Empresa',
    itens: [
      { para: '/mais/configuracoes', rotulo: 'Empresa e configurações', papeis: ['dono', 'mentor'] },
      { para: '/mais/equipe', rotulo: 'Equipe', papeis: ['dono', 'mentor'] },
      { para: '/mais/convites', rotulo: 'Convites', papeis: ['dono', 'mentor'] },
      { para: '/mais/ifood', rotulo: 'iFood (Métricas e Cancelamentos)', papeis: ['dono', 'mentor'] },
      { para: '/mais/dados', rotulo: 'Sincronização e dados', detalhe: 'exportar tudo', papeis: ['dono', 'mentor', 'equipe'] },
    ],
  },
]

export function Mais() {
  const sessao = useSessao()
  const cad = useCadastros()
  const navegar = useNavigate()
  const [saindo, setSaindo] = useState(false)

  // Modal de alteração de senha
  const [folhaSenha, setFolhaSenha] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  async function handleDeslogar() {
    if (!window.confirm('Deseja realmente deslogar da sua conta?')) return
    setSaindo(true)
    try {
      await sairDaConta()
      mostrarToast('Sessão encerrada')
      navegar('/entrar', { replace: true })
    } finally {
      setSaindo(false)
    }
  }

  async function handleAlterarSenha(e: FormEvent) {
    e.preventDefault()
    if (novaSenha.length < 6) {
      mostrarErro('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      mostrarErro('As senhas digitadas não coincidem.')
      return
    }
    setSalvandoSenha(true)
    try {
      await alterarSenhaNuvem(novaSenha)
      mostrarToast('Senha alterada com sucesso!')
      setFolhaSenha(false)
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (erro) {
      mostrarErro(erro)
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <Tela titulo="Mais" subtitulo={`${sessao.nome} · ${sessao.papel} · ${cad.empresa.nome}`}>
      {GRUPOS.map((g) => {
        const itens = g.itens.filter((i) => i.papeis.includes(sessao.papel))
        if (!itens.length) return null
        return (
          <Secao key={g.titulo} titulo={g.titulo}>
            <ul className="border-t border-fio">
              {itens.map((i) => (
                <li key={i.para}>
                  <Link to={i.para} className="flex min-h-14 items-center gap-3 border-b border-fio px-1 active:bg-grafite">
                    <span className="flex-1">
                      <span className="block font-bold">{i.rotulo}</span>
                      {i.detalhe && <span className="block text-[13px] text-cinza">{i.detalhe}</span>}
                    </span>
                    <ChevronRight className="size-5 text-cinza" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Secao>
        )
      })}

      <Secao titulo="Conta e sessão">
        <div className="rounded-deco border border-fio bg-carvao p-4 space-y-3">
          <div>
            <p className="text-[12px] uppercase tracking-wider text-cinza">Perfil ativo</p>
            <p className="font-bold text-base text-osso">{sessao.nome} <span className="text-[13px] text-cinza font-normal">({sessao.papel})</span></p>
            {sessao.email && <p className="text-[13px] text-cinza mt-0.5">{sessao.email}</p>}
          </div>

          <div className="grid gap-2 pt-2 border-t border-fio">
            <Botao
              variante="secundario"
              bloco
              onClick={() => {
                setNovaSenha('')
                setConfirmarSenha('')
                setFolhaSenha(true)
              }}
            >
              <KeyRound className="size-4 shrink-0" aria-hidden />
              Alterar senha da conta
            </Botao>
            <Botao
              variante="fantasma"
              bloco
              onClick={() => {
                sair()
                navegar('/entrar', { replace: true })
              }}
            >
              Trocar de perfil
            </Botao>
            <Botao
              variante="perigo"
              bloco
              disabled={saindo}
              onClick={handleDeslogar}
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              {saindo ? 'Deslogando…' : 'Deslogar da conta'}
            </Botao>
          </div>
        </div>
      </Secao>

      <Folha aberta={folhaSenha} aoFechar={() => setFolhaSenha(false)} titulo="Alterar senha">
        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <p className="text-[14px] text-cinza leading-relaxed">
            Digite a sua nova senha de acesso à conta da nuvem. Ela deve ter no mínimo 6 caracteres.
          </p>
          <Campo
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
          <Campo
            rotulo="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Repita a nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
          <div className="pt-2 space-y-2">
            <Botao type="submit" bloco disabled={salvandoSenha}>
              {salvandoSenha ? 'Alterando senha…' : 'Salvar nova senha'}
            </Botao>
            <Botao variante="fantasma" bloco onClick={() => setFolhaSenha(false)} type="button">
              Cancelar
            </Botao>
          </div>
        </form>
      </Folha>
    </Tela>
  )
}
