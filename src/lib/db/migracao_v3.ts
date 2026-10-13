import { db } from './banco'
import { gravarSemSessao, op } from '@/lib/sync/gravar'
import { CONFIG, PRODUTOS, CANAIS, PARCEIROS, ROTINA_EQUIPE, NOTAS_MENTOR, TAREFAS_AVULSAS } from './sementes'
import type { Op } from '@/lib/sync/gravar'
import { dataLocal, somarDias } from '@/lib/motor/dia'

function dataDaTarefa(quando: 'segunda' | 'semana' | 'outubro', hoje: string): string {
  if (quando === 'segunda') return hoje
  if (quando === 'semana') return somarDias(hoje, 2)
  return hoje
}

export async function aplicarAtualizacaoV3(empresaId: string, userId: string) {
  const ops: Op[] = []
  const hoje = dataLocal(new Date())

  // 1. Atualizar Config
  const configs = await db.configs.toArray()
  if (configs.length > 0) {
    ops.push(op('configs', { ...configs[0], ...CONFIG }))
  }

  // 2. Atualizar Produtos (vendeNoIfood e obsIfood) ou inserir novos combos
  const produtos = await db.produtos.toArray()
  const sabores = await db.sabores.toArray()
  const idSabor = new Map(sabores.map((s) => [s.codigo, s.id]))

  for (let i = 0; i < PRODUTOS.length; i++) {
    const pSemente = PRODUTOS[i]
    const pDb = produtos.find((p) => p.nome === pSemente.nome)
    const composicaoFormatada = pSemente.composicao?.map((c) =>
      'sabor' in c ? { saborId: idSabor.get(c.sabor) ?? c.sabor, tamanho: c.tamanho, qtd: c.qtd } : c
    )

    if (pDb) {
      ops.push(op('produtos', {
        ...pDb,
        vendeNoIfood: pSemente.vendeNoIfood,
        obsIfood: pSemente.obsIfood,
        composicao: composicaoFormatada as any,
      }))
    } else {
      ops.push(op('produtos', {
        tipo: pSemente.tipo,
        nome: pSemente.nome,
        saborId: pSemente.sabor ? idSabor.get(pSemente.sabor) : undefined,
        tamanho: pSemente.tamanho,
        precoLoja: pSemente.precoLoja,
        custoManual: pSemente.custoManual,
        composicao: composicaoFormatada as any,
        observacao: pSemente.observacao,
        vendeNoIfood: pSemente.vendeNoIfood,
        obsIfood: pSemente.obsIfood,
        ordem: i,
      }))
    }
  }

  // 3. Atualizar Canais (iFood e Rede)
  const canais = await db.canais.toArray()
  const ifood = canais.find((c) => c.codigo === 'ifood')
  if (ifood) {
    const ifoodSemente = CANAIS.find((c) => c.codigo === 'ifood')
    if (ifoodSemente) {
      ops.push(op('canais', { ...ifood, comissao: ifoodSemente.comissao }))
    }
  }
  if (!canais.some((c) => c.codigo === 'rede')) {
    const redeSemente = CANAIS.find((c) => c.codigo === 'rede')
    if (redeSemente) {
      ops.push(op('canais', redeSemente as any))
    }
  }

  // 4. Desativar custo fixo Maria Eduarda
  const custosFixos = await db.custosFixos.toArray()
  const me = custosFixos.find((c) => c.nome.includes('Maria Eduarda — balcão'))
  if (me && !me.deletedAt) {
    ops.push(op('custosFixos', { ...me, deletedAt: new Date().toISOString() }))
  }

  // 5. Cadastrar Espeto do João na rede
  const parceiros = await db.parceiros.toArray()
  for (const pSemente of PARCEIROS) {
    if (!parceiros.some((p) => p.nome === pSemente.nome)) {
      ops.push(op('parceiros', pSemente as any))
    }
  }

  // 6. Cadastrar rotina da equipe (35 tarefas)
  const rotinas = await db.rotinaTarefas.toArray()
  if (!rotinas.some((r) => r.papel === 'equipe')) {
    ROTINA_EQUIPE.forEach(([diaSemana, inicio, fim, titulo, detalhe, tipo, obrigatoria, atalho], ordem) => {
      ops.push(op('rotinaTarefas', {
        diaSemana, inicio, fim, titulo, detalhe, tipo, obrigatoria, atalho,
        papel: 'equipe', ordem, ativa: true,
      }))
    })
  }

  // 7. Notas do mentor
  const notas = await db.notasMentor.toArray()
  if (notas.length === 0) {
    NOTAS_MENTOR.forEach((texto) => {
      ops.push(op('notasMentor', { texto }))
    })
  }

  // 8. Tarefas avulsas novas da v3
  const avulsas = await db.tarefasAvulsas.toArray()
  for (const t of TAREFAS_AVULSAS) {
    if (!avulsas.some((a) => a.titulo === t.titulo)) {
      ops.push(op('tarefasAvulsas', {
        ...t,
        data: dataDaTarefa(t.quando, hoje),
        papel: 'dono',
      }))
    }
  }

  if (ops.length > 0) {
    await gravarSemSessao({ empresaId, userId }, ops)
  }
}
