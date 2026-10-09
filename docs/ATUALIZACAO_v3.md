===INÍCIO DA ATUALIZAÇÃO v3===

## PARTE 2 — OS DADOS NOVOS

Esta parte complementa `docs/ESPECIFICACAO.md` (v2, de 26/09/2026). **Onde as duas discordarem, vale esta.** As seções citadas como B3, B5, B7, C7 etc. são as da especificação v2.

### 2.1 Configuração (entidade Config)

| Campo | v2 | v3 | Observação |
|---|---:|---:|---|
| diariaProducao | 100,00 | **0** | a produção é da funcionária, dentro do salário; se um dia voltar a ter diarista, basta preencher |
| comissaoIfood | — | **0,265** | 23% de comissão + 3,5% do pagamento online (plano com entrega do iFood) — conferir no contrato |
| embalagemIfood *(novo)* | — | **1,00** | por pedido do iFood: saco kraft, lacre, cartão e guardanapo (estimativa — trocar pelo custo real) |
| mensalidadeIfood *(novo)* | — | **150,00** | cobrada no mês em que o faturamento do iFood passa do limite abaixo |
| limiteMensalidadeIfood *(novo)* | — | **1.800,00** |  |
| repasseIfood *(novo)* | — | **'mensal'** | o mensal não tem custo; o semanal custa 1,59% (só informativo) |
| encargosFolha *(novo)* | — | **0,30** | FGTS + 13º + férias com 1/3 e o FGTS sobre eles (ME no Simples) |
| fatorDsr *(novo)* | — | **0,20** | DSR sobre a comissão ≈ 20% na média do ano; o valor exato de cada mês é do contador |
| tarifaOnibus *(novo)* | — | **4,95** | ônibus municipal de Cuiabá, para o vale-transporte |
| salarioMinimo *(novo)* | — | **1.621,00** | salário mínimo de 2026 |
| metaLojaDia | 15 | 15 | sem mudança (placar em peças) |

### 2.2 Custo do brownie sem diária (B5.3 e B6.9)

O cálculo B5.3 continua igual; com `diariaProducao = 0`, o custo de produção passa a ser só o gás: **R$ 2,7045 por forma** (R$ 0,0773 no pequeno e R$ 0,1127 no grande), em qualquer volume. O salário da funcionária entra no resultado do mês (2.6 e 2.7), não no custo do brownie.

**Nova redação da regra B6.9:** a produção é feita pela funcionária, dentro do salário. A diária só existe se houver diarista (campo `diariaProducao`); a jornada continua a ter capacidade de 20 formas.

| Sabor | Direto · pequeno | Variável · pequeno | Direto · grande | Variável · grande |
|---|---:|---:|---:|---:|
| Tradicional | 2,0985 | **2,1757** | 2,6477 | **2,7604** |
| Jack Maçã Verde | 2,7365 | **2,8137** | 3,5782 | **3,6909** |
| Cookie | 2,1955 | **2,2728** | 2,7893 | **2,9019** |
| Castanha | 2,2670 | **2,3443** | 2,8936 | **3,0063** |
| Jack Honey | 2,8092 | **2,8864** | 3,6842 | **3,7969** |
| Limão Siciliano | 4,0703 | **4,1475** | 5,5233 | **5,6360** |
| **Mix (4 tradicionais : 1 de cada; limão fora)** | 2,3002 | **2,3775** | 2,9420 | **3,0547** |

### 2.3 Cardápio da loja e do iFood (substitui C6)

Campos novos em Produto: `vendeNoIfood` (sim/não) e `obsIfood` (o motivo de ficar fora). Loja e iFood têm **o mesmo preço**. Sobra na loja = preço − maquininha (2,3%) − custo. Sobra no iFood = preço − 26,5% − custo − R$ 1 de embalagem (bebida sozinha não conta embalagem; a embalagem é **por pedido**, não por item).

| Produto | Tipo | Preço | Composição / como calcular o custo | Custo v3 | Sobra na loja | No iFood? | Sobra no iFood | Observação |
|---|---|---:|---|---:|---:|---|---:|---|
| Tradicional | brownie pequeno | 12,00 | motor (tradicional, pequeno) | 2,18 | 9,55 | sim | 5,64 |  |
| Cookie | brownie pequeno | 15,00 | motor (cookie, pequeno) | 2,27 | 12,38 | sim | 7,75 |  |
| Castanha | brownie pequeno | 15,00 | motor (castanha, pequeno) | 2,34 | 12,31 | sim | 7,68 |  |
| Maçã Verde (whisky) | brownie pequeno | 18,00 | motor (maçã verde, pequeno) | 2,81 | 14,77 | sim | 9,42 |  |
| Jack Honey | brownie pequeno | 18,00 | motor (honey, pequeno) | 2,89 | 14,70 | sim | 9,34 |  |
| Limão Siciliano | brownie pequeno | 15,00 | motor (limão, pequeno) | 4,15 | 10,51 | **não** | — | validade de 3 a 7 dias: risco de faltar e cancelar · só encomenda |
| Grande tradicional | brownie grande | 18,00 | motor (tradicional, grande) | 2,76 | 14,83 | sim | 9,47 |  |
| Grande com Nutella | combo | 20,00 | grande tradicional + Nutella 40 g (R$ 2,46) + potinho (R$ 0,30) | 5,52 | 14,02 | sim | 8,18 | Nutella sempre no potinho, à parte |
| Grande + Nutella + sorvete | combo | 25,00 | grande tradicional + Nutella (R$ 2,46) + sorvete (R$ 3,00, estimado) | 8,22 | 16,20 | **não** | — | o sorvete derrete no caminho |
| Old Capuccino (grande + capuccino) | combo | 19,90 | grande tradicional + pó de capuccino (R$ 1,00) + copo e mexedor (R$ 0,60) | 4,36 | 15,08 | **não** | — | o capuccino chega frio |
| Brownie + Coca | combo | 16,90 | 1 tradicional pequeno + 1 Coca-Cola mini | 4,68 | 11,84 | sim | 6,75 |  |
| Dupla da Casa | combo | 24,90 | 1 tradicional + 1 cookie OU 1 castanha (escolha na venda) | 4,48 | 19,84 | sim | 12,82 |  |
| Dupla Whisky | combo | 32,90 | 1 maçã verde + 1 honey | 5,70 | 26,44 | sim | 17,48 |  |
| Trio Old | combo | 36,90 | 1 tradicional + 1 cookie + 1 castanha | 6,79 | 29,26 | sim | 19,33 |  |
| Old Box | combo | 59,90 | 2 tradicionais + 1 cookie + 1 castanha + caixa (R$ 2,00) + etiqueta/fita (R$ 0,80) + acabamento/cartão (R$ 0,30) | 12,07 | 46,45 | sim | 30,96 |  |
| Coca-Cola mini | bebida | 6,00 | custo manual (estimado — conferir na nota) | 2,50 | 3,36 | sim | 1,91 |  |
| Fanta mini | bebida | 6,00 | custo manual (estimado — conferir na nota) | 2,50 | 3,36 | sim | 1,91 |  |
| Água | bebida | 5,00 | custo manual | 1,19 | 3,69 | sim | 2,48 |  |
| Café | bebida | 3,00 | custo manual, estimativa | 0,60 | 2,33 | **não** | — | chega frio |
| Capuccino | bebida | 5,00 | custo manual, estimativa | 1,60 | 3,28 | **não** | — | chega frio |
| Café gelado 180 ml | bebida | 6,00 | custo manual, estimativa | 2,00 | 3,86 | **não** | — | o gelo derrete e vaza |
| Café gelado 300 ml | bebida | 8,00 | custo manual, estimativa | 2,90 | 4,92 | **não** | — | o gelo derrete e vaza |
| Suco de polpa 300 ml | bebida | 6,00 | custo manual, estimativa · pior margem da casa | 3,50 | 2,36 | **não** | — | esquenta e vaza |
| Maracujá 300 ml | bebida | 8,00 | custo manual, estimativa · pior margem da casa | 4,50 | 3,32 | **não** | — | esquenta e vaza |
| Pão de queijo | salgado | 6,00 | FALTA receita e custo | — | — | sim | — | entra quando o custo for levantado; teto de R$ 1,71 para deixar 40% no iFood |
| Esfirra | salgado | 7,00 | FALTA receita e custo | — | — | sim | — | entra quando o custo for levantado; teto de R$ 2,04 para deixar 40% no iFood |

### 2.4 Combos

| Combo | Leva | Separado | Preço (loja e iFood) | Custo | Sobra na loja | Sobra no iFood | Do preço |
|---|---|---:|---:|---:|---:|---:|---:|
| Brownie + Coca | 1 tradicional pequeno + 1 Coca-Cola mini | 18,00 | 16,90 | 4,6757 | 11,84 | 6,75 | 40% |
| Dupla da Casa | 1 tradicional + 1 cookie OU 1 castanha (escolha na venda) | 27,00 | 24,90 | 4,4843 | 19,84 | 12,82 | 51% |
| Dupla Whisky | 1 maçã verde + 1 honey | 36,00 | 32,90 | 5,7002 | 26,44 | 17,48 | 53% |
| Trio Old | 1 tradicional + 1 cookie + 1 castanha | 42,00 | 36,90 | 6,7928 | 29,26 | 19,33 | 52% |
| Old Box | 2 tradicionais + 1 cookie + 1 castanha | 54,00 + a caixa | 59,90 | 12,0685 | 46,45 | 30,96 | 52% |

- **Dupla da Casa:** na venda, escolher cookie ou castanha; baixa o estoque do sabor escolhido e usa o custo dele (com cookie R$ 4,4485, com castanha R$ 4,5200).
- **Old Box:** a caixa, a etiqueta/fita e o acabamento/cartão (R$ 3,10) entram no custo; os 4 brownies baixam do estoque. Na loja ela era de 4 tradicionais; agora é sortida — **confirmar com o Gabriel** antes de mudar no balcão.
- **Mensalidade do iFood:** R$ 150 no mês em que o bruto do iFood passar de R$ 1.800 — entra no resultado do mês, não em cada venda. Entre R$ 1.800 e R$ 2.173 no mês (cerca de 15 a 19 pedidos por semana) a loja ganha menos do que ganharia vendendo R$ 1.799: o app avisa o dono quando o mês cruzar R$ 1.800 ("mire 19 pedidos ou mais por semana").
- **Promoções do lançamento** (tabela da casa, registradas na venda como desconto ou cupom em R$ e frete pago pela loja em R$): Dupla da Casa a R$ 21,90 (semana 1) · cupom de R$ 5 na primeira compra acima de R$ 30 (semana 2) · Brownie + Coca a R$ 14,90 (sexta e sábado à noite) · entrega grátis só na Old Box (R$ 7 pagos pela loja, teste de 2 semanas). **Regra:** pedido do iFood que deixa menos de R$ 5 depois da taxa, do custo, da embalagem e do desconto → aviso vermelho (avisa, não bloqueia).

### 2.5 Canais (C7: a linha do iFood muda e entra a rede de restaurantes)

| Canal | Tipo | Tamanho | Preço | Taxa e custos do canal | Pagamento | Meta |
|---|---|---|---|---|---|---|
| **iFood** | direto | cardápio do iFood (2.3) | **o mesmo da loja** | 26,5% sobre o bruto · R$ 1 de embalagem por pedido · R$ 150 de mensalidade no mês acima de R$ 1.800 | novo: **"iFood (online)"** | pedidos por semana (2.8) |
| **Rede de restaurantes** *(nova)* | parceiro | pequeno 70 g · mix escolhido pela rede | **R$ 5,00** tradicional, cookie e castanha · **R$ 5,50** maçã verde e honey · limão fora | nenhuma (Pix) | Pix na entrega, só dos brownies novos (a troca não é cobrada) | 1,5 forma de 35 por unidade por mês (≈ 12 a 13 por unidade por semana) |

**Rede de restaurantes — regras:** cada unidade é um ponto de entrega com visita semanal e troca sem custo (como o ponto de revenda, regra B6.6), mas com o pequeno de 70 g e a tabela de preços da rede. A regra B6.2 (R$ 18 ao cliente final) **não vale** para a rede: o preço do cardápio deles é livre (sugestão, nunca imposição: a partir de R$ 12). O preço da rede é **confidencial**: a equipe não vê. Condição só para rede com 4 unidades ou mais e pedido semanal. **Semente:** Espeto do João, tipo rede, status "candidato" (proposta pronta em 03/10, ainda não enviada), sem unidades ativas — as unidades conhecidas são Tijucal e Jardim Imperial; as outras duas a confirmar. Com o custo v3, o mix de 6 formas por mês (2 de tradicional + 1 de cada) fatura R$ 1.085,00 e deixa R$ 571,60 por mês.

### 2.6 A funcionária (entidade nova e cálculo B5.14)

```ts
Funcionario { membroId, nome, admissao, fimExperiencia /* admissao + 59 dias = 60 dias corridos */,
              fase: 'experiencia'|'nivel1'|'nivel2'|'nivel3', faseDesde,
              usaVT: boolean, viagensDia /* 2 */, diasMesVT /* 26 */, obs }
MudancaFase { funcionarioId, data, de, para, motivo: 'fim_experiencia'|'antecipacao'|'criterio'|'outro', registradoPor }
```

| Fase | Salário-base | Comissão loja | Comissão iFood | DSR | Bônus da semana | Bônus de qualidade | Bônus do trimestre | Quando |
|---|---:|---:|---:|---|---|---|---|---|
| **Experiência** | 1.621,00 (salário mínimo) | 4% | 3% | sim | — | — | — | dias 1 a 60 |
| **Nível 1** · atendente de produção | 1.800,00 | 4% | 3% | sim | R$ 50 (meta) ou R$ 100 (super meta) | R$ 100 | — | dia 61, ou antes pela antecipação |
| **Nível 2** · responsável pela loja | 2.000,00 | 5% | 4% | sim | sim | sim | — | a partir do 4º mês, com o critério |
| **Nível 3** · gerente da loja | 2.300,00 | 5% | 4% | sim | sim | sim | R$ 500 no trimestre em que a loja bater a meta | a partir do 10º mês, com o critério |

**Como calcular o mês (B5.14):**
```
baseLoja(mês)   = Σ bruto das vendas do canal loja        // de todas as vendas da loja, não só as dela
baseIfood(mês)  = Σ bruto das vendas do canal ifood       // pedidos cancelados não contam
comissao        = taxaLoja(fase) × baseLoja + taxaIfood(fase) × baseIfood
dsr             = comissao × fatorDsr
salarioBase     = salário da fase, proporcional aos dias do mês em cada fase
bonusSemana(s)  = fase ≥ nivel1 ? (fatSemana(s) ≥ superMeta ? 100 : fatSemana(s) ≥ meta ? 50 : 0) : 0
                  // fatSemana = bruto loja + iFood de segunda a domingo; a semana conta no mês do seu domingo
bonusQualidade  = fase ≥ nivel1 e notaIfood ≥ 4,7 e cancelamentosFalhaLoja = 0 e checklistEquipe ≥ 90% dos dias ? 100 : 0
bonusTrimestre  = fase = nivel3 e o trimestre bateu a meta ? 500 : 0
recebe          = salarioBase + comissao + dsr + Σ bonusSemana + bonusQualidade + bonusTrimestre
vtEmpresa       = usaVT ? max(0, viagensDia × tarifaOnibus × diasMesVT − 0,06 × salarioBase) : 0
custoEmpresa    = recebe × (1 + encargosFolha) + vtEmpresa
```

**Antecipação (sai da experiência antes do dia 61):** meta da semana batida em **3 semanas seguidas**, com o checklist da equipe em pelo menos 90% dos dias dessas semanas e nenhum pedido cancelado por falha da loja → o app mostra "critério de antecipação atingido" no Hoje do dono e no painel do mentor. Quem muda a fase é o dono, com data (vale a partir da semana seguinte). Do dia 50 em diante, o Hoje do dono mostra "faltam N dias para o fim da experiência".

**Critérios dos níveis 2 e 3 (média do trimestre):** nível 2 — loja com 15 brownies por dia (peças de brownie vendidas no canal loja, inclusive as dos combos, ÷ dias com loja aberta), iFood com 30 pedidos por semana, nota 4,7, checklist acima de 90% e perda abaixo de 5% da produção; nível 3 — loja com 18 por dia e iFood com 40 pedidos por semana. A ficha mostra o progresso ("faltam 2,3 por dia").

### 2.7 Custos fixos (substitui C9)

| Custo | R$/mês | Grupo | Visibilidade | Na v3 |
|---|---:|---|---|---|
| Aluguel + água + IPTU do ponto | 477,44 | ponto | todos | sem mudança |
| Internet | 130,00 | ponto | todos | sem mudança |
| EMIVE (segurança) | 299,89 | ponto | todos | sem mudança |
| Energia do ponto (estimativa) | 300,00 | ponto | todos | trocar pela primeira conta |
| Maria Eduarda — balcão (5 dias) | 2.166,50 | ponto | todos | **sai** (deleted_at) |
| **Funcionária — salário + encargos + VT** | calculado | ponto | todos | **novo, calculado (2.6):** com a loja parada, R$ 2.267,44 na experiência e R$ 2.489,40 no nível 1; comissão, DSR e bônus entram pelo cálculo do mês |
| Mentoria | 1.200,00 | empresa | todos | sem mudança |
| Combustível (estimativa) | 493,00 | empresa | todos | sem mudança |
| **Mensalidade do iFood** | calculado | empresa | todos | **novo:** R$ 150 no mês em que o iFood passar de R$ 1.800 |
| Parcela do carro | 1.636,33 | pessoal | todos | sem mudança |
| Seguro do carro | 200,00 | pessoal | todos | sem mudança |
| IPVA 2026 (parcelado) | 295,74 | pessoal | todos | sem mudança |
| Cartão Itaú | 67,61 | pessoal | todos | sem mudança |
| Casa | 350,00 | pessoal | todos | sem mudança |
| Dívida com 25 pessoas físicas | 1.630,00 | divida | todos | sem mudança |
| DAS do MEI | 82,05 | empresa | mentor | sem mudança (muda quando a empresa virar ME) |
| Contabilidade | 200,00 | empresa | mentor | sem mudança |

**Totais na visão do Gabriel, com a loja parada:** na experiência, ponto R$ 3.474,77 · empresa R$ 1.693,00 · pessoal R$ 2.549,68 · dívida R$ 1.630,00 · total **R$ 9.347,45**; no nível 1, ponto R$ 3.696,73 e total **R$ 9.569,41**.

**Resultado do mês (B5.8), o que muda:** a margem de cada venda do iFood já sai sem a comissão do iFood e sem a embalagem; o custo da funcionária (2.6) e a mensalidade do iFood entram como custos do mês. **Equilíbrio em peças (nova redação):** `lucroLoja = preço médio × (1 − taxaMaquininha − provisaoImposto) − custoVariavelMix(pequeno) − preço médio × comissaoLoja × (1 + fatorDsr) × (1 + encargosFolha)` = **R$ 9,9430**. O equilíbrio já desconta o imposto por peça; o "quanto falta para o azul" continua somando o imposto do mês à parte — não contar duas vezes.

### 2.8 Metas da semana (entidade nova MetaSemana)

```ts
MetaSemana { inicio /* segunda-feira */, metaRS, superMetaRS /* meta + 20% */, pedidosIfood, nota }
```

| Semana (segunda a domingo) | Meta (R$) | Super meta (R$) | Pedidos do iFood | Nota |
|---|---:|---:|---:|---|
| 05/10 a 11/10 | 700 | 850 | — | iFood em configuração |
| 12/10 a 18/10 | 1.750 | 2.050 | 10 | 12/10 feriado · Dia do Professor (15/10): meta de 10 Old Box |
| 19/10 a 25/10 | 1.500 | 1.800 | 15 | |
| 26/10 a 01/11 | 1.800 | 2.200 | 20 | Halloween no sábado, 31/10 |
| 02/11 a 08/11 | 1.600 | 1.900 | 20 | 02/11 feriado (Finados) |
| 09/11 a 15/11 | 1.600 | 1.900 | 20 | |
| 16/11 a 22/11 | 1.600 | 1.900 | 20 | 20/11 feriado (Consciência Negra) |
| 23/11 a 29/11 | 1.600 | 1.900 | 20 | Black Friday (27/11) |
| a partir de 30/11 | 1.650 | 2.000 | 25 | piso de dezembro em diante (empate da loja com a funcionária no nível 1); o Gabriel ajusta toda segunda · janeiro pode ficar abaixo |

Meta e super meta valem para o bônus da funcionária a partir do nível 1 e, na experiência, para a antecipação. O placar em peças por canal (B5.7) continua igual.

### 2.9 Placar do iFood (entidade nova PlacarIfood, lançada pelo dono toda segunda, a partir do Portal do Parceiro)

```ts
PlacarIfood { semana, notaMedia, avaliacoes90d, pedidos90d, cancelamentos, cancelamentosFalhaLoja, pedidosComErro, tempoMedioPreparoMin, obs }
```

| Indicador | Meta |
|---|---|
| Pedidos por semana | 10 a 20 em outubro · 20 a 25 em novembro · 40 em dezembro (2.8) |
| Nota | 4,7 ou mais, com pelo menos 10 avaliações nos últimos 90 dias |
| Cancelamento | zero; no máximo 1% dos pedidos |
| Pedidos com erro | abaixo de 2,5% |
| Aceite | assim que tocar |
| Preparo | até 10 minutos |
| Lacre e cartão | em todos os pedidos |
| Avaliações respondidas | todas, no mesmo dia |

Selo Super Restaurante (referência para o painel): nota ≥ 4,7, cancelamento ≤ 1%, erro ≤ 2,5%, 45 pedidos e 10 avaliações nos últimos 90 dias, atualizado todo dia 10. **Horário do iFood:** segunda e quarta 11h–15h30 · terça e quinta 12h–19h30 · sexta 12h–20h30 · sábado 14h–19h45 · domingo fechado.

### 2.10 Rotina

**(a) Gabriel — o que muda na C11** (vale da semana seguinte à atualização; as outras 35 tarefas continuam):

| Dia | Horário | Antes | Agora |
|---|---|---|---|
| Segunda | 09:00–11:00 | Produção — com a Maria Eduarda: reposição dos pontos e estoque da semana | **Produção com a funcionária** — nas 2 primeiras semanas dela, junto (treino); depois, conferir as formas da semana e a lista de compras · atalho: Produção |
| Segunda | 14:00–17:00 | Reunião da semana — placar, relatório de vendas, zonas dos vendedores | o mesmo **+** placar em R$ da loja e do iFood (meta e super meta), bônus da semana da funcionária e **lançar o placar do iFood** (nota, avaliações, cancelamentos e erros do Portal) |
| Terça | 07:00–09:00 | Treino da equipe da loja (não obrigatória) | **obrigatória nas 2 primeiras semanas da funcionária**; depois, volta a não obrigatória |
| Terça | 16:45–17:00 *(nova)* | — | **Gatilho de produção** — o estoque cobre sexta e sábado (previsão B5.12)? Se não, avisar a funcionária: a produção de quarta aumenta; se passar de 12 formas, a quinta vira dia de produção (8h–17h) · tipo operação · obrigatória · atalho: Estoque |
| Quinta | 09:00–11:00 | Gatilho de produção — reforço com a Maria Eduarda | **Conferir o fim de semana** — estoque da loja, da rede e do iFood; pausar no iFood o sabor que vai faltar · atalho: Estoque |

**(b) A funcionária — rotina nova (papel equipe, 35 tarefas).** Escala: segunda e quarta 7h–16h (produção) · terça e quinta 12h–20h · sexta 12h–21h · sábado 14h–20h15 · domingo folga · 44 horas. Quando a semana pedir uma terceira produção, a quinta vira produção (8h–17h) por tarefa avulsa do dono.

| Dia | Início | Fim | Tarefa | Detalhe | Tipo | Obrigatória | Atalho |
|---|---|---|---|---|---|---|---|
| Segunda | 07:00 | 07:30 | Separar a produção | conferir as formas da semana (lista do Gabriel) e separar os insumos | operacao | sim | Produção |
| Segunda | 07:30 | 11:00 | Produção | 2 ou 3 fornadas (8 a 12 formas) e os salgados do dia; etiqueta com sabor e data em tudo; lançar a produção | operacao | sim | Lançar produção |
| Segunda | 11:00 | 11:15 | Abrir o balcão e o iFood | vitrine montada, validade conferida, iFood ligado, celular no carregador com som no máximo | operacao | sim |  |
| Segunda | 11:00 | 14:00 | Saída da escola | oferecer o combo com bebida gelada em toda venda; amostra de recorte no movimento | escola | sim | Vender (loja) |
| Segunda | 11:00 | 15:30 | Pedidos do iFood | aceitar assim que tocar; pronto em até 10 min; lacre com o nome e cartão; responder as avaliações novas | ifood | sim | Vender (iFood) |
| Segunda | 14:00 | 15:30 | Cortar, etiquetar e guardar | e limpar a cozinha; anotar o que faltou na lista de compras | operacao | sim | Estoque |
| Segunda | 15:30 | 16:00 | Fechamento | iFood desligado às 15h30; vendas anotadas; caixa conferido | operacao | sim |  |
| Terça | 12:00 | 12:30 | Abertura | validade conferida, vitrine montada, iFood ligado | operacao | sim |  |
| Terça | 12:30 | 19:30 | Balcão e iFood | aceitar o pedido assim que tocar; pronto em até 10 min; lacre e cartão; responder as avaliações novas | ifood | sim | Vender (iFood) |
| Terça | 14:00 | 16:00 | Limpeza pesada | cozinha e salão | operacao | sim |  |
| Terça | 16:00 | 16:15 | Stories do balcão | fornada, vitrine cheia, cliente com o brownie; repostar quem marcar | operacao | não |  |
| Terça | 17:00 | 18:00 | Saída da escola | combo com bebida gelada em toda venda | escola | sim | Vender (loja) |
| Terça | 19:30 | 20:00 | Fechamento | iFood desligado às 19h30; vendas anotadas; caixa conferido | operacao | sim |  |
| Quarta | 07:00 | 07:30 | Separar a produção | conferir as formas da semana (lista do Gabriel) e separar os insumos | operacao | sim | Produção |
| Quarta | 07:30 | 11:00 | Produção | 2 ou 3 fornadas (8 a 12 formas) e os salgados do dia; etiqueta com sabor e data em tudo; lançar a produção | operacao | sim | Lançar produção |
| Quarta | 11:00 | 11:15 | Abrir o balcão e o iFood | vitrine montada, validade conferida, iFood ligado, celular no carregador com som no máximo | operacao | sim |  |
| Quarta | 11:00 | 14:00 | Saída da escola | oferecer o combo com bebida gelada em toda venda; amostra de recorte no movimento | escola | sim | Vender (loja) |
| Quarta | 11:00 | 15:30 | Pedidos do iFood | aceitar assim que tocar; pronto em até 10 min; lacre com o nome e cartão; responder as avaliações novas | ifood | sim | Vender (iFood) |
| Quarta | 14:00 | 15:30 | Cortar, etiquetar e guardar | e limpar a cozinha; anotar o que faltou na lista de compras | operacao | sim | Estoque |
| Quarta | 15:30 | 16:00 | Fechamento | iFood desligado às 15h30; vendas anotadas; caixa conferido | operacao | sim |  |
| Quinta | 12:00 | 12:30 | Abertura | validade conferida, vitrine montada, iFood ligado | operacao | sim |  |
| Quinta | 12:30 | 19:30 | Balcão e iFood | aceitar o pedido assim que tocar; pronto em até 10 min; lacre e cartão; responder as avaliações novas | ifood | sim | Vender (iFood) |
| Quinta | 14:00 | 15:00 | Compras do fim de semana | com a lista e o orçamento da semana | operacao | sim |  |
| Quinta | 16:00 | 16:15 | Stories do balcão | fornada, vitrine cheia, cliente com o brownie; repostar quem marcar | operacao | não |  |
| Quinta | 17:00 | 18:00 | Saída da escola | combo com bebida gelada em toda venda | escola | sim | Vender (loja) |
| Quinta | 19:30 | 20:00 | Fechamento | iFood desligado às 19h30; vendas anotadas; caixa conferido | operacao | sim |  |
| Sexta | 12:00 | 12:30 | Abertura | validade conferida, vitrine montada, iFood ligado | operacao | sim |  |
| Sexta | 12:30 | 20:30 | Balcão e iFood | aceitar o pedido assim que tocar; pronto em até 10 min; lacre e cartão; responder as avaliações novas | ifood | sim | Vender (iFood) |
| Sexta | 16:00 | 16:15 | Stories do balcão | fornada, vitrine cheia, cliente com o brownie; repostar quem marcar | operacao | não |  |
| Sexta | 17:00 | 18:00 | Saída da escola | combo com bebida gelada em toda venda | escola | sim | Vender (loja) |
| Sexta | 20:30 | 21:00 | Fechamento | iFood desligado às 20h30; vendas anotadas; caixa conferido | operacao | sim |  |
| Sábado | 14:00 | 14:30 | Abertura | validade conferida, vitrine montada, iFood ligado | operacao | sim |  |
| Sábado | 14:30 | 19:45 | Balcão e iFood | aceitar o pedido assim que tocar; pronto em até 10 min; lacre e cartão; responder as avaliações novas | ifood | sim | Vender (iFood) |
| Sábado | 16:00 | 16:15 | Stories do balcão | fornada, vitrine cheia, cliente com o brownie; repostar quem marcar | operacao | não |  |
| Sábado | 19:45 | 20:15 | Fechamento | iFood desligado às 19h45; vendas anotadas; caixa conferido | operacao | sim |  |

**(c)** Acrescentar o tipo **"ifood"** às tarefas (RotinaTarefa.tipo). O % do checklist da funcionária alimenta o bônus de qualidade e a antecipação.

### 2.11 Tarefas avulsas e notas do mentor

**Sai:** "Reativar o iFood (fotos no estilo da marca, cardápio enxuto, preço do app acima do balcão, aberto 11h–14h e 19h–23h)".

**Entram (no Hoje do dono, até serem feitas):**

| Origem | Tarefa | Quando |
|---|---|---|
| sistema | Configurar o iFood: conta e repasse mensal · logo e capa · horários (2.9) · preparo de 10 min · cardápio em 5 categorias com os combos no topo · foto em todos os itens · pausar item que acabou · Gestor de Pedidos no celular da loja | esta semana |
| sistema | Comprar o kit de embalagem do iFood (saco kraft, lacre, cartão, guardanapo) e lançar o custo real em `embalagemIfood` | esta semana |
| mentor | Conferir na nota o custo da Coca e da Fanta mini (estimado em R$ 2,50) | esta semana |
| mentor | Pôr o @ do Instagram no cartão que vai no pedido do iFood | antes de abrir o iFood |
| mentor | Ficha técnica do pão de queijo e da esfirra (custo máximo de R$ 1,71 e R$ 2,04) | outubro |
| sistema | Convidar a funcionária para o app (papel equipe) e criar a ficha dela (2.6) com a data de admissão | primeiro dia dela |
| sistema | Desativar o acesso da Maria Eduarda | já |
| sistema | Encomendas do Dia do Professor (13 e 14/10): Old Box com o cartão "Obrigado, professor(a)" e Dupla da Casa com laço · meta de 10 caixas | 12/10 |
| sistema | Halloween (31/10): tradicional decorado, pelo mesmo preço, e foto para o Instagram | 29/10 |
| sistema | Cartão fidelidade da loja: 10 carimbos = 1 tradicional | outubro |
| mentor | Confirmar a composição nova da Old Box (sortida) também no balcão | esta semana |

**Notas do mentor (área privada, só o Erick vê):**
1. Regularização: sair do MEI para ME antes de assinar a carteira com comissão — no MEI, o único empregado recebe **exclusivamente** um salário mínimo ou o piso da categoria (LC 123/2006, art. 18-C); percentagem quebra a regra, mesmo na experiência.
2. Conferir o piso da convenção coletiva da categoria: o salário da experiência não pode ficar abaixo dele.
3. Contrato de experiência de 60 dias por escrito, com a passagem para R$ 1.800 + bônus no dia 61 e o critério de antecipação.
4. Vale-transporte em crédito do cartão de transporte, não em dinheiro.
5. Saída da Maria Eduarda por escrito, com recibo do que foi pago.

### 2.12 Permissões e telas (o que muda em B4 e B7)

**Permissões (B4):**
- **Equipe** lança venda da loja **e do iFood** (novo), produção, perda, amostra, contagem e o checklist dela; lê a própria ficha de pagamento e a tela "Minha semana". Continua **sem ver**: custo, lucro, margem, CustoFixo, Funcionario dos outros, preços de repasse e da rede, resultado e a área do mentor.
- **Funcionario e MudancaFase:** dono lê e edita; mentor lê; a funcionária lê só os próprios dados.
- **MetaSemana e PlacarIfood:** dono edita; mentor lê; equipe lê meta, super meta e pedidos (não lê o resto do placar).

**Telas novas ou alteradas (B7):**
- **Vender (B7.3), canal iFood:** só produtos com `vendeNoIfood = sim`; pagamento "iFood (online)"; campos opcionais de desconto/cupom e frete pago pela loja; mostra a sobra do pedido já com a taxa, a embalagem e a comissão da funcionária; aviso abaixo de R$ 5. Pedido cancelado: registrar com motivo (cliente, iFood, falha da loja) — não conta como venda nem como comissão.
- **Placar da semana (B7.9):** + faturamento da loja e do iFood × meta e super meta · pedidos do iFood × meta · o placar do iFood (2.9) · o bônus da semana da funcionária.
- **Minha semana (nova, equipe):** barra do faturamento da semana × meta e super meta; quanto falta; semanas seguidas na meta (na experiência: "faltam N semanas para antecipar"); comissão e bônus estimados do mês; % do checklist dela. Sem custo nem lucro.
- **Mais → Equipe (nova, dono e mentor):** ficha da funcionária — fase, dias de experiência, prévia do mês (salário, comissão, DSR, bônus, VT e custo para a empresa), progresso dos critérios dos níveis e histórico de fases.
- **Hoje do dono (B7.1):** novos alertas — critério de antecipação atingido; faltam N dias para o fim da experiência (do dia 50 em diante); o iFood passou de R$ 1.800 no mês (mire 19 pedidos ou mais por semana).
- **Painel do mentor (B7.10):** + custo da funcionária no mês e fase; placar do iFood.
- **Navegação da equipe:** Hoje · Vender (loja e iFood) · Produção · Estoque · Minha semana.

### 2.13 Testes dourados v3 (substituem a tabela B8)

Tolerância: ± R$ 0,01 por peça e ± R$ 1,00 nos totais do mês.

| Teste | Valor esperado |
|---|---:|
| Custo direto — pequeno tradicional / grande tradicional (sem mudança) | 2,0985 / 2,6477 |
| Custo direto no mix — pequeno / grande (sem mudança) | 2,3002 / 2,9420 |
| Custo de produção por forma, com diária zero (só o gás) | 2,7045 |
| Custo variável — pequeno tradicional / grande tradicional | 2,1757 / 2,7604 |
| Custo variável — pequeno limão / grande limão | 4,1475 / 5,6360 |
| Custo variável no mix — pequeno / grande | 2,3775 / 3,0547 |
| Lucro por peça — vendedor e motorista (repasse R$ 8) | 5,6225 |
| Lucro por peça — ponto (repasse R$ 10, grande) | 6,9453 |
| Lucro por peça — loja, pequeno a R$ 14,25, com maquininha | 11,5447 |
| Lucro por peça — rota, grande a R$ 18 / feira, pequeno a R$ 15 | 14,5313 / 12,2775 |
| Lucro por forma — vendedor / caixa do ponto | 196,79 / 166,69 |
| Custo — Brownie + Coca / Dupla da Casa com cookie / com castanha | 4,6757 / 4,4485 / 4,5200 |
| Custo — Dupla Whisky / Trio Old / Old Box | 5,7002 / 6,7928 / 12,0685 |
| Sobra no iFood (26,5% + R$ 1 de embalagem) — Brownie + Coca / Dupla da Casa (média) / Old Box | 6,75 / 12,82 / 30,96 |
| Pedido médio do iFood (mix de planejamento, só para projeção) — valor / custo / sobra | 27,1125 / 5,4115 / 13,5162 |
| Funcionária na experiência — loja R$ 4.445,66 e iFood R$ 2.349,57 no mês → comissão / DSR / recebe / custo com encargos e VT | 248,31 / 49,66 / 1.918,98 / 2.654,81 |
| Funcionária no nível 1 — o mesmo mês, com 3 semanas de meta e o bônus de qualidade (R$ 250) → recebe / custo com encargos e VT | 2.347,98 / 3.201,77 |
| Vale-transporte pago pela empresa — experiência / nível 1 | 160,14 / 149,40 |
| Lucro da loja por brownie para o equilíbrio (com maquininha, comissão, DSR, encargos e 5% de imposto) | 9,9430 |
| Equilíbrio só da funcionária — experiência / nível 1 (brownies por dia na loja) | 8,77 / 9,63 |
| Equilíbrio da funcionária + contas da loja — experiência / nível 1 (brownies por dia) | 13,44 / 14,30 |
| Equilíbrio em peças por mês (nível 1) — ponto / empresa / vida / dívida / total | 371,79 / 170,27 / 256,43 / 163,93 / 962,42 |
| Rede completa v3 — formas por semana / jornadas | 15,44 / 1 |
| Rede completa v3 — faturamento / lucro dos setores | 21.707,31 / 10.342,72 |
| Rede completa v3 — lucro da empresa / sobra no fim do mês | 7.564,35 / 3.384,67 |
| Rede completa v3 — % do volume para a empresa se pagar / para pagar tudo | 42,3% / 74,2% |
| Rede de restaurantes (Espeto) — lucro por peça tradicional / honey | 2,8243 / 2,6136 |
| Dia comercial de uma venda às 0h30 de sábado | sexta-feira |

Premissas da rede completa v3: loja 15 por dia × 6 dias a R$ 14,25 · **iFood 30 pedidos por semana no mix de planejamento** · 5 vendedores × 35 por semana · 5 motoristas × 4 por dia × 6 dias · 5 pontos × 2 caixas por mês (troca de 20% produzida a mais, volta para a loja, não é custo) · diária zero · funcionária no nível 1 com todas as semanas na meta e o bônus de qualidade (recebe R$ 2.510,27, custa R$ 3.412,75 com encargos e VT) · contas da loja R$ 1.207,33 · mensalidade do iFood R$ 150 · combustível R$ 493 e mentoria R$ 1.200 · provisão de imposto de 5% · 4,333 semanas por mês. Setores: loja e iFood R$ 1.489,00 (já sem a funcionária e as contas) · vendedores R$ 4.263,39 · motoristas R$ 2.923,47 · pontos R$ 1.666,87.

===FIM DA ATUALIZAÇÃO v3===