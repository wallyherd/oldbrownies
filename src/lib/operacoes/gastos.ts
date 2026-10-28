// Gastos do dono — saídas de caixa / fluxo de caixa
import type { Gasto } from '@/lib/db/tipos'
import { atualizar, excluir, gravar, op, type NovoRegistro } from '@/lib/sync/gravar'

export async function lancarGasto(dados: NovoRegistro<Gasto>): Promise<string> {
  const [id] = await gravar(op('gastos', dados))
  return id
}

export function atualizarGasto(id: string, patch: Partial<Gasto>) {
  return atualizar('gastos', id, patch)
}

export function excluirGasto(id: string) {
  return excluir('gastos', id)
}
