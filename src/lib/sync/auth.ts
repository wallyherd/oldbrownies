// Login por e-mail na nuvem. A sessão do Supabase fica salva: sem internet, o app abre com o último usuário.
import { useEffect, useState } from 'react'
import { db } from '@/lib/db/banco'
import type { Empresa, Membro } from '@/lib/db/tipos'
import { chavesPara, nuvem, paraCamel } from './nuvem'

export interface UsuarioNuvem { id: string; email: string }

export function useUsuarioNuvem(): UsuarioNuvem | null | undefined {
  const [usuario, setUsuario] = useState<UsuarioNuvem | null | undefined>(nuvem ? undefined : null)
  useEffect(() => {
    if (!nuvem) return
    const paraUsuario = (u?: { id: string; email?: string } | null) => (u ? { id: u.id, email: u.email ?? '' } : null)
    void nuvem.auth.getSession().then(({ data }) => setUsuario(paraUsuario(data.session?.user)))
    const { data } = nuvem.auth.onAuthStateChange((_e, sessao) => setUsuario(paraUsuario(sessao?.user)))
    return () => data.subscription.unsubscribe()
  }, [])
  return usuario
}

export async function entrarComEmail(email: string, senha: string, criarConta: boolean) {
  if (!nuvem) throw new Error('Nuvem não configurada.')
  const { error } = criarConta
    ? await nuvem.auth.signUp({ email, password: senha })
    : await nuvem.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error(error.message)
}

// Traz do servidor as empresas de que o usuário é membro (dono, mentor ou equipe).
export async function baixarMembrosDoUsuario(userId: string) {
  if (!nuvem || !navigator.onLine) return
  const { data: membros, error } = await nuvem.from('membros').select('*').eq('user_id', userId)
  if (error) throw new Error(error.message)
  const listaMembros = (membros ?? []).map((linha) => chavesPara(linha, paraCamel) as unknown as Membro)
  await db.membros.bulkPut(listaMembros)

  // Baixa os registros das empresas para a tela inicial já exibir o nome da empresa
  const empresaIds = [...new Set(listaMembros.map((m) => m.empresaId).filter(Boolean))]
  if (empresaIds.length) {
    const { data: empresas, error: errEmpresas } = await nuvem.from('empresas').select('*').in('id', empresaIds)
    if (!errEmpresas && empresas?.length) {
      await db.empresas.bulkPut(empresas.map((linha) => chavesPara(linha, paraCamel) as unknown as Empresa))
    }
  }
}

export async function sairDaNuvem() {
  await nuvem?.auth.signOut()
}
