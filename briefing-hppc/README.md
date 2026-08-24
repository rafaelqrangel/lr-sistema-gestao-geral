# Briefing de Desenvolvimento de Produto — HPPC · Leite de Rosas

Kit para abrir, custear, priorizar e aprovar projetos de produto de higiene pessoal,
perfumaria e cosméticos, com processo Stage-Gate e números que se recalculam sozinhos.

| Arquivo | O que é |
|---|---|
| `briefing_hppc_leite_de_rosas.xlsx` | **O modelo completo.** 11 abas, 462 fórmulas, da matéria-prima ao VPL. |
| `form-briefing-hppc.html` | **O formulário.** Abre no navegador, calcula ao vivo e exporta um XLSX-base com fórmulas. |
| `gerar_briefing_xlsx.py` | Gera o modelo completo. Rode para versionar mudanças de estrutura. |
| `testar_modelo.py` | Teste de ponta a ponta: preenche um cenário, recalcula e confere 35 resultados contra o valor esperado. |

## O modelo completo (XLSX)

| Aba | Serve para |
|---|---|
| 0. Instruções | Como usar, legenda de cores, contexto estratégico, premissas e fontes |
| 1. Briefing | O formulário em si (8 blocos) + painel consolidado que puxa todas as outras abas |
| 2. Mercado | TAM · SAM · SOM bottom-up, benchmark de PDV com preço por 100 ml/g, leitura competitiva |
| 3. Formulação | Especificação técnica, trilha regulatória, catálogo de testes básicos e específicos |
| 4. Embalagem | Especificação, fornecedor, MOQ, lead time, ferramental, rotulagem obrigatória e dados logísticos |
| 5. Custos | **Ficha de custo completa**: 5 grupos de custo, impostos de venda, margem bruta, preço reverso e sensibilidade |
| 6. Viabilidade | DRE incremental de 3 anos, investimento, fluxo de caixa, VPL, TIR, payback, ROI |
| 7. Scorecard | 6 critérios ponderados, classificação automática, ranking contra a fila de projetos |
| 8. Cronograma | 16 fases Stage-Gate com datas encadeadas e data prevista de gôndola |
| 9. Riscos | Probabilidade × impacto, severidade, nível e controle de mitigações sem dono |
| 10. Aprovação | Checklist de 22 itens por gate, síntese de uma página e registro de decisão |

**Cadeia de cálculo:** os cinco grupos de custo da aba 5 formam o CPV; o CPV define margem bruta e
preço mínimo; volume × preço alimentam a viabilidade (aba 6); ferramental, regulatório e plano de
testes viram o investimento do Ano 0; margem, VPL e payback voltam para o Scorecard (aba 7) e para a
síntese do comitê (aba 10). Mudar o preço de um insumo reprecifica o projeto inteiro, até o veredito
do gate.

### A ficha de custo (aba 5)

A aba de custo é a peça central. Ela é montada em cinco grupos, cada um com o seu detalhamento:

| Grupo | O que entra | Como é calculado |
|---|---|---|
| 1 · Matérias-primas da formulação | Insumo a insumo, com % na fórmula, preço por kg, frete de entrada, impostos recuperáveis e perda específica | preço líquido × % × gramatura efetiva ÷ 1000, corrigido pelas perdas |
| 2 · Embalagem | Primária, secundária e terciária, com origem **comprada pronta** ou **transformada internamente** | preço líquido × quantidade por unidade ÷ (1 − refugo) |
| 3 · Mão de obra direta | Só quem põe a mão no produto, com fator de encargos e horas produtivas | custo-hora × horas do lote ÷ unidades do lote |
| 4 · Gastos gerais de fabricação | Depreciação, manutenção, energia, utilidades, efluentes, supervisão, laboratório, almoxarifado, limpeza, EPI, ocupação | GGF mensal ÷ horas produtivas = taxa/hora, aplicada às horas do lote |
| 5 · Outros custos de produção | Análises por lote, amostras de retenção, ferramental, royalties, toll, obsolescência, custo financeiro do estoque | forma de cálculo própria por linha |

Quem transforma a própria embalagem tem uma calculadora dedicada (bloco 5.4): peso da peça, preço da
resina, masterbatch, refugo de transformação, cavidades, tempo de ciclo, hora-máquina e amortização do
molde saem em custo por peça, que volta para a linha do componente.

**Parâmetros que mudam tudo** (bloco 5.1): gramatura declarada, sobre-enchimento, perda de granel,
tamanho do lote, velocidade da linha e horas de setup. Sem lote definido, o rateio de MOD e GGF é chute.

### Impostos de venda e preço de prateleira (blocos 5.9 e 5.10)

Dois comportamentos diferentes, e a planilha trata cada um como é:

- **Por fora** — IPI e ICMS-ST (com MVA/IVA-ST). Entram na nota, o cliente paga, mas não são receita.
  São eles que explicam por que o produto chega caro na gôndola.
- **Por dentro** — ICMS próprio, PIS e COFINS. Já estão no preço de tabela e saem como dedução.

A cascata é: preço de tabela → + IPI → + ICMS-ST → **valor total na nota** (o custo de aquisição do
varejo) · e, do outro lado, preço de tabela → − ICMS, PIS, COFINS e descontos → **receita líquida** →
− CPV → **margem bruta** → − comissão, frete e verba → **margem de contribuição**.

O bloco 5.10 faz o caminho inverso: parte do preço de prateleira alvo, tira o markup do varejo, desfaz
IPI e ST pelo fator de conversão e mostra o **preço de tabela implícito** — o teto que cabe na prateleira.
Em seguida calcula o **preço de tabela mínimo** e o **preço de prateleira mínimo** para a margem-alvo do
briefing, e dá o veredito.

**Convenção de cores:** fundo amarelo com fonte azul = célula de entrada; fonte preta =
fórmula da própria aba; fonte verde = fórmula que puxa outra aba.

## O formulário (HTML)

Arquivo único, sem dependências e sem internet. Abra com duplo clique.

- Calcula ao vivo os cinco grupos de custo, o CPV, IPI e ICMS-ST, margem bruta e de contribuição,
  preço de tabela mínimo, preço de prateleira mínimo, ponto de equilíbrio, SOM e score.
- **Exporta XLSX** com 5 abas (Briefing, Mercado, Testes, Custos, Scorecard) já com as
  fórmulas vivas — o gerador de XLSX (ZIP + SpreadsheetML) está escrito dentro do HTML.
  A aba de custo exportada traz os cinco grupos, os impostos de venda e o preço reverso.
- Salva rascunho automaticamente no navegador; exporta e importa `.json`.
- Imprime em papel ou PDF pelo próprio navegador.

### Logo e cor

O rosa institucional está fixado em `#EC008C` (variável CSS `--rosa`) e é o mesmo usado nos
cabeçalhos do XLSX. O arquivo do logo **não** está no repositório: clique na marca no topo do
formulário e selecione o arquivo oficial, ou salve-o como `assets/logo-leite-de-rosas.png`.
Enquanto não houver arquivo, o cabeçalho usa um lettering de fallback.

## Testes de produto

O catálogo de testes básicos já vem com os valores informados pela equipe técnica —
**por variação de fórmula**, multiplicados pelo número de variações do projeto:

| Teste básico | Valor unitário | Prazo |
|---|---|---|
| Time kill | R$ 1.264,00 | 30 dias |
| Teste de segurança após time kill (dermatológico) | R$ 600,00 | *a confirmar* |
| Eficácia (sniff test) + reemissões | R$ 1.900,00 | *a confirmar* |
| Apreciabilidade cosmética (user experience) | R$ 1.350,00 | *a confirmar* |

Os três prazos ausentes aparecem como pendência explícita na aba 3 e no formulário — a
planilha conta quantos faltam e avisa que o cronograma não fecha sem eles. O dermatológico é
sequencial ao time kill; por isso a consolidação mostra prazo em cenário sequencial (teto) e
em cenário paralelo (piso).

Os testes específicos por tipo de produto (talcos, desodorante líquido, aerossol, sabonetes)
vêm listados com valor e prazo em branco, para preenchimento por projeto.

## O que costuma ficar de fora de um custeio

A aba 0 traz esta lista completa, com o bloco da planilha onde cada item entra. Os que mais somem:

impostos recuperáveis na compra · frete de entrada · sobre-enchimento · perdas e refugo por etapa ·
setup e limpeza entre lotes · tamanho do lote · análises de QC por lote · amostras de retenção ·
amortização de ferramental · obsolescência de embalagem por troca de arte · custo financeiro do estoque ·
royalties · dupla contagem quando há toll · utilidades e efluentes · capital de giro travado no MOQ ·
IPI e ICMS-ST · verbas, bonificação e devolução · comissão e frete de saída · diferença de alíquota por estado.

## Como rodar

```bash
pip install openpyxl
python3 gerar_briefing_xlsx.py                                            # gera o modelo
python3 <caminho>/xlsx/scripts/recalc.py briefing_hppc_leite_de_rosas.xlsx 380   # calcula as fórmulas
python3 testar_modelo.py                                                  # 35 verificações numéricas
```

O gerador escreve fórmulas sem valores em cache: **sempre recalcule** (LibreOffice, ou uma
abertura e salvamento no Excel) antes de distribuir o arquivo.

## Premissas e limites

- Nenhum dado financeiro real da empresa foi preenchido. As linhas marcadas
  `[EXEMPLO — apagar]` existem só para mostrar o formato esperado.
- Referências regulatórias citadas (Lei 6.360/1976, RDC ANVISA nº 752/2022) precisam ter
  vigência e enquadramento confirmados com Assuntos Regulatórios a cada submissão.
- O dimensionamento de mercado é bottom-up a partir de premissas do usuário. Substitua por
  dado de Nielsen, Scanntech ou ABIHPEC quando houver, e registre a fonte na coluna prevista.
- A taxa de desconto da aba 6 é premissa editável; alinhe com a Diretoria Financeira.


## Ajustes de agosto/2026 — enxugar e tornar didático

O briefing estava completo, mas comprido e escrito em jargão. O que mudou:

- **Código do projeto agora é automático.** O formulário gera `BRF_<ano>_<nº>` sozinho, com
  sequência por ano guardada no navegador, e o campo é somente leitura. Ninguém digita errado.
  O botão **Novo briefing** limpa tudo e emite o código seguinte.
- **"Gate atual" virou "Em que ponto o projeto está hoje"**, com as seis etapas escritas em
  português comum ("2 · Conceito — conceito escrito, sem fórmula ainda").
- **Campos "Outro" que abrem texto**: Marca (sub-marca, outra marca do portfólio ou marca nova),
  Categoria, Tipo de projeto e Canal prioritário. O campo extra aparece só quando faz sentido
  e é limpo automaticamente se a escolha mudar. O valor digitado vai para o XLSX exportado.
- **Marcas guarda-chuva explícitas**: Leite de Rosas e Barla.
- **Mínimo de caracteres** nos campos de texto que sustentam a decisão, com contador ao lado e
  borda rosa enquanto falta. Impede o briefing de meia frase.
- **Exemplo preenchido em cinza dentro de cada campo**, e as orientações reescritas em linguagem
  direta — o que responder, com um exemplo concreto do próprio negócio.
- **Cada seção ganhou uma linha explicando para que ela serve**, principalmente 1.4 (consumidor)
  e 2 (mercado).
- **Removido**: seção 1.7 Restrições, Solicitante, Patrocinador, Canais secundários,
  Público-alvo secundário, Alavanca de marca e "O que este produto NÃO é". O Capex máximo
  autorizado sobreviveu e passou para 1.3, porque a aba 6 compara o investimento com esse teto.
- **Scorecard enxuto**: de 10 para 6 critérios, com os pesos redistribuídos. Saíram Sinergia
  fabril, Velocidade até o mercado, Sustentabilidade da vantagem e Investimento requerido.
- **Posicionamento e canibalização reescritos**: o modelo de frase agora está em português
  ("PARA [quem compra], O [nosso produto] É O [tipo] QUE [o que faz de melhor], PORQUE [motivo]")
  e a pergunta de canibalização pede as três coisas que importam — de qual produto nosso sai
  o volume, quanto aceitamos perder e por que compensa.

Verificação após os ajustes: 458 fórmulas recalculadas com 0 erros, 35/35 checagens numéricas OK,
formulário sem erro de JavaScript no Chromium e XLSX exportado recalculado com 0 erros.
