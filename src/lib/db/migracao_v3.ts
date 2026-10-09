import { db } from './banco'
import { gravarSemSessao, op } from '@/lib/sync/gravar'
import { CONFIG, PRODUTOS, CANAIS, CUSTOS_FIXOS } from './sementes'
import type { Op } from '@/lib/sync/gravar'

export async function aplicarAtualizacaoV3(empresaId: string, userId: string) {
  const ops: Op[] = []

  // 1. Atualizar Config
  const configs = await db.configs.toArray()
  if (configs.length > 0) {
    ops.push(op('configs', { ...configs[0], ...CONFIG }))
  }

  // 2. Atualizar Produtos (vendeNoIfood e obsIfood)
  const produtos = await db.produtos.toArray()
  for (const pSemente of PRODUTOS) {
    const pDb = produtos.find(p => p.nome === pSemente.nome)
    if (pDb) {
      ops.push(op('produtos', {
        ...pDb,
        vendeNoIfood: pSemente.vendeNoIfood,
        obsIfood: pSemente.obsIfood,
        composicao: pSemente.composicao as any, // combos com escolha etc
      }))
    }
  }

  // 3. Atualizar Canais (iFood)
  const canais = await db.canais.toArray()
  const ifood = canais.find(c => c.codigo === 'ifood')
  if (ifood) {
    const ifoodSemente = CANAIS.find(c => c.codigo === 'ifood')
    if (ifoodSemente) {
      ops.push(op('canais', { ...ifood, comissao: ifoodSemente.comissao }))
    }
  }
  // Add rede se não existir
  if (!canais.some(c => c.codigo === 'rede')) {
    const redeSemente = CANAIS.find(c => c.codigo === 'rede')
    if (redeSemente) {
      ops.push(op('canais', redeSemente as any))
    }
  }

  // 4. Desativar custo fixo Maria Eduarda
  const custosFixos = await db.custosFixos.toArray()
  const me = custosFixos.find(c => c.nome.includes('Maria Eduarda — balcão'))
  if (me && !me.deletedAt) {
    ops.push({ tabela: 'custosFixos', registro: { ...me, deletedAt: new Date().toISOString() } })
  }

  if (ops.length > 0) {
    await gravarSemSessao({ empresaId, userId }, ops)
  }
}
