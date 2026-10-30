import { describe, expect, it } from 'vitest'
import { db } from '@/lib/db/banco'
import type { MovimentacaoCaixa } from '@/lib/db/tipos'

describe('Caixa banco & tipos', () => {
  it('db.movimentacoesCaixa deve existir e estar configurada', () => {
    expect(db.movimentacoesCaixa).toBeDefined()
  })

  it('deve aceitar campos validos de MovimentacaoCaixa', () => {
    const mov: MovimentacaoCaixa = {
      id: 'm1',
      empresaId: 'emp1',
      data: '2026-10-30',
      tipo: 'entrada',
      categoria: 'Venda Pontos Comerciais',
      descricao: 'Venda 24 brownies',
      valor: 240,
      origem: 'venda',
      formaPagamento: 'pix',
      referenciaId: 'venda1',
      detalhes: '24x Tradicional (Grande)',
      registradoPor: 'Admin',
      createdAt: '2026-10-30T10:00:00Z',
      updatedAt: '2026-10-30T10:00:00Z',
      updatedBy: 'u1',
      deletedAt: null,
    }
    expect(mov.tipo).toBe('entrada')
    expect(mov.valor).toBe(240)
  })
})
