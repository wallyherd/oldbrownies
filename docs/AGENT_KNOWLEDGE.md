OLD BROWNIES — app de gestão (resumo para o agente; a especificação está em docs/ESPECIFICACAO.md e a atualização v3 em docs/ATUALIZACAO_v3.md — onde houver conflito, vale a v3. Consulte as duas antes de qualquer mudança.)

PRODUTO
App da Old Brownies, fábrica de brownies artesanais em Cuiabá-MT: loja ao lado de um colégio (balcão e iFood), rota noturna do dono, feiras e uma rede de parceiros (vendedores de rua, motoristas de aplicativo, pontos de revenda e redes de restaurantes). O app responde: quanto custa um brownie hoje; quanto sobra em cada canal; se o placar da semana bate a meta; quem da rede vende ou parou; se a rotina foi cumprida; quanto foi produzido e não vendido; quanto a funcionária ganha e custa; se o mês fecha no azul.

PERFIS
- dono (Gabriel): lança tudo e vê tudo, menos a área privada do mentor.
- mentor (Erick): vê tudo, só leitura; recados e tarefas no "Hoje" do dono; área privada (DAS, contador, regularização, faturamento do ano, notas) que dono e equipe nunca veem.
- equipe (a funcionária): venda da loja e do iFood, produção, estoque, o checklist dela e a tela "Minha semana" (faturamento da loja + iFood × meta, a comissão e os bônus dela). Nunca vê custo, lucro, margem, custos fixos, contas pessoais, dívida, preços da rede nem a área do mentor.
- parceiro (fase 3): só o que é dele.

REQUISITOS
- Offline-first: Dexie (IndexedDB) é a fonte de leitura; toda gravação vai para o Dexie e para uma fila (outbox) enviada ao Lovable Cloud com upsert por id. Lançar venda nunca depende de sinal.
- PWA instalável. Venda em 3 toques, menos de 10 segundos. Botões com pelo menos 56 px. Tema escuro. Preto e branco, anos 20: Cinzel nos títulos, Josefin Sans no texto.
- Português do Brasil, R$ 1.234,56, datas dd/mm. Fuso America/Cuiaba. O dia comercial vira às 4h.

DADOS
- Toda tabela: id uuid gerado no aparelho, empresa_id, created_at, updated_at, updated_by, deleted_at (exclusão lógica).
- Movimentos só de inclusão: o estoque é a soma dos movimentos. O custo unitário é congelado em cada item de venda: mudança de custo nunca altera venda antiga.
- Row Level Security por empresa e por papel. O mentor não altera lançamentos.

MOTOR DE CÁLCULO (funções puras em src/lib/motor, testes Vitest na tabela 2.13 da v3)
- Custo: direto (massa ÷ peças + etiqueta + embalagem) · produção (diária por jornada + gás; diariaProducao = 0 desde a v3: só o gás, R$ 2,7045 por forma) · canal (maquininha 2,3%; iFood 26,5% sobre o bruto + R$ 1 de embalagem por pedido + R$ 150 de mensalidade no mês acima de R$ 1.800) · fixo (custos do mês + funcionária).
- Custo variável no mix (4 tradicionais : 1 de cada; limão fora): pequeno R$ 2,3775, grande R$ 3,0547.
- Funcionária (B5.14 da v3): experiência de 60 dias com salário mínimo + VT + comissão; depois R$ 1.800 + comissão + bônus; níveis 2 e 3 por critério. Comissão sobre o bruto dos canais loja e iFood + DSR (20%); custo = (salário + comissão + DSR + bônus) × 1,30 + VT da empresa.
- Equilíbrio: lucro da loja por brownie = R$ 9,9430 (já sem maquininha, comissão e imposto).

REGRAS DE NEGÓCIO
1. Nunca vender abaixo do custo variável: aviso vermelho (avisa, não bloqueia). No iFood, aviso quando o pedido deixar menos de R$ 5.
2. R$ 18 ao cliente final em qualquer canal de revenda (vendedor, motorista, ponto). Não vale para a rede de restaurantes.
3. Tamanho por canal: grande para pontos (caixa de 24, R$ 10) e rota (R$ 18); pequeno (70 g) para loja, iFood, vendedores e motoristas (forma de 35, R$ 8), feira (R$ 15) e rede de restaurantes (R$ 5,00 e R$ 5,50).
4. Parceiro paga à vista (Pix). Sem fiado.
5. Validade de 15 dias (limão: 3, só encomenda). Lote vencido vira perda.
6. No ponto e na rede, o estoque nunca passa de 7 dias: visita semanal, troca sem custo; a troca volta para o estoque da loja e não é perda.
7. Toda venda pertence a um canal. Loja e iFood têm o mesmo preço; o iFood só vende os produtos com vendeNoIfood = sim (nada quente, com gelo ou sorvete; nada de limão).
8. Combos têm composição e baixam o estoque de cada sabor; na Dupla da Casa a venda escolhe cookie ou castanha.
9. Meta da semana em R$ (loja + iFood, segunda a domingo) com super meta. O bônus da semana só existe a partir do nível 1. Meta batida 3 semanas seguidas na experiência, com checklist ≥ 90% e sem cancelamento por falha da loja → aviso de antecipação ao dono e ao mentor; quem muda a fase é o dono.
10. Amostra de recorte não baixa estoque.
11. Imposto: o dono só vê a provisão (5% do faturamento). DAS, contador e regularização ficam na área do mentor.
12. Pequeno a R$ 12 no balcão e R$ 18 na rua é intencional.

GLOSSÁRIO
forma = rende 35 pequenos (70 g) ou 24 grandes · caixa = 24 grandes do ponto · repasse = venda para parceiro · troca = brownie velho do ponto trocado por novo · jornada = dia de produção · mix = proporção de sabores · sumiço = contagem física menor que o estoque do sistema · placar = meta × realizado da semana · meta da semana = faturamento em R$ da loja + iFood · super meta = meta + 20% · experiência = os 60 dias iniciais da funcionária · antecipação = passar ao nível 1 antes do dia 61 · DSR = descanso semanal remunerado sobre a comissão · rede = rede de restaurantes com várias unidades · zona = área da rota (Z1 a Z5) · polo = região de captação (A a E, VG).

COMO TRABALHAR
- Nomes no código em português, camelCase. Textos da interface simples, sem jargão.
- Cada etapa pedida é feita isoladamente. Toda tela nova lê e grava pela camada offline.
- Antes de mudar uma regra ou um cálculo, conferir a especificação e a v3 e rodar os testes do motor.
