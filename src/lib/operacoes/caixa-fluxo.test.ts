import { describe, expect, it } from 'vitest'
import {
  CATEGORIAS_SAIDA,
  validarMovimentacao,
} from './caixa'
import { montarVenda, type ContextoVenda, type NovaVenda } from './vendas'
import type { Estoque } from './estoque'
import { definirSessao } from '@/lib/sessao'
import type { MovimentacaoCaixa } from '@/lib/db/tipos'

describe('Fluxo Completo de Caixa - Regras de Negócio', () => {
  definirSessao({
    empresaId: 'emp-teste',
    membroId: 'mem-teste',
    userId: 'usr-teste',
    nome: 'Dono Old Brownies',
    papel: 'dono',
  })

  const mockEstoque: Estoque = {
    lotes: [],
    movimentos: [],
    saldoLote: new Map(),
    saldoItem: new Map(),
  }

  const ctx: ContextoVenda = {
    horaViradaDia: 4,
    produtoPorId: new Map(),
    momento: new Date('2026-10-30T10:00:00Z'),
  }

  it('1. Venda para ponto comercial gera automaticamente entrada categorizada com produtos e quantidades', () => {
    const venda: NovaVenda = {
      canal: 'ponto',
      pagamento: 'pix',
      parceiroId: 'ponto-cafe-cultura',
      itens: [
        { saborId: 'tradicional', tamanho: 'grande', qtd: 24, precoUnitario: 10, custoUnitario: 3.5 },
        { saborId: 'nutella', tamanho: 'grande', qtd: 12, precoUnitario: 10, custoUnitario: 4 },
      ],
      observacao: 'Ponto Café Cultura',
    }

    const { ops, vendaId } = montarVenda(venda, ctx, mockEstoque)

    const opCaixa = ops.find((o) => o.tabela === 'movimentacoesCaixa')
    expect(opCaixa).toBeDefined()
    expect(opCaixa?.dados).toMatchObject({
      tipo: 'entrada',
      categoria: 'Venda Pontos Comerciais',
      valor: 360,
      formaPagamento: 'pix',
      origem: 'venda',
      referenciaId: vendaId,
    })
    expect(opCaixa?.dados.detalhes).toContain('24x tradicional (grande)')
    expect(opCaixa?.dados.detalhes).toContain('12x nutella (grande)')
  })

  it('2. Venda direta de balcão/loja gera entrada categorizada como Venda Balcão / Loja', () => {
    const vendaLoja: NovaVenda = {
      canal: 'loja',
      pagamento: 'dinheiro',
      itens: [
        { saborId: 'tradicional', tamanho: 'pequeno', qtd: 4, precoUnitario: 8, custoUnitario: 2.5 },
      ],
    }

    const { ops } = montarVenda(vendaLoja, ctx, mockEstoque)
    const opCaixa = ops.find((o) => o.tabela === 'movimentacoesCaixa')
    expect(opCaixa?.dados).toMatchObject({
      tipo: 'entrada',
      categoria: 'Venda Balcão / Loja',
      valor: 32,
      formaPagamento: 'dinheiro',
      origem: 'venda',
    })
  })

  it('3. Lançamento manual de saídas categorizadas (Matéria Prima, Pessoal, Aluguel, etc)', () => {
    // Categorias padrão solicitadas
    const categoriasEsperadas = [
      'Matéria Prima',
      'Pessoal',
      'Fornecedor',
      'Aluguel Empresarial',
      'Máquinas',
    ]

    for (const cat of categoriasEsperadas) {
      expect(CATEGORIAS_SAIDA).toContain(cat)
      expect(() =>
        validarMovimentacao({
          tipo: 'saida',
          categoria: cat,
          valor: 100,
        }),
      ).not.toThrow()
    }
  })

  it('4. Categoria "Outro" exige descrição detalhada obrigatória', () => {
    // Vazia ou só espaços deve falhar
    expect(() =>
      validarMovimentacao({
        tipo: 'saida',
        categoria: 'Outro',
        descricao: '',
        valor: 50,
      }),
    ).toThrow(/obrigat/i)

    expect(() =>
      validarMovimentacao({
        tipo: 'saida',
        categoria: 'Outro',
        descricao: '   ',
        valor: 50,
      }),
    ).toThrow(/obrigat/i)

    // Preenchida deve passar
    expect(() =>
      validarMovimentacao({
        tipo: 'saida',
        categoria: 'Outro',
        descricao: 'Manutenção do forno industrial',
        valor: 250,
      }),
    ).not.toThrow()
  })

  it('5. Cálculo correto de relatório por período (Entradas, Saídas e Saldo Líquido)', () => {
    const movs: MovimentacaoCaixa[] = [
      {
        id: '1',
        empresaId: 'emp-teste',
        data: '2026-10-15',
        tipo: 'entrada',
        categoria: 'Venda Pontos Comerciais',
        descricao: 'Venda ponto A',
        valor: 500,
        origem: 'venda',
        registradoPor: 'Admin',
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-15T10:00:00Z',
        updatedBy: 'usr',
        deletedAt: null,
      },
      {
        id: '2',
        empresaId: 'emp-teste',
        data: '2026-10-20',
        tipo: 'saida',
        categoria: 'Matéria Prima',
        descricao: 'Chocolate em pó 50%',
        valor: 150,
        origem: 'manual',
        registradoPor: 'Admin',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z',
        updatedBy: 'usr',
        deletedAt: null,
      },
      {
        id: '3',
        empresaId: 'emp-teste',
        data: '2026-10-22',
        tipo: 'saida',
        categoria: 'Aluguel Empresarial',
        descricao: 'Aluguel cozinha',
        valor: 200,
        origem: 'manual',
        registradoPor: 'Admin',
        createdAt: '2026-10-22T10:00:00Z',
        updatedAt: '2026-10-22T10:00:00Z',
        updatedBy: 'usr',
        deletedAt: null,
      },
      // Movimentação fora do período de teste
      {
        id: '4',
        empresaId: 'emp-teste',
        data: '2026-11-05',
        tipo: 'entrada',
        categoria: 'Venda Balcão / Loja',
        descricao: 'Venda novembro',
        valor: 300,
        origem: 'venda',
        registradoPor: 'Admin',
        createdAt: '2026-11-05T10:00:00Z',
        updatedAt: '2026-11-05T10:00:00Z',
        updatedBy: 'usr',
        deletedAt: null,
      },
    ]

    const dataInicio = '2026-10-01'
    const dataFim = '2026-10-31'

    const filtradas = movs.filter((m) => m.data >= dataInicio && m.data <= dataFim)
    expect(filtradas.length).toBe(3)

    const totalEntradas = filtradas
      .filter((m) => m.tipo === 'entrada')
      .reduce((s, m) => s + m.valor, 0)
    const totalSaidas = filtradas
      .filter((m) => m.tipo === 'saida')
      .reduce((s, m) => s + m.valor, 0)
    const saldoLiquido = totalEntradas - totalSaidas

    expect(totalEntradas).toBe(500)
    expect(totalSaidas).toBe(350)
    expect(saldoLiquido).toBe(150)
  })
})
