// Modelo de dados — seção B3 da especificação.
// Campos comuns (Base) em toda tabela; movimentos são só de inclusão.

export interface Base {
  id: string
  empresaId: string
  createdAt: string
  updatedAt: string
  updatedBy: string
  deletedAt: string | null
}

export type Papel = 'dono' | 'mentor' | 'equipe' | 'parceiro'
export type CodigoTamanho = 'grande' | 'pequeno'
export type CodigoCanal = 'loja' | 'rota' | 'feira' | 'evento' | 'ifood' | 'vendedor' | 'motorista' | 'ponto' | 'rede'
export type Pagamento = 'dinheiro' | 'pix' | 'maquininha' | 'ifood'
export type TipoParceiro = 'vendedor' | 'motorista' | 'ponto' | 'rede'
export type StatusParceiro = 'candidato' | 'treino' | 'teste' | 'ativo' | 'pausado' | 'saiu'
export type TipoTarefa = 'escola' | 'mensagem' | 'operacao' | 'captacao' | 'feira' | 'rota' | 'preparo' | 'ifood' | 'mentalidade' | 'esforco'
export type TipoMovimento =
  | 'producao' | 'venda' | 'repasse' | 'troca_saida' | 'troca_volta'
  | 'consignado_saida' | 'consignado_volta' | 'perda' | 'amostra' | 'ajuste_contagem'

export interface Empresa extends Base {
  nome: string
  razaoSocial: string
  cnpj: string
  chavePix: string
  endereco: string
  fuso: string
}

export interface Membro extends Base {
  userId: string
  papel: Papel
  nome: string
  parceiroId?: string
  ultimoAcesso?: string
  pendentesSync?: number
}

export interface Convite extends Base {
  codigo: string
  papel: Papel
  criadoPor: string
  usadoPor?: string
  expiraEm: string
}

export interface Config extends Base {
  taxaMaquininha: number
  comissaoIfood: number | null
  embalagemIfood: number
  mensalidadeIfood: number
  limiteMensalidadeIfood: number
  repasseIfood: 'semanal' | 'mensal'
  encargosFolha: number
  fatorDsr: number
  tarifaOnibus: number
  salarioMinimo: number
  diasValidade: number
  diasMaxNoPonto: number
  semanasPorMes: number
  diariaProducao: number
  capacidadeJornada: number
  gasMesReferencia: number
  formasReferencia: number
  provisaoImposto: number
  precoFinalRevenda: number
  horaViradaDia: number
  metaLojaDia: number
}

export interface Insumo extends Base {
  codigo: string
  nome: string
  unidade: string
  precoManual: number
  observacao?: string
}

export interface ListaCompra extends Base {
  insumoId: string
  quantidadeNecessaria: number
  concluido: boolean
  valorPago: number | null
  compradoPor: string | null
}

export interface Compra extends Base {
  data: string
  insumoId: string
  quantidade: number
  valorTotal: number
  fornecedor: string
}

export interface Sabor extends Base {
  codigo: string
  nome: string
  pesoMix: number
  validadeDias: number
  soEncomenda: boolean
  ativo: boolean
}

export interface ReceitaItem extends Base {
  saborId: string
  insumoId: string
  quantidade: number
}

export interface Tamanho extends Base {
  codigo: CodigoTamanho
  pecasPorForma: number
}

export type ItemComposicao =
  | { saborId: string; tamanho: CodigoTamanho; qtd: number }
  | { descricao: string; valor: number }

export interface Produto extends Base {
  tipo: 'brownie' | 'combo' | 'bebida' | 'salgado'
  nome: string
  saborId?: string
  tamanho?: CodigoTamanho
  precoLoja: number
  custoManual?: number | null
  composicao?: ItemComposicao[]
  observacao?: string
  ifood?: boolean
  vendeNoIfood?: boolean
  obsIfood?: string
  ordem?: number
}

export interface Producao extends Base {
  data: string
  responsavel: string
  diariaPaga: number
}

export interface ProducaoItem extends Base {
  producaoId: string
  saborId: string
  tamanho: CodigoTamanho
  formas: number
}

export interface Lote extends Base {
  producaoItemId: string
  saborId: string
  tamanho: CodigoTamanho
  qtdInicial: number
  validadeAte: string
}

export interface Movimento extends Base {
  data: string
  diaComercial: string
  loteId: string | null
  saborId: string
  tamanho: CodigoTamanho
  qtd: number
  tipo: TipoMovimento
  refId: string
}

export interface Canal extends Base {
  codigo: CodigoCanal
  nome: string
  tipo: 'direto' | 'parceiro'
  tamanhoPadrao: CodigoTamanho
  precoPadrao: number | null
  comissao: number | null
}

export interface Venda extends Base {
  data: string
  diaComercial: string
  canal: CodigoCanal
  parceiroId?: string
  feiraNome?: string
  pagamento: Pagamento
  registradaPor: string
  observacao?: string
}

export interface VendaItem extends Base {
  vendaId: string
  produtoId?: string
  saborId?: string
  tamanho?: CodigoTamanho
  qtd: number
  precoUnitario: number
  custoUnitario: number
}

export interface Parceiro extends Base {
  tipo: TipoParceiro
  nome: string
  whatsapp: string
  status: StatusParceiro
  zona?: string
  noites?: number[]
  polo?: string
  endereco?: string
  diaVisita?: number
  fimTeste?: string
  dataEntrada: string
  observacoes?: string
}

export interface VisitaPonto extends Base {
  data: string
  parceiroId: string
  contadoNoBalcao: number
  trocado: number
  repostoSemCusto: number
  vendaId?: string
  observacao?: string
}

export interface Perda extends Base {
  data: string
  loteId: string | null
  saborId: string
  tamanho: CodigoTamanho
  qtd: number
  motivo: 'validade' | 'quebra' | 'outro'
}

export interface Amostra extends Base {
  data: string
  local: string
  qtd: number
  deRecorte: boolean
  saborId?: string
  tamanho?: CodigoTamanho
}

export interface Contagem extends Base {
  data: string
  itens: Array<{ loteId: string | null; saborId: string; tamanho: CodigoTamanho; contado: number; sistema: number }>
}

export interface Funcionario extends Base {
  membroId: string
  nome: string
  admissao: string
  fimExperiencia: string // admissao + 59 dias
  fase: 'experiencia' | 'nivel1' | 'nivel2' | 'nivel3'
  faseDesde: string
  usaVT: boolean
  viagensDia: number // 2
  diasMesVT: number // 26
  obs?: string
}

export interface MudancaFase extends Base {
  funcionarioId: string
  data: string
  de: string
  para: string
  motivo: 'fim_experiencia' | 'antecipacao' | 'criterio' | 'outro'
  registradoPor: string
}

export interface MetricasIfood extends Base {
  dataReferencia: string // O domingo da semana avaliada (ISO)
  nota: number
}

export interface Cancelamento extends Base {
  data: string
  vendaId?: string
  motivo: string
  culpa: 'loja' | 'motoboy' | 'app'
  registradoPor: string
}

export type GrupoCusto = 'ponto' | 'empresa' | 'pessoal' | 'divida'

export interface CustoFixo extends Base {
  nome: string
  valorMensal: number
  grupo: GrupoCusto
  visibilidade: 'todos' | 'mentor'
  inicio?: string
  observacao?: string
}

export interface RotinaTarefa extends Base {
  diaSemana: number // 1 = segunda … 7 = domingo
  inicio: string
  fim: string
  titulo: string
  detalhe: string
  tipo: TipoTarefa
  obrigatoria: boolean
  atalho?: string
  papel: 'dono' | 'equipe'
  ordem: number
  ativa: boolean
  // Edições valem da semana seguinte: a versão antiga ganha validaAte, a nova validaDe.
  validaDe?: string
  validaAte?: string
}

export interface TarefaAvulsa extends Base {
  data: string
  titulo: string
  detalhe: string
  origem: 'mentor' | 'sistema' | 'dono'
  papel?: 'dono' | 'equipe'
  feitaEm?: string
}

export interface ChecklistItem extends Base {
  data: string
  rotinaTarefaId?: string
  tarefaAvulsaId?: string
  status: 'feito' | 'pulado'
  marcadoEm: string
  marcadoPor: string
  nota?: string
}

export interface RecadoMentor extends Base {
  texto: string
  criadoEm: string
  lidoEm?: string
}

export interface NotaMentor extends Base {
  texto: string
}

export interface ConfigMentor extends Base {
  limitesFaturamento: Array<{ nome: string; valor: number }>
}

export interface Promocao extends Base {
  oferta: string
  clientePaga: number
  brownies: number
}

export interface Zona extends Base {
  codigo: string
  nome: string
  ruas: string
  melhoresNoites: string
}

export interface MetaSemana extends Base {
  inicio: string // YYYY-MM-DD (segunda-feira)
  metaRS: number
  superMetaRS: number // meta + 20%
  pedidosIfood?: number
  nota?: string
}

export interface PlacarIfood extends Base {
  semana: string // YYYY-MM-DD
  notaMedia: number
  avaliacoes90d: number
  pedidos90d: number
  cancelamentos: number
  cancelamentosFalhaLoja: number
  pedidosComErro: number
  tempoMedioPreparoMin?: number
  obs?: string
}

export interface Gasto extends Base {
  data: string // YYYY-MM-DD
  valor: number
  categoria: string
  descricao: string
  pagamento: string
}
