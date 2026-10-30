// Operações de Fluxo de Caixa (Entradas e Saídas)
import type { CodigoCanal, MovimentacaoCaixa, TipoMovimentacaoCaixa } from '@/lib/db/tipos'
import { atualizar, excluir, gravar, op, type NovoRegistro } from '@/lib/sync/gravar'
import type { ItemVenda } from './vendas'

export const CATEGORIAS_SAIDA = [
  'Matéria Prima',
  'Pessoal',
  'Fornecedor',
  'Aluguel Empresarial',
  'Máquinas',
  'Marketing',
  'Logística',
  'Outro',
] as const

export const CATEGORIAS_ENTRADA = [
  'Venda Pontos Comerciais',
  'Venda Balcão / Loja',
  'Venda Evento / Feira',
  'Aporte',
  'Outro',
] as const

export function categoriaParaCanal(canal: CodigoCanal): string {
  if (canal === 'ponto' || canal === 'rede') return 'Venda Pontos Comerciais'
  if (canal === 'vendedor' || canal === 'motorista') return 'Venda Parceiro'
  if (canal === 'feira' || canal === 'evento') return 'Venda Evento / Feira'
  return 'Venda Balcão / Loja'
}

export function validarMovimentacao(dados: {
  tipo: TipoMovimentacaoCaixa
  categoria: string
  descricao?: string
  valor: number
}) {
  if (!dados.valor || dados.valor <= 0) {
    throw new Error('O valor da movimentação deve ser maior que zero.')
  }
  const ehOutro = dados.categoria.trim().toLowerCase() === 'outro'
  if (ehOutro && (!dados.descricao || !dados.descricao.trim())) {
    throw new Error('Descrição é obrigatória para a categoria Outro. Especifique o motivo.')
  }
}

export function formatarItensVendaCaixa(
  itens: ItemVenda[],
  obterNomeSabor?: (saborId: string) => string | undefined,
  obterNomeProduto?: (produtoId: string) => string | undefined,
): string {
  const partes: string[] = []
  for (const item of itens) {
    if (item.qtd <= 0) continue
    let nome = ''
    if (item.saborId) {
      const nomeSabor = obterNomeSabor ? obterNomeSabor(item.saborId) : undefined
      nome = nomeSabor ?? item.saborId
      if (item.tamanho) nome += ` (${item.tamanho})`
    } else if (item.produtoId) {
      const nomeProd = obterNomeProduto ? obterNomeProduto(item.produtoId) : undefined
      nome = nomeProd ?? item.produtoId
    } else {
      nome = 'Brownie'
    }
    partes.push(`${item.qtd}x ${nome}`)
  }
  return partes.join(', ')
}

export async function lancarMovimentacao(dados: NovoRegistro<MovimentacaoCaixa>): Promise<string> {
  validarMovimentacao(dados)
  const [id] = await gravar(op('movimentacoesCaixa', dados))
  return id
}

export function atualizarMovimentacao(id: string, patch: Partial<MovimentacaoCaixa>) {
  if (patch.categoria !== undefined || patch.descricao !== undefined || patch.valor !== undefined) {
    if (patch.categoria?.trim().toLowerCase() === 'outro' && (!patch.descricao || !patch.descricao.trim())) {
      throw new Error('Descrição é obrigatória para a categoria Outro.')
    }
  }
  return atualizar('movimentacoesCaixa', id, patch)
}

export function excluirMovimentacao(id: string) {
  return excluir('movimentacoesCaixa', id)
}
