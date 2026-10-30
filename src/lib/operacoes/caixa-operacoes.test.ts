import { describe, expect, it } from 'vitest'
import { validarMovimentacao, formatarItensVendaCaixa } from './caixa'
import { montarVenda, type ContextoVenda, type NovaVenda } from './vendas'
import type { Estoque } from './estoque'
import { definirSessao } from '@/lib/sessao'

describe('Caixa Operações & Validação', () => {
  it('deve exigir descrição preenchida se a categoria for Outro', () => {
    expect(() => {
      validarMovimentacao({
        tipo: 'saida',
        categoria: 'Outro',
        descricao: '   ',
        valor: 50,
      })
    }).toThrow(/obrigat/i)
  })

  it('deve aceitar categoria conhecida mesmo com descrição opcional', () => {
    expect(() => {
      validarMovimentacao({
        tipo: 'saida',
        categoria: 'Matéria Prima',
        descricao: '',
        valor: 150,
      })
    }).not.toThrow()
  })

  it('deve formatar itens de venda com produtos e quantidades para o caixa', () => {
    const itens = [
      { saborId: 'trad', tamanho: 'grande' as const, qtd: 24, precoUnitario: 10, custoUnitario: 3 },
      { saborId: 'nutella', tamanho: 'pequeno' as const, qtd: 10, precoUnitario: 5, custoUnitario: 2 },
    ]
    const mapaNomes = new Map([
      ['trad', 'Tradicional'],
      ['nutella', 'Nutella'],
    ])
    const texto = formatarItensVendaCaixa(itens, (id) => mapaNomes.get(id))
    expect(texto).toContain('24x Tradicional (grande)')
    expect(texto).toContain('10x Nutella (pequeno)')
  })
})

describe('Interligação Automática de Vendas com Fluxo de Caixa', () => {
  it('montarVenda para ponto comercial deve gerar automaticamente op de entrada no caixa', () => {
    const venda: NovaVenda = {
      canal: 'ponto',
      pagamento: 'pix',
      parceiroId: 'parceiro-123',
      itens: [
        { saborId: 'trad', tamanho: 'grande', qtd: 24, precoUnitario: 10, custoUnitario: 3 },
      ],
    }
    const ctx: ContextoVenda = {
      horaViradaDia: 4,
      produtoPorId: new Map(),
      momento: new Date('2026-10-30T14:00:00Z'),
    }
    const mockEstoque: Estoque = { lotes: [], movimentos: [], saldoLote: new Map(), saldoItem: new Map() }
    
    // Simula sessao autenticada
    definirSessao({
      empresaId: 'emp-1',
      membroId: 'mem-1',
      userId: 'usr-1',
      nome: 'Wallace',
      papel: 'dono',
    })

    const { ops, vendaId } = montarVenda(venda, ctx, mockEstoque)

    const opCaixa = ops.find((o) => o.tabela === 'movimentacoesCaixa')
    expect(opCaixa).toBeDefined()
    expect(opCaixa?.dados).toMatchObject({
      tipo: 'entrada',
      categoria: 'Venda Pontos Comerciais',
      valor: 240,
      formaPagamento: 'pix',
      origem: 'venda',
      referenciaId: vendaId,
    })
    expect(opCaixa?.dados.detalhes).toContain('24x')
  })
})
