# Briefing de Desenvolvimento de Produto — HPPC · Leite de Rosas

Kit para abrir, custear, priorizar e aprovar projetos de produto de higiene pessoal,
perfumaria e cosméticos, com processo Stage-Gate e números que se recalculam sozinhos.

| Arquivo | O que é |
|---|---|
| `briefing_hppc_leite_de_rosas.xlsx` | **O modelo completo.** 11 abas, 288 fórmulas, do BOM ao VPL. |
| `form-briefing-hppc.html` | **O formulário.** Abre no navegador, calcula ao vivo e exporta um XLSX-base com fórmulas. |
| `gerar_briefing_xlsx.py` | Gera o modelo completo. Rode para versionar mudanças de estrutura. |
| `testar_modelo.py` | Teste de ponta a ponta: preenche um cenário, recalcula e confere 24 resultados contra o valor esperado. |

## O modelo completo (XLSX)

| Aba | Serve para |
|---|---|
| 0. Instruções | Como usar, legenda de cores, contexto estratégico, premissas e fontes |
| 1. Briefing | O formulário em si (8 blocos) + painel consolidado que puxa todas as outras abas |
| 2. Mercado | TAM · SAM · SOM bottom-up, benchmark de PDV com preço por 100 ml/g, leitura competitiva |
| 3. Formulação | Especificação técnica, trilha regulatória, catálogo de testes básicos e específicos |
| 4. Embalagem | Estrutura e custo por unidade, ferramental, rotulagem obrigatória, dados logísticos |
| 5. Custos | BOM da fórmula, custo industrial, precificação, ponto de equilíbrio, sensibilidade |
| 6. Viabilidade | DRE incremental de 3 anos, investimento, fluxo de caixa, VPL, TIR, payback, ROI |
| 7. Scorecard | 10 critérios ponderados, classificação automática, ranking contra a fila de projetos |
| 8. Cronograma | 16 fases Stage-Gate com datas encadeadas e data prevista de gôndola |
| 9. Riscos | Probabilidade × impacto, severidade, nível e controle de mitigações sem dono |
| 10. Aprovação | Checklist de 22 itens por gate, síntese de uma página e registro de decisão |

**Cadeia de cálculo:** o custo de embalagem (aba 4) e o BOM (aba 5) formam o CPV; o CPV
define margem e preço mínimo; volume × preço alimentam a viabilidade (aba 6); ferramental,
regulatório e plano de testes viram o investimento do Ano 0; margem, VPL e payback voltam
para o Scorecard (aba 7) e para a síntese do comitê (aba 10). Mudar um insumo no BOM
reprecifica o projeto inteiro.

**Convenção de cores:** fundo amarelo com fonte azul = célula de entrada; fonte preta =
fórmula da própria aba; fonte verde = fórmula que puxa outra aba.

## O formulário (HTML)

Arquivo único, sem dependências e sem internet. Abra com duplo clique.

- Calcula ao vivo CPV, preço de fábrica, margem, ponto de equilíbrio, SOM e score.
- **Exporta XLSX** com 5 abas (Briefing, Mercado, Testes, Custos, Scorecard) já com as
  fórmulas vivas — o gerador de XLSX (ZIP + SpreadsheetML) está escrito dentro do HTML.
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

## Como rodar

```bash
pip install openpyxl
python3 gerar_briefing_xlsx.py                                            # gera o modelo
python3 <caminho>/xlsx/scripts/recalc.py briefing_hppc_leite_de_rosas.xlsx 380   # calcula as fórmulas
python3 testar_modelo.py                                                  # 24 verificações numéricas
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
