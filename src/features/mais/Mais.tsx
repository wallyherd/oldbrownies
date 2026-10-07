import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import type { Papel } from '@/lib/db/tipos'
import { useSessao } from '@/lib/sessao'
import { useCadastros } from '@/lib/dados/cadastros'
import { sair, sairDaConta } from '@/lib/operacoes/acesso'
import { Botao } from '@/components/ui/basicos'
import { Secao, Tela } from '@/components/ui/Tela'
import { mostrarToast } from '@/components/ui/Toast'

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
      { para: '/estoque', rotulo: 'Estoque', papeis: ['mentor'] },
      { para: '/visita', rotulo: 'Visita ao ponto', papeis: ['dono'] },
      { para: '/repasse', rotulo: 'Repasse a parceiro', papeis: ['dono', 'equipe'] },
    ],
  },
  {
    titulo: 'Números',
    itens: [
      { para: '/mais/custos', rotulo: 'Custos', detalhe: 'custo do brownie e lucro por canal', papeis: ['dono', 'mentor'] },
      { para: '/mais/produtos', rotulo: 'Tabela da casa', detalhe: 'produtos, preços e promoções', papeis: ['dono', 'mentor', 'equipe'] },
      { para: '/mais/fixos', rotulo: 'Custos fixos', papeis: ['dono', 'mentor'] },
    ],
  },
  {
    titulo: 'Empresa',
    itens: [
      { para: '/mais/configuracoes', rotulo: 'Empresa e configurações', papeis: ['dono', 'mentor'] },
      { para: '/mais/convites', rotulo: 'Convites', papeis: ['dono', 'mentor'] },
      { para: '/mais/dados', rotulo: 'Sincronização e dados', detalhe: 'exportar tudo', papeis: ['dono', 'mentor', 'equipe'] },
    ],
  },
]

export function Mais() {
  const sessao = useSessao()
  const cad = useCadastros()
  const navegar = useNavigate()
  const [saindo, setSaindo] = useState(false)

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
    </Tela>
  )
}
