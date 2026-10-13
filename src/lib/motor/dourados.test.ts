// 2.13 — Testes dourados v3 (substituem a tabela B8): com as sementes da v3, o motor atinge a Tabela 2.13.
import { describe, expect, it } from 'vitest'
import {
  COMPRAS_EXEMPLO, CONFIG, CUSTOS_FIXOS, INSUMOS, PRODUTOS, RECEITAS, SABORES, TAMANHOS,
} from '@/lib/db/sementes'
import { calcularCustos, custoProduto, type EntradaCustos } from './custo'
import { lucroPorForma, lucroPorPeca, precoMedioLoja, taxaDoCanal } from './lucro'
import { equilibrioEmPecas, lucroLojaEquilibrio, somarFixos } from './resultado'
import { calcularPagamento } from './funcionario'
import { simularRede } from './simulador'
import { diaComercial, diaSemanaIso } from './dia'

const PECA = 0.01
const MES = 1

function perto(valor: number, esperado: number, tolerancia = PECA) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia)
}

function entradaDasSementes(formasSemana = 8): EntradaCustos {
  return {
    insumos: INSUMOS.map((i) => ({ id: i.codigo, codigo: i.codigo, precoManual: i.precoManual })),
    compras: COMPRAS_EXEMPLO.map((c) => ({ insumoId: c.insumo, data: c.data, quantidade: c.quantidade, valorTotal: c.valorTotal })),
    sabores: SABORES.map((s) => ({ id: s.codigo, pesoMix: s.pesoMix })),
    receitas: Object.entries(RECEITAS).flatMap(([sabor, itens]) =>
      itens.map(([insumo, quantidade]) => ({ saborId: sabor, insumoId: insumo, quantidade }))),
    pecasPorForma: { pequeno: 35, grande: 24 },
    config: CONFIG,
    formasSemana,
  }
}

const tabela = calcularCustos(entradaDasSementes())
const taxas = { taxaMaquininha: CONFIG.taxaMaquininha, comissaoIfood: CONFIG.comissaoIfood }
const lucroCanal = (canal: Parameters<typeof taxaDoCanal>[0], preco: number, tamanho: 'pequeno' | 'grande') =>
  lucroPorPeca(preco, taxaDoCanal(canal, taxas), tabela.variavelMix[tamanho])

describe('2.13 · custos', () => {
  it('custo direto — tradicional e limão (sem mudança)', () => {
    perto(tabela.direto.tradicional.pequeno, 2.0985)
    perto(tabela.direto.tradicional.grande, 2.6477)
    perto(tabela.direto.limao.pequeno, 4.0703)
    perto(tabela.direto.limao.grande, 5.5233)
  })

  it('custo direto no mix — pequeno e grande (sem mudança)', () => {
    perto(tabela.diretoMix.pequeno, 2.3002)
    perto(tabela.diretoMix.grande, 2.9420)
  })

  it('custo de produção por forma, com diária zero (só o gás)', () => {
    perto(tabela.producaoPorForma, 2.7045)
    expect(tabela.jornadasPorSemana).toBe(1)
  })

  it('custo variável — tradicional e limão', () => {
    perto(tabela.variavel.tradicional.pequeno, 2.1757)
    perto(tabela.variavel.tradicional.grande, 2.7604)
    perto(tabela.variavel.limao.pequeno, 4.1475)
    perto(tabela.variavel.limao.grande, 5.6360)
  })

  it('custo variável no mix — pequeno e grande', () => {
    perto(tabela.variavelMix.pequeno, 2.3775)
    perto(tabela.variavelMix.grande, 3.0547)
  })

  it('custo de hoje do cardápio e combos (2.3 / 2.4)', () => {
    const idsSabor = (p: (typeof PRODUTOS)[number]) => ({
      ...p,
      saborId: p.sabor,
      composicao: p.composicao?.map((c) => ('sabor' in c ? { saborId: c.sabor, tamanho: c.tamanho, qtd: c.qtd } : c)),
    })
    const custo = (nome: string) => custoProduto(idsSabor(PRODUTOS.find((p) => p.nome === nome)!), tabela)!

    // Brownie + Coca / Dupla da Casa com cookie / com castanha
    perto(custo('Brownie + Coca'), 4.6757)
    const duplaCookie = custoProduto({
      tipo: 'combo',
      composicao: [{ saborId: 'tradicional', tamanho: 'pequeno', qtd: 1 }, { saborId: 'cookie', tamanho: 'pequeno', qtd: 1 }],
    }, tabela)!
    const duplaCastanha = custoProduto({
      tipo: 'combo',
      composicao: [{ saborId: 'tradicional', tamanho: 'pequeno', qtd: 1 }, { saborId: 'castanha', tamanho: 'pequeno', qtd: 1 }],
    }, tabela)!
    perto(duplaCookie, 4.4485)
    perto(duplaCastanha, 4.5200)

    // Dupla Whisky / Trio Old / Old Box
    perto(custo('Dupla Whisky'), 5.7002)
    perto(custo('Trio Old'), 6.7928)
    perto(custo('Old Box'), 12.0685)
  })

  it('sobra no iFood (26,5% + R$ 1 de embalagem)', () => {
    const idsSabor = (p: (typeof PRODUTOS)[number]) => ({
      ...p,
      saborId: p.sabor,
      composicao: p.composicao?.map((c) => ('sabor' in c ? { saborId: c.sabor, tamanho: c.tamanho, qtd: c.qtd } : c)),
    })
    const custo = (nome: string) => custoProduto(idsSabor(PRODUTOS.find((p) => p.nome === nome)!), tabela)!

    const sobraIfood = (preco: number, custoProd: number) =>
      preco * (1 - CONFIG.comissaoIfood) - CONFIG.embalagemIfood - custoProd

    // Brownie + Coca: 16.90
    perto(sobraIfood(16.90, custo('Brownie + Coca')), 6.75)

    // Dupla da Casa (média: 4.48425): 24.90
    const custoDuplaMedia = (4.4485 + 4.5200) / 2
    perto(sobraIfood(24.90, custoDuplaMedia), 12.82)

    // Old Box: 59.90
    perto(sobraIfood(59.90, custo('Old Box')), 30.96)
  })

  it('pedido médio do iFood (mix de planejamento, só para projeção)', () => {
    const valor = 27.1125
    const custo = 5.4115
    const sobra = valor * (1 - CONFIG.comissaoIfood) - CONFIG.embalagemIfood - custo
    perto(valor, 27.1125)
    perto(custo, 5.4115)
    perto(sobra, 13.5162)
  })
})

describe('2.13 · lucro por canal', () => {
  it('preço médio da loja no mix', () => {
    const produtos = PRODUTOS.map((p) => ({ ...p, saborId: p.sabor }))
    perto(precoMedioLoja(produtos, SABORES.map((s) => ({ id: s.codigo, pesoMix: s.pesoMix }))), 14.25, 0.0001)
  })

  it('lucro por peça nos canais', () => {
    perto(lucroCanal('vendedor', 8, 'pequeno'), 5.6225)
    perto(lucroCanal('motorista', 8, 'pequeno'), 5.6225)
    perto(lucroCanal('ponto', 10, 'grande'), 6.9453)
    perto(lucroCanal('loja', 14.25, 'pequeno'), 11.5447)
    perto(lucroCanal('rota', 18, 'grande'), 14.5313)
    perto(lucroCanal('feira', 15, 'pequeno'), 12.2775)
  })

  it('lucro por forma e por caixa', () => {
    perto(lucroPorForma(lucroCanal('vendedor', 8, 'pequeno'), 35), 196.79)
    perto(lucroPorForma(lucroCanal('ponto', 10, 'grande'), 24), 166.69)
  })

  it('rede de restaurantes (Espeto do João) — tradicional e honey', () => {
    // R$ 5,00 tradicional, R$ 5,50 honey, sem taxa (Pix), pequeno
    const lucroTradicional = 5.00 - tabela.variavel.tradicional.pequeno
    const lucroHoney = 5.50 - tabela.variavel.honey.pequeno
    perto(lucroTradicional, 2.8243)
    perto(lucroHoney, 2.6136)
  })
})

describe('2.13 · funcionária (cálculo B5.14)', () => {
  it('experiência — loja R$ 4.445,66 e iFood R$ 2.349,57', () => {
    const r = calcularPagamento({
      fase: 'experiencia',
      diasNoMes: 30,
      diasNestaFase: 30,
      baseLoja: 4445.66,
      baseIfood: 2349.57,
      fatorDsr: CONFIG.fatorDsr,
      semanas: [],
      notaIfood: 5.0,
      cancelamentosFalhaLoja: 0,
      checklistEquipe: 1.0,
      trimestreBateuMeta: false,
      usaVT: true,
      viagensDia: 2,
      diasMesVT: 26,
      tarifaOnibus: CONFIG.tarifaOnibus,
      encargosFolha: CONFIG.encargosFolha,
    })

    perto(r.comissao, 248.31)
    perto(r.dsr, 49.66)
    perto(r.recebe, 1918.98)
    perto(r.vtEmpresa, 160.14)
    perto(r.custoEmpresa, 2654.81)
  })

  it('nível 1 — mesmo mês com 3 semanas de meta e bônus qualidade (R$ 250)', () => {
    const r = calcularPagamento({
      fase: 'nivel1',
      diasNoMes: 30,
      diasNestaFase: 30,
      baseLoja: 4445.66,
      baseIfood: 2349.57,
      fatorDsr: CONFIG.fatorDsr,
      semanas: [
        { meta: true, superMeta: false },
        { meta: true, superMeta: false },
        { meta: true, superMeta: false },
        { meta: false, superMeta: false },
      ],
      notaIfood: 4.8,
      cancelamentosFalhaLoja: 0,
      checklistEquipe: 0.95,
      trimestreBateuMeta: false,
      usaVT: true,
      viagensDia: 2,
      diasMesVT: 26,
      tarifaOnibus: CONFIG.tarifaOnibus,
      encargosFolha: CONFIG.encargosFolha,
    })

    expect(r.bonusSemana + r.bonusQualidade).toBe(250)
    perto(r.recebe, 2347.98)
    perto(r.vtEmpresa, 149.40)
    perto(r.custoEmpresa, 3201.77)
  })
})

describe('2.13 · equilíbrio e custos fixos', () => {
  const fixos = somarFixos(CUSTOS_FIXOS)
  const lucroLoja = lucroLojaEquilibrio(
    14.25,
    CONFIG.taxaMaquininha,
    CONFIG.provisaoImposto,
    tabela.variavelMix.pequeno,
    0.04,
    CONFIG.fatorDsr,
    CONFIG.encargosFolha,
  )

  it('lucro da loja por brownie para o equilíbrio', () => {
    perto(lucroLoja, 9.9430, 0.0001)
  })

  it('totais dos custos fixos com a loja parada (2.7)', () => {
    // Com a loja parada (sem comissão):
    // Na experiência: funcionária custa 1621 * 1.30 + 160.14 = 2.267,44
    const custoFuncExp = 1621 * (1 + CONFIG.encargosFolha) + (26 * 2 * CONFIG.tarifaOnibus - 0.06 * 1621)
    perto(custoFuncExp, 2267.44)

    // No nível 1: funcionária custa 1800 * 1.30 + 149.40 = 2.489,40
    const custoFuncN1 = 1800 * (1 + CONFIG.encargosFolha) + (26 * 2 * CONFIG.tarifaOnibus - 0.06 * 1800)
    perto(custoFuncN1, 2489.40)

    // Contas da loja (aluguel 477.44 + net 130 + emive 299.89 + luz 300) = 1.207,33
    perto(fixos.ponto, 1207.33, MES)
    perto(fixos.empresa, 1693.00, MES)
    perto(fixos.pessoal, 2549.68, MES)
    perto(fixos.divida, 1630.00, MES)
  })

  it('equilíbrio só da funcionária e com contas da loja (brownies por dia na loja)', () => {
    const custoFuncExp = 2267.44
    const custoFuncN1 = 2489.40
    const diasMes = 26

    // Equilíbrio só da funcionária
    perto(custoFuncExp / (lucroLoja * diasMes), 8.77)
    perto(custoFuncN1 / (lucroLoja * diasMes), 9.63)

    // Equilíbrio da funcionária + contas da loja
    perto((custoFuncExp + fixos.ponto) / (lucroLoja * diasMes), 13.44)
    perto((custoFuncN1 + fixos.ponto) / (lucroLoja * diasMes), 14.30)
  })

  it('equilíbrio em peças por mês (nível 1) — ponto / empresa / vida / dívida / total', () => {
    const pontoN1 = fixos.ponto + 2489.40
    perto(equilibrioEmPecas(pontoN1, lucroLoja), 371.79)
    perto(equilibrioEmPecas(fixos.empresa, lucroLoja), 170.27)
    perto(equilibrioEmPecas(fixos.pessoal, lucroLoja), 256.43)
    perto(equilibrioEmPecas(fixos.divida, lucroLoja), 163.93)
    const total = pontoN1 + fixos.empresa + fixos.pessoal + fixos.divida
    perto(equilibrioEmPecas(total, lucroLoja), 962.42)
  })
})

describe('2.13 · rede completa v3 (simulador)', () => {
  const fixos = somarFixos(CUSTOS_FIXOS)
  const r = simularRede(
    {
      diasLoja: 6, lojaPorDia: 15, precoMedioLoja: 14.25,
      vendedores: 5, vendedorPorSemana: 35, precoVendedor: 8,
      motoristas: 5, motoristaPorDia: 4, diasMotorista: 6, precoMotorista: 8,
      pontos: 5, caixasPorMes: 2, pecasPorCaixa: 24, precoPonto: 10, trocaPct: 0.2,
      semanasPorMes: CONFIG.semanasPorMes, provisaoImposto: CONFIG.provisaoImposto,
      capacidadeJornada: CONFIG.capacidadeJornada, taxaMaquininha: CONFIG.taxaMaquininha,
      fixosLoja: fixos.ponto, fixosEmpresa: fixos.empresa, pessoal: fixos.pessoal, divida: fixos.divida,
      pecasPorForma: { pequeno: 35, grande: 24 },
      ifood: {
        pedidosPorSemana: 30,
        ticketMedio: 27.1125,
        custoMedio: 5.4115,
        sobraMedia: 13.5162,
        mensalidade: 150,
      },
      funcionario: {
        custoMes: 3412.75,
        fixoBaseMes: 2489.40,
      },
    },
    (formas) => calcularCustos(entradaDasSementes(formas)).variavelMix,
  )

  it('produção e jornadas', () => {
    perto(r.formasSemana, 15.44)
    expect(r.jornadas).toBe(1)
  })

  it('faturamento e lucro dos setores', () => {
    perto(r.faturamento, 21707.31, MES)
    perto(r.lucroSetores, 10342.72, MES)
  })

  it('lucro da empresa e sobra no fim do mês', () => {
    perto(r.lucroEmpresa, 7564.35, MES)
    perto(r.sobra, 3384.67, MES)
  })

  it('% do volume para a empresa se pagar e para pagar tudo', () => {
    perto(r.pctEmpresaSePagar * 100, 42.3, 0.05)
    perto(r.pctPagarTudo * 100, 74.2, 0.05)
  })
})

describe('2.13 · dia comercial', () => {
  it('venda às 0h30 de sábado conta para sexta', () => {
    const dia = diaComercial(new Date('2026-10-03T04:30:00Z'), CONFIG.horaViradaDia)
    expect(dia).toBe('2026-10-02')
    expect(diaSemanaIso(dia)).toBe(5)
  })

  it('às 4h o dia vira', () => {
    expect(diaComercial(new Date('2026-10-03T08:00:00Z'), 4)).toBe('2026-10-03')
  })
})

describe('sementes', () => {
  it('tamanhos: grande 24, pequeno 35', () => {
    expect(TAMANHOS).toEqual([{ codigo: 'grande', pecasPorForma: 24 }, { codigo: 'pequeno', pecasPorForma: 35 }])
  })
})
