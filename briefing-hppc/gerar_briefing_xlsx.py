# -*- coding: utf-8 -*-
"""
Gerador do workbook "Briefing de Desenvolvimento de Produto HPPC — Leite de Rosas".

Saida: briefing_hppc_leite_de_rosas.xlsx

Convencao de cores (ver aba "Instrucoes" do arquivo gerado):
  - Fundo amarelo + fonte azul  -> celula de INPUT (preencher)
  - Fonte preta                 -> formula calculada na propria aba
  - Fonte verde                 -> formula que puxa dado de outra aba
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment

# ---------------------------------------------------------------- identidade
ROSA        = "EC008C"   # rosa institucional Leite de Rosas
ROSA_ESCURO = "A6005F"
ROSA_CLARO  = "FCE4F1"
CINZA       = "F2F2F2"
BRANCO      = "FFFFFF"

FONTE = "Arial"

AZUL_INPUT = "0000FF"
VERDE_LINK = "008000"
PRETO      = "000000"

f_titulo    = Font(name=FONTE, size=16, bold=True, color=BRANCO)
f_sub       = Font(name=FONTE, size=10, italic=True, color=BRANCO)
f_secao     = Font(name=FONTE, size=11, bold=True, color=BRANCO)
f_cab       = Font(name=FONTE, size=10, bold=True, color=BRANCO)
f_label     = Font(name=FONTE, size=10, bold=True, color=PRETO)
f_texto     = Font(name=FONTE, size=10, color=PRETO)
f_input     = Font(name=FONTE, size=10, color=AZUL_INPUT)
f_calc      = Font(name=FONTE, size=10, color=PRETO, bold=True)
f_link      = Font(name=FONTE, size=10, color=VERDE_LINK, bold=True)
f_nota      = Font(name=FONTE, size=8, italic=True, color="666666")

fill_titulo = PatternFill("solid", fgColor=ROSA)
fill_secao  = PatternFill("solid", fgColor=ROSA_ESCURO)
fill_cab    = PatternFill("solid", fgColor=ROSA)
fill_input  = PatternFill("solid", fgColor="FFFF99")
fill_claro  = PatternFill("solid", fgColor=ROSA_CLARO)
fill_cinza  = PatternFill("solid", fgColor=CINZA)

_th = Side(style="thin", color="BFBFBF")
borda = Border(left=_th, right=_th, top=_th, bottom=_th)

FMT_BRL   = 'R$ #,##0.00;(R$ #,##0.00);-'
FMT_BRL0  = 'R$ #,##0;(R$ #,##0);-'
FMT_PCT   = '0.0%;(0.0%);-'
FMT_NUM   = '#,##0;(#,##0);-'
FMT_NUM2  = '#,##0.00;(#,##0.00);-'
FMT_DATA  = 'DD/MM/YYYY'

wb = Workbook()


# ------------------------------------------------------------------ helpers
def nova_aba(nome, larguras, titulo, subtitulo):
    """Cria aba com cabecalho institucional. Retorna (ws, proxima_linha)."""
    ws = wb.create_sheet(nome)
    ws.sheet_properties.tabColor = ROSA
    for i, w in enumerate(larguras, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ncols = len(larguras)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ncols)
    c = ws.cell(row=1, column=1, value=titulo)
    c.font = f_titulo
    c.fill = fill_titulo
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[1].height = 30
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ncols)
    c = ws.cell(row=2, column=2 if False else 1, value=subtitulo)
    c.font = f_sub
    c.fill = fill_titulo
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[2].height = 16
    ws.freeze_panes = "A4"
    return ws, 4


def secao(ws, linha, texto, ncols):
    ws.merge_cells(start_row=linha, start_column=1, end_row=linha, end_column=ncols)
    c = ws.cell(row=linha, column=1, value=texto)
    c.font = f_secao
    c.fill = fill_secao
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[linha].height = 20
    return linha + 1


def cabecalho(ws, linha, titulos, alturas=None):
    for i, t in enumerate(titulos, start=1):
        c = ws.cell(row=linha, column=i, value=t)
        c.font = f_cab
        c.fill = fill_cab
        c.alignment = Alignment(vertical="center", horizontal="center", wrap_text=True)
        c.border = borda
    ws.row_dimensions[linha].height = alturas or 28
    return linha + 1


def inp(ws, linha, col, valor=None, fmt=None, nota=None):
    c = ws.cell(row=linha, column=col, value=valor)
    c.font = f_input
    c.fill = fill_input
    c.border = borda
    c.alignment = Alignment(vertical="center", wrap_text=True)
    if fmt:
        c.number_format = fmt
    if nota:
        c.comment = Comment(nota, "Briefing HPPC")
    return c


def calc(ws, linha, col, formula, fmt=None, link=False):
    c = ws.cell(row=linha, column=col, value=formula)
    c.font = f_link if link else f_calc
    c.border = borda
    c.alignment = Alignment(vertical="center", wrap_text=True)
    if fmt:
        c.number_format = fmt
    return c


def txt(ws, linha, col, valor, font=None, fill=None, wrap=True):
    c = ws.cell(row=linha, column=col, value=valor)
    c.font = font or f_texto
    if fill:
        c.fill = fill
    c.border = borda
    c.alignment = Alignment(vertical="center", wrap_text=wrap)
    return c


def campo(ws, linha, rotulo, orientacao, valor=None, fmt=None):
    """Linha padrao do formulario: A=rotulo | B=input | C=orientacao."""
    txt(ws, linha, 1, rotulo, font=f_label, fill=fill_claro)
    inp(ws, linha, 2, valor, fmt)
    txt(ws, linha, 3, orientacao, font=f_nota)
    ws.row_dimensions[linha].height = 26
    return linha + 1


def dv(ws, formula1, ref):
    v = DataValidation(type="list", formula1=formula1, allow_blank=True, showDropDown=False)
    ws.add_data_validation(v)
    v.add(ref)
    return v


# =============================================================== 0. INSTRUCOES
ws, r = nova_aba(
    "0. Instruções", [3, 38, 92],
    "LEITE DE ROSAS  |  BRIEFING DE DESENVOLVIMENTO DE PRODUTO — HPPC",
    "Higiene Pessoal, Perfumaria e Cosméticos · Processo Stage-Gate · Documento vivo, versionado por projeto",
)

r = secao(ws, r, "COMO USAR ESTE ARQUIVO", 3)
passos = [
    ("1", "Duplique o arquivo por projeto",
     "Um arquivo por ideia de produto. Nomeie como BRF_<ano>_<nº>_<nome de trabalho>.xlsx e registre o mesmo código na aba 1."),
    ("2", "Preencha apenas as células amarelas",
     "Todo o resto é fórmula. Se você digitar por cima de uma fórmula, o modelo para de recalcular e o número deixa de ser confiável."),
    ("3", "Vá na ordem das abas",
     "1 Briefing → 2 Mercado → 3 Formulação → 4 Embalagem → 5 Custos → 6 Viabilidade. As abas 7 a 10 consolidam a decisão."),
    ("4", "Rode o Scorecard (aba 7) antes de pedir aprovação",
     "O score ponderado é o critério de priorização de portfólio. Projeto abaixo do corte não entra em fila de desenvolvimento."),
    ("5", "Leve ao gate com as abas 6, 7 e 9 impressas",
     "Viabilidade, priorização e riscos são o mínimo que a Diretoria precisa para decidir GO / NO-GO / AJUSTAR."),
]
r = cabecalho(ws, r, ["#", "Passo", "Detalhe"])
for n, p, d in passos:
    txt(ws, r, 1, n, font=f_label)
    txt(ws, r, 2, p, font=f_label)
    txt(ws, r, 3, d)
    ws.row_dimensions[r].height = 30
    r += 1

r += 1
r = secao(ws, r, "LEGENDA DE CORES", 3)
r = cabecalho(ws, r, ["", "Formato", "Significado"])
legendas = [
    ("Exemplo", "input", "Célula de ENTRADA — fundo amarelo, fonte azul. É aqui que você digita."),
    ("Exemplo", "calc", "Célula CALCULADA na própria aba — fonte preta em negrito. Não digite por cima."),
    ("Exemplo", "link", "Célula que PUXA outra aba — fonte verde. Para mudar o valor, mude na aba de origem."),
]
for ex, tipo, desc in legendas:
    txt(ws, r, 1, "")
    c = ws.cell(row=r, column=2, value=ex)
    c.border = borda
    c.alignment = Alignment(vertical="center", horizontal="center")
    if tipo == "input":
        c.font, c.fill = f_input, fill_input
    elif tipo == "calc":
        c.font = f_calc
    else:
        c.font = f_link
    txt(ws, r, 3, desc)
    ws.row_dimensions[r].height = 22
    r += 1

r += 1
r = secao(ws, r, "CONTEXTO ESTRATÉGICO — POR QUE ESTE BRIEFING EXISTE", 3)
contexto = [
    ("Concentração de portfólio",
     "A maior parte do faturamento está concentrada em pouquíssimos SKUs. Qualquer choque de demanda, de canal ou de matéria-prima nesses itens atinge o caixa inteiro. Desenvolver produto novo aqui não é inovação de vitrine: é redução de risco."),
    ("Margem e caixa restritos",
     "Com margem apertada e caixa curto, todo projeto precisa justificar payback curto, capex mínimo e, sempre que possível, produção em ativo já existente ou terceirizada. A aba 6 força essa conversa com número."),
    ("Ativo de marca subaproveitado",
     "Leite de Rosas é marca quase centenária, com reconhecimento espontâneo altíssimo e território próprio (cuidado, frescor, tradição, o rosa). Extensão de linha bem-feita compra distribuição mais barato do que marca nova."),
    ("Risco de canibalização",
     "Como a base é concentrada, produto novo mal posicionado rouba volume do carro-chefe em vez de somar. O Scorecard (aba 7) pontua isso explicitamente."),
    ("Disciplina de gate",
     "O objetivo do arquivo é matar ideia ruim cedo e barato. Um NO-GO no Gate 1 é resultado positivo do processo, não fracasso."),
]
r = cabecalho(ws, r, ["#", "Vetor", "Leitura"])
for i, (t, d) in enumerate(contexto, start=1):
    txt(ws, r, 1, i, font=f_label)
    txt(ws, r, 2, t, font=f_label)
    txt(ws, r, 3, d)
    ws.row_dimensions[r].height = 46
    r += 1

r += 1
r = secao(ws, r, "O QUE COMPÕE O CUSTO — E O QUE COSTUMA FICAR DE FORA", 3)
r = cabecalho(ws, r, ["#", "Item", "Onde entra"])
esquecidos = [
    ("Impostos recuperáveis na compra", "O custo de uma matéria-prima é o preço da nota MENOS os créditos que a empresa aproveita. Usar o preço cheio infla o custo e mata projeto bom.", "Aba 5 · colunas de imposto recuperável"),
    ("Frete de entrada e seguro sobre a compra", "Insumo importado ou de outro estado chega mais caro do que o preço de tabela do fornecedor.", "Aba 5 · colunas de frete inbound"),
    ("Sobre-enchimento", "Encher 202 g para declarar 200 g é 1% de matéria-prima doada em todo lote.", "Aba 5 · bloco 5.1"),
    ("Perdas e refugo por etapa", "Pesagem, fabricação, envase, encaixotamento e refugo de embalagem. Cada etapa come um pedaço.", "Aba 5 · blocos 5.1, 5.2 e 5.3"),
    ("Setup, limpeza e troca de lote", "Higienização entre lotes é obrigatória em cosmético e em lote pequeno chega a custar mais que a produção.", "Aba 5 · bloco 5.1"),
    ("Tamanho do lote", "MOD e GGF são rateados por hora ocupada. Sem definir o lote, o custo unitário é chute.", "Aba 5 · bloco 5.1"),
    ("Análises de qualidade por lote e amostras de retenção", "Custo por lote e produto que sai do estoque sem virar venda.", "Aba 5 · bloco 5.7"),
    ("Amortização de ferramental e moldes", "Investimento diluído nas unidades que o molde vai produzir.", "Aba 5 · bloco 5.7"),
    ("Obsolescência e validade", "Embalagem encalhada por troca de arte e granel vencido.", "Aba 5 · bloco 5.7"),
    ("Custo financeiro do estoque", "Dinheiro parado em matéria-prima e produto acabado tem custo, ainda mais com caixa curto.", "Aba 5 · bloco 5.7"),
    ("Royalties e licenciamento", "Marca licenciada, personagem, fragrância exclusiva.", "Aba 5 · bloco 5.7"),
    ("Terceirização por toll", "A taxa do terceirista já embute MOD e GGF. Somar os dois é contar duas vezes.", "Aba 5 · bloco 5.7"),
    ("Utilidades e efluentes", "Água purificada, vapor, ar comprimido e tratamento de efluente são caros em linha de cosmético.", "Aba 5 · bloco 5.6"),
    ("Capital de giro travado no lote mínimo", "O MOQ do fornecedor de embalagem costuma pesar mais no caixa do que o próprio ferramental.", "Aba 4 e aba 6"),
    ("IPI e ICMS-ST", "São por fora: não entram na receita, mas inflam o preço na nota e definem o preço de prateleira.", "Aba 5 · bloco 5.9"),
    ("Verbas, bonificação e devolução", "Deduzem receita sem aparecer no preço de tabela. É o vazamento invisível da margem.", "Aba 5 · bloco 5.9"),
    ("Comissão e frete de saída", "Despesa variável de venda: entra depois da margem bruta, na margem de contribuição.", "Aba 5 · bloco 5.9"),
    ("Diferença de alíquota por estado", "O mesmo produto tem margem diferente por UF. Rode a aba 5 uma vez por estado relevante.", "Aba 5 · bloco 5.9"),
]
for i, (item, porque, onde) in enumerate(esquecidos, start=1):
    txt(ws, r, 1, i, font=f_label)
    txt(ws, r, 2, item, font=f_label)
    c = txt(ws, r, 3, porque + "  →  " + onde)
    ws.row_dimensions[r].height = 34
    r += 1

r += 1
r = secao(ws, r, "PREMISSAS E FONTES", 3)
r = cabecalho(ws, r, ["#", "Item", "Origem / observação"])
fontes = [
    ("Números de negócio (receita, margem, dívida, concentração de SKU)",
     "Contexto informado pelo usuário. Nenhum valor financeiro real foi preenchido no arquivo — todas as células de dinheiro estão em branco ou com exemplo ilustrativo marcado como tal."),
    ("Linha de exemplo das tabelas",
     "Valores ILUSTRATIVOS, apenas para mostrar formato esperado. Apague antes de usar em projeto real."),
    ("Referências regulatórias (aba 3)",
     "Marco legal brasileiro de HPPC: Lei 6.360/1976 e RDC ANVISA nº 752/2022. Vigência e enquadramento devem ser confirmados com Assuntos Regulatórios antes de cada submissão."),
    ("Valores e prazos dos testes básicos (aba 3.3)",
     "Informados pela equipe técnica da Leite de Rosas: time kill R$ 1.264,00 / 30 dias; segurança dermatológica pós time kill R$ 600,00; sniff test com reemissões R$ 1.900,00; apreciabilidade cosmética R$ 1.350,00. Valor por variação de fórmula. Os prazos dos três últimos ainda não foram informados e estão marcados como pendência na própria aba."),
    ("Dimensionamento de mercado (aba 2)",
     "Modelo bottom-up alimentado por premissas do próprio usuário. Substituir por dado de Nielsen/Scanntech/ABIHPEC quando disponível e citar a fonte na coluna prevista."),
    ("Taxa de desconto e horizonte (aba 6)",
     "Premissa editável. Alinhar com o custo de capital praticado pela Diretoria Financeira."),
]
for i, (t, d) in enumerate(fontes, start=1):
    txt(ws, r, 1, i, font=f_label)
    txt(ws, r, 2, t, font=f_label)
    txt(ws, r, 3, d)
    ws.row_dimensions[r].height = 44
    r += 1


# ================================================================ 1. BRIEFING
wsb, r = nova_aba(
    "1. Briefing", [34, 46, 74],
    "1 · BRIEFING DO PRODUTO",
    "Preencha as células amarelas. A coluna da direita explica o que se espera da resposta.",
)

r = secao(wsb, r, "1.1 IDENTIFICAÇÃO DO PROJETO", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
LIN_CODIGO = r
r = campo(wsb, r, "Código do projeto",
          "Padrão BRF_<ano>_<nº com 3 dígitos>. Ex.: BRF_2026_004. No formulário HTML ele é gerado sozinho; aqui, copie o código de lá.")
LIN_NOME = r
r = campo(wsb, r, "Nome de trabalho",
          "Nome interno, só para a equipe conversar sobre o projeto. O nome comercial é decidido depois. Ex.: 'Roll-on Leite de Rosas 50 ml'.")
LIN_MARCA = r
r = campo(wsb, r, "Marca",
          "Leite de Rosas | Barla | Sub-marca de uma delas | Outra marca do portfólio | Marca nova. Nos três últimos casos, escreva ao lado qual é o nome.")
LIN_CATEG = r
r = campo(wsb, r, "Categoria HPPC",
          "Desodorante | Talco | Higiene corporal | Cuidado facial | Cabelos | Infantil | Perfumaria | Higiene íntima | Outra (escreva qual).")
r = campo(wsb, r, "Tipo de projeto",
          "Novo produto | Extensão de linha | Renovação de fórmula | Novo tamanho | Restyling de embalagem | Redução de custo | Outro (descreva).")
r = campo(wsb, r, "Em que ponto o projeto está hoje",
          "1 Ideia (nada validado) | 2 Conceito (escrito, sem fórmula) | 3 Viabilidade (custo e mercado estimados) | "
          "4 Desenvolvimento (fórmula em teste) | 5 Industrialização (lote piloto) | 6 Lançamento (pronto para vender). "
          "Serve para o comitê saber o que já foi feito e o que falta.")
r = campo(wsb, r, "Prioridade declarada",
          "Alta | Média | Baixa. Alta significa passar na frente dos outros na fila do laboratório e da fábrica — use com parcimônia. "
          "Prioridade declarada é hipótese; o Scorecard (aba 7) é o que vale.")
LIN_DATA_ABERT = r
r = campo(wsb, r, "Data de abertura", "Data em que o briefing foi aberto.", fmt=FMT_DATA)

r += 1
r = secao(wsb, r, "1.2 POR QUE ESTE PROJETO EXISTE", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Que problema ou oportunidade este produto resolve",
          "Descreva o problema do negócio ou do consumidor, não a solução — a solução é o produto e vem depois. "
          "Ex.: 'não temos roll-on, que é o formato que mais cresce no Nordeste, onde somos fortes'. Mínimo de 80 caracteres.")
r = campo(wsb, r, "Por que agora, e não daqui a dois anos",
          "Precisa existir um gatilho concreto: concorrente que se mexeu, canal pedindo, regra que mudou, sazonalidade, "
          "oportunidade de matéria-prima. Mínimo de 60 caracteres.")
r = campo(wsb, r, "Como isso ajuda a empresa como um todo",
          "Duas respostas costumam ser boas: reduz a dependência dos poucos produtos que sustentam a receita, "
          "ou protege o carro-chefe de um ataque de concorrente. Mínimo de 60 caracteres.")
r = campo(wsb, r, "O que acontece se a gente não fizer nada",
          "Se a resposta honesta for 'nada acontece', o projeto não deveria existir. Melhor descobrir agora do que depois de gastar.")

r += 1
r = secao(wsb, r, "1.3 O QUE PRECISA ENTREGAR", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Objetivo do produto em uma frase",
          "Junte numa frase o que o produto faz e quanto precisa entregar. "
          "Ex.: 'colocar a Leite de Rosas no roll-on com um item de entrada, vendendo 400 mil unidades com 32% de margem no primeiro ano'.")
LIN_META_VOL = r
r = campo(wsb, r, "Meta de volume no Ano 1 (un.)",
          "Quantas unidades vendidas no primeiro ano cheio. Use o número que você defenderia numa reunião, não o otimista. "
          "Alimenta a aba 6.", fmt=FMT_NUM)
r = campo(wsb, r, "Meta de receita líquida no Ano 1",
          "Receita já sem impostos e sem descontos comerciais. Deve bater com o resultado da aba 6; "
          "se não bater, uma das duas premissas está errada.", fmt=FMT_BRL0)
LIN_META_MC = r
r = campo(wsb, r, "Margem de contribuição-alvo (%)",
          "De cada R$ 100 vendidos, quanto sobra depois de custo do produto, impostos, comissão e frete. "
          "É o piso para o projeto seguir. Digite como percentual (ex.: 35%).", fmt=FMT_PCT)
r = campo(wsb, r, "Distribuição-alvo (nº de PDVs)",
          "Em quantas lojas o produto precisa estar no fim do Ano 1. Ex.: 8.000.", fmt=FMT_NUM)
LIN_CAPEX_MAX = r
r = campo(wsb, r, "Capex máximo autorizado",
          "Teto de investimento em máquina e ferramental para este projeto. A aba 6 compara o investimento total com este teto "
          "e avisa se estourou. Deixe em branco se ainda não houver teto definido.", fmt=FMT_BRL0)

r += 1
r = secao(wsb, r, "1.4 PARA QUEM É E QUANDO SE USA", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Quem é a pessoa que vai comprar",
          "Idade e classe social sozinhas não são público-alvo. Diga também como essa pessoa compra e o que valoriza. "
          "Ex.: 'mulheres de 30 a 55 anos, classes C e D do Nordeste, que fazem a compra grande no atacarejo uma vez por mês'.")
r = campo(wsb, r, "Quando e com que frequência ela usa",
          "A frequência define o tamanho da embalagem e o volume comprado por ano — números que voltam na aba 2.")
r = campo(wsb, r, "Qual é o incômodo que ela tem hoje",
          "Escreva como a própria pessoa falaria, não em linguagem de marketing. "
          "Ex.: 'transpira muito no calor e os desodorantes que cabem no orçamento dela mancham a blusa'.")
r = campo(wsb, r, "A virada por trás dessa dor",
          "O que está por baixo da dor e que ninguém na categoria está dizendo. Se a frase parece um slogan, ainda não é insight.")
r = campo(wsb, r, "O que faria essa pessoa não comprar",
          "Antecipar a objeção agora é mais barato do que descobri-la na pesquisa de conceito. "
          "Preço, ceticismo quanto ao benefício, hábito consolidado, percepção de marca.")

r += 1
r = secao(wsb, r, "1.5 O PRODUTO", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "O produto em uma frase", "O que é, para quem, e o que entrega de diferente. Uma frase, sem adjetivo vazio.")
r = campo(wsb, r, "Benefício principal", "Um só. É o que a pessoa lembraria três dias depois de usar.")
r = campo(wsb, r, "Benefícios secundários", "No máximo dois. O terceiro dilui os outros e ninguém guarda.")
r = campo(wsb, r, "Por que acreditar nisso (RTB)",
          "O motivo técnico que sustenta o benefício: ativo, concentração, tecnologia, teste comprobatório. "
          "É o que Assuntos Regulatórios cobra para liberar o claim.")
r = campo(wsb, r, "Ativos e ingredientes-chave (INCI)", "Nome INCI e função. Marque o que sustenta claim, pois exige comprovação.")
r = campo(wsb, r, "Claims pretendidos",
          "Separe os claims de rótulo dos de publicidade. Cada um precisa de um teste que o comprove (aba 3).")
r = campo(wsb, r, "Como tem que ser ao usar",
          "Textura, tempo de secagem, toque que fica, cor, perfume e intensidade. É isto que o laboratório mede nos testes.")
r = campo(wsb, r, "Tamanhos e apresentações", "Gramatura(s) e por quê. Amarre com a ocasião de uso e com o preço de gôndola.")
r = campo(wsb, r, "Produto de referência (benchmark)",
          "O produto que serve de régua para desempenho e preço. Compre um e deixe na mesa do laboratório.")

r += 1
r = secao(wsb, r, "1.6 POSICIONAMENTO, PREÇO E CANAL", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Posicionamento em uma frase",
          "Complete este modelo: PARA [quem compra], O [nosso produto] É O [tipo de produto] QUE [o que faz de melhor], "
          "PORQUE [o motivo que faz acreditar].")
r = campo(wsb, r, "Faixa de preço pretendida",
          "Popular | Mainstream | Premium acessível | Premium. Mainstream é preço parecido com o do líder da categoria.")
r = campo(wsb, r, "Canal prioritário",
          "Farma | Atacarejo | Supermercado | Varejo tradicional | Distribuidor | E-commerce/marketplace | Perfumaria | Outros (escreva qual). "
          "É o canal onde o produto precisa dar certo primeiro; ele define embalagem, tamanho e política de preço.")
r = campo(wsb, r, "Regiões prioritárias", "Onde a distribuição já é forte tende a ser onde o lançamento custa menos.")
r = campo(wsb, r, "Quanto de venda nossa este produto vai tirar",
          "Todo lançamento rouba alguma venda de dentro de casa. Diga de qual produto nosso ele vai tirar, quanto aceitamos perder "
          "e por que compensa. Se a resposta for 'nenhuma', quase sempre é porque ainda não foi pensado.")

r += 1
r = secao(wsb, r, "1.7 COMO SABEREMOS QUE DEU CERTO", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Indicador principal", "Um só, com número e data. Ex.: '400 mil unidades vendidas até dez/2027'.")
r = campo(wsb, r, "Indicadores secundários", "No máximo três, com meta numérica e data.")
r = campo(wsb, r, "Em que situação encerramos o projeto",
          "Uma condição objetiva, com número, escrita ANTES de começar. Ex.: 'se o custo industrial passar de R$ 3,20/un. "
          "ou a intenção de compra ficar abaixo de 60%, o projeto para'. Depois que o time se apega ao projeto, "
          "ninguém mais consegue definir isso com isenção.")
r = campo(wsb, r, "Data da primeira revisão", "Quando o time volta a olhar os indicadores com o produto na rua.", fmt=FMT_DATA)

r += 1
LIN_CONSOL = r   # bloco 1.9 preenchido no fim do script


# ================================================= 2. MERCADO E CONSUMIDOR
wsm, r = nova_aba(
    "2. Mercado", [30, 30, 14, 16, 16, 16, 22, 26, 22],
    "2 · MERCADO, DIMENSIONAMENTO E BENCHMARK",
    "Modelo bottom-up. Troque toda premissa estimada por dado de pesquisa assim que houver, e registre a fonte.",
)

r = secao(wsm, r, "2.1 DIMENSIONAMENTO DA OPORTUNIDADE (TAM · SAM · SOM)", 4)
r = cabecalho(wsm, r, ["Premissa", "Valor", "Unidade", "Fonte / justificativa"])
L_POP      = r;     r += 1
L_PEN      = r;     r += 1
L_CONS     = r;     r += 1
L_FREQ     = r;     r += 1
L_VOLCAT   = r;     r += 1
L_PRECOMED = r;     r += 1
L_TAM      = r;     r += 1
L_COB      = r;     r += 1
L_SAM      = r;     r += 1
L_SHARE    = r;     r += 1
L_SOM      = r;     r += 1
L_SOMUN    = r;     r += 1

linhas_dim = [
    (L_POP,      "População do público-alvo",              "pessoas",   None, FMT_NUM,  "IBGE / painel de consumo. Recorte de idade, gênero, classe e região."),
    (L_PEN,      "Penetração da categoria",                "% da pop.", None, FMT_PCT,  "Percentual do público que compra a categoria em um ano."),
    (L_CONS,     "Consumidores da categoria",              "pessoas",   f"=IFERROR(B{L_POP}*B{L_PEN},0)", FMT_NUM, "Calculado: população × penetração."),
    (L_FREQ,     "Frequência de compra",                   "un./ano",   None, FMT_NUM2, "Quantas unidades o mesmo consumidor compra por ano."),
    (L_VOLCAT,   "Volume potencial da categoria",          "un./ano",   f"=IFERROR(B{L_CONS}*B{L_FREQ},0)", FMT_NUM, "Calculado: consumidores × frequência."),
    (L_PRECOMED, "Preço médio de gôndola da categoria",    "R$/un.",    None, FMT_BRL,  "Puxe da média do benchmark em 2.2 ou de coleta própria de PDV."),
    (L_TAM,      "TAM — mercado potencial total",          "R$/ano",    f"=IFERROR(B{L_VOLCAT}*B{L_PRECOMED},0)", FMT_BRL0, "Calculado: volume potencial × preço médio."),
    (L_COB,      "Cobertura de distribuição alcançável",   "% do TAM",  None, FMT_PCT,  "Fatia do mercado que a nossa distribuição de fato consegue tocar."),
    (L_SAM,      "SAM — mercado endereçável",              "R$/ano",    f"=IFERROR(B{L_TAM}*B{L_COB},0)", FMT_BRL0, "Calculado: TAM × cobertura."),
    (L_SHARE,    "Share-alvo dentro do SAM (Ano 1)",       "%",         None, FMT_PCT,  "Seja conservador. Share de lançamento raramente passa de 1 dígito no Ano 1."),
    (L_SOM,      "SOM — receita capturável no Ano 1",      "R$/ano",    f"=IFERROR(B{L_SAM}*B{L_SHARE},0)", FMT_BRL0, "Calculado: SAM × share-alvo. Este é o teto realista da meta."),
    (L_SOMUN,    "SOM em unidades",                        "un./ano",   f"=IFERROR(B{L_SOM}/B{L_PRECOMED},0)", FMT_NUM, "Calculado: SOM ÷ preço médio. Compare com a meta de volume do briefing."),
]
for lin, rot, uni, form, fmt, fonte in linhas_dim:
    txt(wsm, lin, 1, rot, font=f_label, fill=fill_claro)
    if form:
        calc(wsm, lin, 2, form, fmt)
    else:
        inp(wsm, lin, 2, None, fmt)
    txt(wsm, lin, 3, uni, font=f_nota)
    txt(wsm, lin, 4, fonte, font=f_nota)
    wsm.row_dimensions[lin].height = 24

r += 1
L_CHK1 = r
txt(wsm, r, 1, "Meta de volume declarada no briefing", font=f_label, fill=fill_cinza)
calc(wsm, r, 2, f"='1. Briefing'!B{LIN_META_VOL}", FMT_NUM, link=True)
txt(wsm, r, 3, "un./ano", font=f_nota)
txt(wsm, r, 4, "Puxado da aba 1 (célula 1.3).", font=f_nota)
r += 1
txt(wsm, r, 1, "Consistência meta × SOM", font=f_label, fill=fill_cinza)
calc(wsm, r, 2, f'=IF(B{L_SOMUN}=0,"",IFERROR(B{L_CHK1}/B{L_SOMUN}-1,""))', FMT_PCT)
txt(wsm, r, 3, "desvio", font=f_nota)
txt(wsm, r, 4, "Acima de 0% a meta é maior que o mercado capturável estimado. Ou a meta cai, ou a premissa sobe — com justificativa.", font=f_nota)
r += 2

# ---------------------------------------------------------- 2.2 benchmark
r = secao(wsm, r, "2.2 BENCHMARK COMPETITIVO — O QUE O CONSUMIDOR COMPRA HOJE", 9)
r = cabecalho(wsm, r, [
    "Marca", "SKU / descrição", "Tamanho (ml ou g)", "Preço gôndola (R$)",
    "Preço por 100 ml/g (R$)", "Canal onde foi coletado", "Posicionamento",
    "Diferencial declarado no rótulo", "Data e fonte da coleta",
])
BENCH_INI = r
BENCH_FIM = r + 11
exemplo_bench = ["[EXEMPLO — apagar]", "Creme hidratante corporal 200 g", 200, 18.90,
                 None, "Atacarejo", "Mainstream", "Hidratação 24h", "01/03/2026 — coleta PDV"]
for i in range(BENCH_INI, BENCH_FIM + 1):
    for col in range(1, 10):
        if col == 5:
            calc(wsm, i, 5, f'=IF(OR(C{i}="",D{i}=""),"",IFERROR(D{i}/C{i}*100,""))', FMT_BRL)
        else:
            v = exemplo_bench[col - 1] if i == BENCH_INI else None
            c = inp(wsm, i, col, v)
            if col == 3:
                c.number_format = FMT_NUM2
            if col == 4:
                c.number_format = FMT_BRL
    wsm.row_dimensions[i].height = 22
r = BENCH_FIM + 1

L_MED = r
txt(wsm, r, 1, "Média do mercado", font=f_label, fill=fill_cinza)
txt(wsm, r, 2, "", fill=fill_cinza)
calc(wsm, r, 3, f"=IFERROR(AVERAGE(C{BENCH_INI}:C{BENCH_FIM}),0)", FMT_NUM2)
calc(wsm, r, 4, f"=IFERROR(AVERAGE(D{BENCH_INI}:D{BENCH_FIM}),0)", FMT_BRL)
calc(wsm, r, 5, f"=IFERROR(AVERAGE(E{BENCH_INI}:E{BENCH_FIM}),0)", FMT_BRL)
txt(wsm, r, 6, "Média simples dos SKUs listados acima.", font=f_nota)
r += 1
txt(wsm, r, 1, "Menor preço por 100 ml/g", font=f_label, fill=fill_cinza)
txt(wsm, r, 2, "", fill=fill_cinza)
txt(wsm, r, 3, "", fill=fill_cinza)
txt(wsm, r, 4, "", fill=fill_cinza)
calc(wsm, r, 5, f"=IFERROR(MIN(E{BENCH_INI}:E{BENCH_FIM}),0)", FMT_BRL)
txt(wsm, r, 6, "Piso da categoria — referência de entrada.", font=f_nota)
L_MIN = r
r += 1
txt(wsm, r, 1, "Maior preço por 100 ml/g", font=f_label, fill=fill_cinza)
txt(wsm, r, 2, "", fill=fill_cinza)
txt(wsm, r, 3, "", fill=fill_cinza)
txt(wsm, r, 4, "", fill=fill_cinza)
calc(wsm, r, 5, f"=IFERROR(MAX(E{BENCH_INI}:E{BENCH_FIM}),0)", FMT_BRL)
txt(wsm, r, 6, "Teto da categoria — referência de premium.", font=f_nota)
L_MAX = r
r += 1
txt(wsm, r, 1, "SKUs mapeados", font=f_label, fill=fill_cinza)
calc(wsm, r, 2, f"=COUNT(D{BENCH_INI}:D{BENCH_FIM})", FMT_NUM)
txt(wsm, r, 3, "", fill=fill_cinza)
txt(wsm, r, 4, "", fill=fill_cinza)
txt(wsm, r, 5, "", fill=fill_cinza)
txt(wsm, r, 6, "Abaixo de 5 SKUs, o benchmark não sustenta decisão de preço.", font=f_nota)
r += 2

r = secao(wsm, r, "2.3 LEITURA COMPETITIVA", 9)
r = cabecalho(wsm, r, ["Pergunta", "Resposta", "", "", "", "", "", "", ""])
perguntas = [
    "Que espaço a categoria deixa vago (benefício, preço, tamanho, público)?",
    "Por que o líder é líder — preço, distribuição, marca ou produto?",
    "O que a Leite de Rosas tem que nenhum concorrente consegue copiar rápido?",
    "Qual concorrente reage primeiro e como (preço, verba, cópia de conceito)?",
    "Qual é a nossa vantagem sustentável depois de 12 meses de reação?",
]
for p in perguntas:
    txt(wsm, r, 1, p, font=f_label, fill=fill_claro)
    wsm.merge_cells(start_row=r, start_column=2, end_row=r, end_column=9)
    inp(wsm, r, 2)
    wsm.row_dimensions[r].height = 30
    r += 1


# ========================================= 3. FORMULACAO E REGULATORIO
wsf, r = nova_aba(
    "3. Formulação", [42, 22, 18, 18, 18, 26, 22],
    "3 · FORMULAÇÃO, TESTES E REGULATÓRIO",
    "Especificação técnica alvo, plano de testes e trilha regulatória. Toda referência normativa deve ser confirmada com Assuntos Regulatórios.",
)

r = secao(wsf, r, "3.1 ESPECIFICAÇÃO TÉCNICA ALVO", 4)
r = cabecalho(wsf, r, ["Parâmetro", "Alvo", "Faixa aceitável", "Método / observação"])
espec = [
    ("Forma cosmética", "Creme, loção, gel, emulsão O/A ou A/O, sabonete, aerossol, roll-on, stick."),
    ("pH", "Coerente com o local de aplicação e com o sistema conservante."),
    ("Viscosidade", "Informar aparelho, spindle e rotação usados na leitura."),
    ("Densidade", "Impacta enchimento nominal e custo por unidade."),
    ("Cor e aspecto", "Descrição visual e padrão de referência."),
    ("Fragrância", "Fornecedor, código, dosagem e alergênicos a declarar."),
    ("Sistema conservante", "Definir com o microbiologista; precisa passar no desafio microbiológico."),
    ("Teor de ativo claim-driver", "O percentual que sustenta o claim. Sem isso, o claim não se defende."),
    ("Vida útil pretendida", "Prazo de validade alvo; precisa de lastro em estabilidade."),
    ("Condições de armazenagem", "Temperatura e umidade recomendadas."),
    ("Restrições de fórmula", "Vegano, sem parabenos, sem álcool, hipoalergênico, sem teste animal, biodegradável."),
]
for p, obs in espec:
    txt(wsf, r, 1, p, font=f_label, fill=fill_claro)
    inp(wsf, r, 2)
    inp(wsf, r, 3)
    txt(wsf, r, 4, obs, font=f_nota)
    wsf.row_dimensions[r].height = 24
    r += 1

r += 1
r = secao(wsf, r, "3.2 TRILHA REGULATÓRIA (BRASIL)", 7)
r = cabecalho(wsf, r, [
    "Item", "Situação", "Responsável", "Prazo", "Referência de apoio (confirmar vigência)", "Custo estimado (R$)", "Concluído?",
])
REG_INI = r
regs = [
    ("Enquadramento do grau de risco (1 ou 2)", "Define se o caminho é notificação ou registro. É a primeira decisão regulatória.", "RDC ANVISA nº 752/2022"),
    ("Definição do caminho: notificação ou registro", "Grau 2 é mais lento e mais caro. Precisa entrar no cronograma da aba 8.", "RDC ANVISA nº 752/2022"),
    ("Empresa com AFE/licença compatível", "Se a produção for terceirizada, o co-packer precisa ter a habilitação correspondente.", "Lei 6.360/1976"),
    ("Fórmula qualitativa e quantitativa aprovada", "Versão congelada da fórmula que vai para o dossiê.", "Dossiê técnico interno"),
    ("Verificação de substâncias restritas/proibidas", "Cheque cada matéria-prima contra as listas vigentes antes de fechar a fórmula.", "Listas ANVISA vigentes"),
    ("Rotulagem obrigatória revisada", "Composição em INCI, lote, validade, conteúdo, SAC, responsável técnico, origem.", "Norma de rotulagem vigente"),
    ("Comprovação de cada claim pretendido", "Claim sem estudo é passivo jurídico e risco de mídia. Um estudo por claim.", "Guia de claims / CONAR"),
    ("Estudo de estabilidade (acelerada e normal)", "Sustenta a validade declarada. Começa cedo porque é o item mais longo do cronograma.", "Guia de estabilidade — ANVISA"),
    ("Compatibilidade fórmula × embalagem", "Migração, deformação, perda de fragrância, alteração de cor.", "Protocolo interno"),
    ("Desafio microbiológico (challenge test)", "Valida o sistema conservante ao longo da vida útil.", "Protocolo interno / farmacopeia"),
    ("Avaliação de segurança", "Dossiê de segurança do produto acabado.", "Guia de segurança — ANVISA"),
    ("Teste dermatológico / de irritabilidade", "Obrigatório se houver claim dermatológico ou público sensível.", "Laboratório clínico credenciado"),
    ("Registro de marca e busca de colidência", "Feito antes de investir em arte e ferramental.", "INPI"),
    ("Código de barras (GTIN) das apresentações", "Um por SKU e por múltiplo logístico.", "GS1 Brasil"),
    ("Requisitos específicos do canal", "Alguns varejistas exigem laudo, ficha técnica e cadastro próprios.", "Exigência de cliente"),
]
for item, obs, ref in regs:
    txt(wsf, r, 1, item, font=f_label, fill=fill_claro)
    inp(wsf, r, 2)
    inp(wsf, r, 3)
    inp(wsf, r, 4, fmt=FMT_DATA)
    txt(wsf, r, 5, ref, font=f_nota)
    inp(wsf, r, 6, fmt=FMT_BRL)
    inp(wsf, r, 7)
    wsf.cell(row=r, column=1).comment = Comment(obs, "Regulatório")
    wsf.row_dimensions[r].height = 24
    r += 1
REG_FIM = r - 1
dv(wsf, '"Não iniciado,Em andamento,Concluído,Não aplicável"', f"B{REG_INI}:B{REG_FIM}")
dv(wsf, '"Sim,Não,N/A"', f"G{REG_INI}:G{REG_FIM}")

txt(wsf, r, 1, "Custo regulatório total", font=f_label, fill=fill_cinza)
txt(wsf, r, 2, "", fill=fill_cinza)
txt(wsf, r, 3, "", fill=fill_cinza)
txt(wsf, r, 4, "", fill=fill_cinza)
txt(wsf, r, 5, "Soma da coluna. Este valor entra como investimento no Ano 0 (aba 6).", font=f_nota)
L_CUSTO_REG = r
calc(wsf, r, 6, f"=SUM(F{REG_INI}:F{REG_FIM})", FMT_BRL0)
txt(wsf, r, 7, "", fill=fill_cinza)
r += 1
txt(wsf, r, 1, "Avanço da trilha regulatória", font=f_label, fill=fill_cinza)
calc(wsf, r, 2,
     f'=IFERROR(COUNTIF(G{REG_INI}:G{REG_FIM},"Sim")/(COUNTA(G{REG_INI}:G{REG_FIM})-COUNTIF(G{REG_INI}:G{REG_FIM},"N/A")),0)',
     FMT_PCT)
txt(wsf, r, 3, "", fill=fill_cinza)
txt(wsf, r, 4, "", fill=fill_cinza)
txt(wsf, r, 5, 'Itens "Sim" sobre o total aplicável.', font=f_nota)
txt(wsf, r, 6, "", fill=fill_cinza)
txt(wsf, r, 7, "", fill=fill_cinza)
r += 2

r = secao(wsf, r, "3.3 TESTES BÁSICOS — CATÁLOGO PADRÃO APLICÁVEL A TODO O PORTFÓLIO", 7)
L_NVAR = r + 1
r = cabecalho(wsf, r, ["Parâmetro", "Valor", "", "", "", "Comentário", ""])
txt(wsf, r, 1, "Nº de variações de fórmula a testar", font=f_label, fill=fill_claro)
inp(wsf, r, 2, 1, FMT_NUM,
    nota="Cada variação de fórmula é testada separadamente. Três variações multiplicam o custo básico por três.")
for c in (3, 4, 5):
    txt(wsf, r, c, "", fill=fill_cinza)
wsf.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7)
txt(wsf, r, 6, "Este número alimenta automaticamente a coluna de variações da tabela abaixo.", font=f_nota)
r += 2

r = cabecalho(wsf, r, [
    "Teste básico", "Nº de variações", "Valor unitário (R$/fórmula)", "Custo total (R$)",
    "Prazo (dias)", "O que decide", "Fonte do valor e do prazo",
])
BAS_INI = r
basicos = [
    ("Time kill", 1264.00, 30,
     "Valida o desempenho antimicrobiano da fórmula ao longo do tempo de contato.",
     "Valor e prazo informados pela equipe."),
    ("Teste de segurança após time kill (dermatológico)", 600.00, None,
     "Confirma a segurança cutânea da fórmula aprovada no time kill. Só começa depois dele.",
     "Valor informado pela equipe. PRAZO A CONFIRMAR com o laboratório."),
    ("Eficácia (sniff test) + reemissões", 1900.00, None,
     "Avalia a performance percebida de fragrância, incluindo as reemissões previstas no pacote.",
     "Valor informado pela equipe. PRAZO A CONFIRMAR com o laboratório."),
    ("Apreciabilidade cosmética (user experience)", 1350.00, None,
     "Mede a aceitação sensorial e a experiência de uso do produto.",
     "Valor informado pela equipe. PRAZO A CONFIRMAR com o laboratório."),
]
for nome, valor, prazo, decide, fonte in basicos:
    txt(wsf, r, 1, nome, font=f_label, fill=fill_claro)
    calc(wsf, r, 2, f"=$B${L_NVAR}", FMT_NUM)
    inp(wsf, r, 3, valor, FMT_BRL)
    calc(wsf, r, 4, f"=IFERROR(B{r}*C{r},0)", FMT_BRL)
    if prazo is None:
        cel = inp(wsf, r, 5, None, FMT_NUM, nota="Prazo ainda não informado — confirmar com o laboratório antes de fechar o cronograma da aba 8.")
    else:
        inp(wsf, r, 5, prazo, FMT_NUM)
    txt(wsf, r, 6, decide, font=f_nota)
    txt(wsf, r, 7, fonte, font=f_nota)
    wsf.row_dimensions[r].height = 30
    r += 1
BAS_FIM = r - 1

L_BAS_TOT = r
txt(wsf, r, 1, "Subtotal dos testes básicos", font=f_label, fill=fill_cinza)
calc(wsf, r, 2, f"=$B${L_NVAR}", FMT_NUM)
txt(wsf, r, 3, "", fill=fill_cinza)
calc(wsf, r, 4, f"=SUM(D{BAS_INI}:D{BAS_FIM})", FMT_BRL0)
calc(wsf, r, 5, f"=SUM(E{BAS_INI}:E{BAS_FIM})", FMT_NUM)
txt(wsf, r, 6, "Custo do pacote básico para o número de variações informado.", font=f_nota)
txt(wsf, r, 7, "Coluna de prazo somada como cenário sequencial.", font=f_nota)
r += 1
txt(wsf, r, 1, "Custo básico por variação de fórmula", font=f_label, fill=fill_cinza)
txt(wsf, r, 2, "", fill=fill_cinza)
calc(wsf, r, 3, f"=SUM(C{BAS_INI}:C{BAS_FIM})", FMT_BRL)
txt(wsf, r, 4, "", fill=fill_cinza)
calc(wsf, r, 5, f"=IFERROR(MAX(E{BAS_INI}:E{BAS_FIM}),0)", FMT_NUM)
txt(wsf, r, 6, "Referência rápida: quanto custa testar uma fórmula a mais.", font=f_nota)
txt(wsf, r, 7, "Prazo em cenário paralelo (maior teste individual).", font=f_nota)
r += 1
txt(wsf, r, 1, "Pendência de prazo", font=f_label, fill=fill_cinza)
wsf.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
calc(wsf, r, 2,
     f'=IF(COUNTBLANK(E{BAS_INI}:E{BAS_FIM})=0,"Todos os prazos informados",'
     f'"Faltam "&COUNTBLANK(E{BAS_INI}:E{BAS_FIM})&" prazo(s) de teste básico — confirmar com o laboratório antes de fechar o cronograma da aba 8")')
wsf.row_dimensions[r].height = 22
r += 1
wsf.merge_cells(start_row=r, start_column=1, end_row=r + 1, end_column=7)
txt(wsf, r, 1,
    "Sequenciamento: o teste de segurança dermatológico só começa depois do time kill, então esses dois são "
    "obrigatoriamente sequenciais. Sniff test e apreciabilidade cosmética podem correr em paralelo com eles. "
    "Use a linha de prazo sequencial como teto e a de prazo paralelo como piso ao montar o cronograma.",
    font=f_nota)
r += 3

r = secao(wsf, r, "3.4 TESTES ESPECÍFICOS POR TIPO DE PRODUTO E COMPLEMENTARES", 7)
r = cabecalho(wsf, r, [
    "Teste", "Tipo de produto / aplicação", "Valor unitário (R$)", "Custo total (R$)",
    "Prazo (dias)", "O que decide", "Laboratório / fornecedor",
])
ESP_INI = r
especificos = [
    ("Estabilidade acelerada", "Todos", "Antecipa separação, alteração de cor, odor e pH."),
    ("Estabilidade normal / prateleira", "Todos", "Confirma a validade que vai no rótulo."),
    ("Compatibilidade com a embalagem", "Todos", "Migração, deformação, perda de fragrância, alteração de cor."),
    ("Desafio microbiológico (challenge test)", "Todos", "Valida o sistema conservante ao longo da vida útil."),
    ("Eficácia antitranspirante / gravimetria", "Desodorante antitranspirante", "Sustenta claim de proteção e de duração."),
    ("Teste de válvula, pressão e vazão", "Aerossol e sprays", "Segurança e desempenho do sistema pressurizado."),
    ("Granulometria e escoamento", "Talcos e pós", "Sensorial, uniformidade de aplicação e envase."),
    ("Viscosidade e estabilidade de emulsão em ciclos", "Desodorante líquido, loções e cremes", "Comportamento sob variação térmica."),
    ("Teste de espuma e enxágue", "Sabonetes e produtos de banho", "Percepção de rendimento e limpeza."),
    ("Teste de manchamento em tecido", "Desodorantes e cremes", "Reclamação recorrente da categoria."),
    ("Teste de uso em casa (HUT)", "Todos", "Verifica se o produto entrega na rotina real."),
    ("Teste de conceito com consumidor", "Todos", "Intenção de compra e clareza do benefício."),
    ("Piloto industrial (scale-up)", "Todos", "Prova que a fórmula se reproduz na escala real."),
    ("Teste de transporte e paletização", "Todos", "Evita avaria e vazamento na distribuição."),
    ("", "", ""),
    ("", "", ""),
    ("", "", ""),
]
for nome, tipo, decide in especificos:
    if nome:
        txt(wsf, r, 1, nome, font=f_label, fill=fill_claro)
        txt(wsf, r, 2, tipo, font=f_nota)
    else:
        inp(wsf, r, 1)
        inp(wsf, r, 2)
    inp(wsf, r, 3, fmt=FMT_BRL)
    calc(wsf, r, 4, f'=IF(C{r}="","",C{r}*$B${L_NVAR})', FMT_BRL)
    inp(wsf, r, 5, fmt=FMT_NUM)
    txt(wsf, r, 6, decide, font=f_nota)
    inp(wsf, r, 7)
    wsf.row_dimensions[r].height = 24
    r += 1
ESP_FIM = r - 1
L_ESP_TOT = r
txt(wsf, r, 1, "Subtotal dos testes específicos", font=f_label, fill=fill_cinza)
txt(wsf, r, 2, "", fill=fill_cinza)
calc(wsf, r, 3, f"=SUM(C{ESP_INI}:C{ESP_FIM})", FMT_BRL)
calc(wsf, r, 4, f"=SUM(D{ESP_INI}:D{ESP_FIM})", FMT_BRL0)
calc(wsf, r, 5, f"=IFERROR(MAX(E{ESP_INI}:E{ESP_FIM}),0)", FMT_NUM)
txt(wsf, r, 6, "Custo total já multiplicado pelo número de variações.", font=f_nota)
txt(wsf, r, 7, "", fill=fill_cinza)
r += 2

r = secao(wsf, r, "3.5 CONSOLIDAÇÃO DO PLANO DE TESTES", 7)
r = cabecalho(wsf, r, ["Consolidado", "Valor", "", "", "", "Comentário", ""])
L_CUSTO_TESTES = r
txt(wsf, r, 1, "Custo total do plano de testes", font=Font(name=FONTE, size=10, bold=True, color=ROSA_ESCURO), fill=fill_claro)
calc(wsf, r, 2, f"=D{L_BAS_TOT}+D{L_ESP_TOT}", FMT_BRL0)
for c in (3, 4, 5):
    txt(wsf, r, c, "", fill=fill_cinza)
wsf.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7)
txt(wsf, r, 6, "Básicos + específicos. Entra como investimento no Ano 0 da aba 6.", font=f_nota)
r += 1
txt(wsf, r, 1, "Prazo do plano — cenário sequencial", font=f_label, fill=fill_claro)
calc(wsf, r, 2, f"=E{L_BAS_TOT}+E{L_ESP_TOT}", FMT_NUM)
for c in (3, 4, 5):
    txt(wsf, r, c, "", fill=fill_cinza)
wsf.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7)
txt(wsf, r, 6, "Teto: um teste depois do outro. Em dias.", font=f_nota)
r += 1
txt(wsf, r, 1, "Prazo do plano — cenário paralelo", font=f_label, fill=fill_claro)
calc(wsf, r, 2, f"=MAX(E{L_BAS_TOT+1},E{L_ESP_TOT})", FMT_NUM)
for c in (3, 4, 5):
    txt(wsf, r, c, "", fill=fill_cinza)
wsf.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7)
txt(wsf, r, 6, "Piso: maior teste individual. O prazo real fica entre os dois. Em dias.", font=f_nota)
r += 1
txt(wsf, r, 1, "Custo de testes por variação adicional", font=f_label, fill=fill_claro)
calc(wsf, r, 2, f"=C{L_BAS_TOT+1}+C{L_ESP_TOT}", FMT_BRL)
for c in (3, 4, 5):
    txt(wsf, r, c, "", fill=fill_cinza)
wsf.merge_cells(start_row=r, start_column=6, end_row=r, end_column=7)
txt(wsf, r, 6, "Quanto custa levar mais uma fórmula candidata até o fim do plano. Use este número para decidir quantas variações vale a pena testar.", font=f_nota)


# ============================================ 4. EMBALAGEM E ROTULAGEM
wse, r = nova_aba(
    "4. Embalagem", [26, 20, 30, 22, 14, 14, 16, 18, 14],
    "4 · EMBALAGEM, ROTULAGEM E LOGÍSTICA",
    "O custo unitário lançado aqui alimenta automaticamente o BOM da aba 5. O ferramental alimenta o investimento da aba 6.",
)

r = secao(wse, r, "4.1 ESTRUTURA DE EMBALAGEM, FORNECIMENTO E FERRAMENTAL", 9)
wse.merge_cells(start_row=r, start_column=1, end_row=r, end_column=9)
txt(wse, r, 1,
    "Esta aba trata de especificação, fornecedor, lote mínimo, prazo e ferramental. "
    "O custo por componente é lançado na aba 5 (bloco 5.3), que é a fonte única de custo — aqui o total aparece apenas como consulta.",
    font=f_nota)
r += 1
r = cabecalho(wse, r, [
    "Componente", "Material", "Especificação", "Fornecedor", "MOQ (un.)",
    "Lead time (dias)", "Nível na embalagem", "Ferramental / capex (R$)", "Un. por caixa",
])
EMB_INI = r
componentes = [
    ("Embalagem primária (frasco/pote/bisnaga)", "PEAD, PET, PP, vidro, alumínio"),
    ("Tampa / válvula / dosador", "Rosca, flip-top, pump, spray, roll-on"),
    ("Vedação / lacre", "Selo de indução, lacre de segurança"),
    ("Rótulo ou decoração", "Autoadesivo, sleeve, serigrafia, in-mould"),
    ("Cartucho / estojo", "Cartão duplex, quando houver"),
    ("Caixa de embarque", "Papelão ondulado; define paletização"),
    ("Filme / material de palete", "Stretch, cantoneira"),
    ("Outro componente", "Brinde, aplicador, encarte"),
]
for comp, spec in componentes:
    txt(wse, r, 1, comp, font=f_label, fill=fill_claro)
    inp(wse, r, 2)
    inp(wse, r, 3, spec)
    inp(wse, r, 4)
    inp(wse, r, 5, fmt=FMT_NUM)
    inp(wse, r, 6, fmt=FMT_NUM)
    inp(wse, r, 7)
    inp(wse, r, 8, fmt=FMT_BRL0)
    inp(wse, r, 9, fmt=FMT_NUM)
    wse.row_dimensions[r].height = 24
    r += 1
EMB_FIM = r - 1

L_EMB_CUSTO = r
txt(wse, r, 1, "Custo de embalagem por unidade (calculado na aba 5)", font=f_label, fill=fill_cinza)
for c in range(2, 7):
    txt(wse, r, c, "", fill=fill_cinza)
# formula escrita no fim do script, quando a aba 5 ja existe
L_EMB_CAPEX = r
calc(wse, r, 8, f"=SUM(H{EMB_INI}:H{EMB_FIM})", FMT_BRL0)
txt(wse, r, 9, "", fill=fill_cinza)
r += 1
txt(wse, r, 1, "Maior lead time (caminho crítico de suprimentos)", font=f_label, fill=fill_cinza)
for c in range(2, 6):
    txt(wse, r, c, "", fill=fill_cinza)
calc(wse, r, 6, f"=IFERROR(MAX(F{EMB_INI}:F{EMB_FIM}),0)", FMT_NUM)
txt(wse, r, 7, "", fill=fill_cinza)
txt(wse, r, 8, "", fill=fill_cinza)
txt(wse, r, 9, "", fill=fill_cinza)
r += 1
txt(wse, r, 1, "Maior MOQ (lote mínimo que trava o projeto)", font=f_label, fill=fill_cinza)
for c in range(2, 5):
    txt(wse, r, c, "", fill=fill_cinza)
calc(wse, r, 5, f"=IFERROR(MAX(E{EMB_INI}:E{EMB_FIM}),0)", FMT_NUM)
for c in range(6, 10):
    txt(wse, r, c, "", fill=fill_cinza)
r += 1
txt(wse, r, 1, "Capital imobilizado no primeiro lote de embalagem", font=f_label, fill=fill_cinza)
for c in range(2, 7):
    txt(wse, r, c, "", fill=fill_cinza)
L_EMB_1LOTE = r
calc(wse, r, 7, f"=IFERROR(MAX(E{EMB_INI}:E{EMB_FIM})*G{L_EMB_CUSTO},0)", FMT_BRL0)
txt(wse, r, 8, "MOQ máximo × custo de embalagem por unidade. Em cenário de caixa curto, este número costuma pesar mais que o ferramental.", font=f_nota)
txt(wse, r, 9, "", fill=fill_cinza)
r += 2

r = secao(wse, r, "4.2 ROTULAGEM — CHECKLIST DE CONTEÚDO OBRIGATÓRIO E DE MARCA", 9)
r = cabecalho(wse, r, ["Item do rótulo", "Está previsto na arte?", "Responsável", "Observação", "", "", "", "", ""])
ROT_INI = r
itens_rotulo = [
    "Nome do produto e função",
    "Marca e identidade visual conforme manual (rosa institucional)",
    "Conteúdo nominal",
    "Composição completa em nomenclatura INCI",
    "Modo de uso",
    "Advertências e restrições de uso",
    "Lote e prazo de validade",
    "Identificação do fabricante ou importador e CNPJ",
    "Responsável técnico",
    "SAC, e-mail e site",
    "Número de notificação ou registro, quando exigido",
    "Código de barras GTIN",
    "Origem do produto",
    "Selos e certificações (vegano, cruelty-free, reciclável) com lastro",
    "Claims aprovados pelo regulatório e pelo jurídico",
]
for it in itens_rotulo:
    txt(wse, r, 1, it, font=f_label, fill=fill_claro)
    inp(wse, r, 2)
    inp(wse, r, 3)
    wse.merge_cells(start_row=r, start_column=4, end_row=r, end_column=9)
    inp(wse, r, 4)
    wse.row_dimensions[r].height = 22
    r += 1
ROT_FIM = r - 1
dv(wse, '"Sim,Não,N/A"', f"B{ROT_INI}:B{ROT_FIM}")
txt(wse, r, 1, "Completude da arte", font=f_label, fill=fill_cinza)
calc(wse, r, 2,
     f'=IFERROR(COUNTIF(B{ROT_INI}:B{ROT_FIM},"Sim")/(COUNTA(B{ROT_INI}:B{ROT_FIM})-COUNTIF(B{ROT_INI}:B{ROT_FIM},"N/A")),0)',
     FMT_PCT)
txt(wse, r, 3, "", fill=fill_cinza)
txt(wse, r, 4, "A arte não vai para fotolito abaixo de 100%.", font=f_nota)
r += 2

r = secao(wse, r, "4.3 DADOS LOGÍSTICOS", 9)
r = cabecalho(wse, r, ["Parâmetro", "Valor", "Unidade", "Observação", "", "", "", "", ""])
L_UNCX = r
log_itens = [
    ("Unidades por caixa de embarque", "un.", FMT_NUM, "Define o múltiplo de venda e a política de pedido mínimo."),
    ("Caixas por camada", "cx", FMT_NUM, ""),
    ("Camadas por palete", "camadas", FMT_NUM, ""),
    ("Peso bruto da caixa", "kg", FMT_NUM2, "Impacta frete e ergonomia."),
    ("Cubagem da caixa", "m³", FMT_NUM2, "Produto leve e volumoso encarece frete por unidade."),
    ("Empilhamento máximo", "paletes", FMT_NUM, ""),
]
for nome, uni, fmt, obs in log_itens:
    txt(wse, r, 1, nome, font=f_label, fill=fill_claro)
    inp(wse, r, 2, fmt=fmt)
    txt(wse, r, 3, uni, font=f_nota)
    wse.merge_cells(start_row=r, start_column=4, end_row=r, end_column=9)
    txt(wse, r, 4, obs, font=f_nota)
    r += 1
L_CXPAL = r
txt(wse, r, 1, "Caixas por palete", font=f_label, fill=fill_cinza)
calc(wse, r, 2, f"=IFERROR(B{L_UNCX+1}*B{L_UNCX+2},0)", FMT_NUM)
txt(wse, r, 3, "cx", font=f_nota)
wse.merge_cells(start_row=r, start_column=4, end_row=r, end_column=9)
txt(wse, r, 4, "Calculado: caixas por camada × camadas por palete.", font=f_nota)
r += 1
txt(wse, r, 1, "Unidades por palete", font=f_label, fill=fill_cinza)
calc(wse, r, 2, f"=IFERROR(B{L_CXPAL}*B{L_UNCX},0)", FMT_NUM)
txt(wse, r, 3, "un.", font=f_nota)
wse.merge_cells(start_row=r, start_column=4, end_row=r, end_column=9)
txt(wse, r, 4, "Calculado: caixas por palete × unidades por caixa.", font=f_nota)


# =============================================== 5. CUSTOS E PRECIFICACAO
wsc, r = nova_aba(
    "5. Custos", [40, 22, 13, 11, 15, 13, 15, 16, 12, 18, 12, 40],
    "5 · FICHA DE CUSTO DO PRODUTO E FORMAÇÃO DE PREÇO",
    "Quatro grupos de custo (fórmula · embalagem · MOD · GGF) mais outros custos de produção, depois impostos de venda e margem bruta.",
)
NC = 12


def par(ws, linha, rot, valor, unidade, fmt, nota, link=False, ncols=NC, destaque=False):
    """Linha de parâmetro: A rótulo · B valor · C unidade · D..L comentário."""
    fill = PatternFill("solid", fgColor=ROSA_CLARO) if destaque else fill_claro
    c = txt(ws, linha, 1, rot, font=f_label, fill=fill)
    if destaque:
        c.font = Font(name=FONTE, size=10, bold=True, color=ROSA_ESCURO)
    if isinstance(valor, str) and valor.startswith("="):
        calc(ws, linha, 2, valor, fmt, link=link)
    else:
        inp(ws, linha, 2, valor, fmt)
    txt(ws, linha, 3, unidade, font=f_nota)
    ws.merge_cells(start_row=linha, start_column=4, end_row=linha, end_column=ncols)
    txt(ws, linha, 4, nota, font=f_nota)
    ws.row_dimensions[linha].height = 24
    return linha + 1


def nota_larga(ws, linha, texto, altura=1, ncols=NC):
    ws.merge_cells(start_row=linha, start_column=1, end_row=linha + altura - 1, end_column=ncols)
    c = txt(ws, linha, 1, texto, font=f_nota)
    c.alignment = Alignment(vertical="top", wrap_text=True)
    ws.row_dimensions[linha].height = 16
    return linha + altura


def rodape(ws, linha, rotulo, formulas, ncols=NC):
    """Linha de subtotal cinza. formulas: dict coluna -> (formula, fmt)."""
    txt(ws, linha, 1, rotulo, font=f_label, fill=fill_cinza)
    for col in range(2, ncols + 1):
        if col in formulas:
            f, fmt = formulas[col]
            calc(ws, linha, col, f, fmt)
        else:
            txt(ws, linha, col, "", fill=fill_cinza)
    return linha + 1


# ------------------------------------------- 5.1 parametros da unidade
r = secao(wsc, r, "5.1 PARÂMETROS DA UNIDADE E DO LOTE", NC)
r = cabecalho(wsc, r, ["Parâmetro", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
L_GRAM = r
r = par(wsc, r, "Gramatura declarada no rótulo", None, "g ou ml", FMT_NUM2,
        "Conteúdo nominal. É o que o consumidor lê e o que a fiscalização cobra.")
L_OVER = r
r = par(wsc, r, "Sobre-enchimento médio", 0.01, "%", FMT_PCT,
        "Quanto se enche a mais para nunca ficar abaixo do nominal. Encher 202 g para declarar 200 g é custo puro e quase sempre esquecido.")
L_GRAMEF = r
r = par(wsc, r, "Gramatura efetiva envasada", f"=IFERROR(B{L_GRAM}*(1+B{L_OVER}),0)", "g ou ml", FMT_NUM2,
        "Calculado: gramatura declarada × (1 + sobre-enchimento). É esta que consome matéria-prima.")
L_PERDAGR = r
r = par(wsc, r, "Perda de granel no processo e no envase", 0.02, "%", FMT_PCT,
        "Resíduo de tanque, tubulação, purga de linha e reprocesso descartado.")
L_LOTE = r
r = par(wsc, r, "Tamanho do lote de produção", None, "un.", FMT_NUM,
        "O custo unitário muda com o lote. Sem definir o lote, o custeio de MOD e GGF é ficção.")
L_VEL = r
r = par(wsc, r, "Velocidade da linha", None, "un./h", FMT_NUM,
        "Produção efetiva por hora, já considerando as paradas normais.")
L_HPROD = r
r = par(wsc, r, "Horas de produção do lote", f"=IFERROR(B{L_LOTE}/B{L_VEL},0)", "h", FMT_NUM2,
        "Calculado: lote ÷ velocidade.")
L_HSETUP = r
r = par(wsc, r, "Horas de setup, limpeza e troca de lote", None, "h", FMT_NUM2,
        "Higienização entre lotes é obrigatória em cosmético e costuma pesar mais que a própria produção em lote pequeno.")
L_HTOT = r
r = par(wsc, r, "Horas totais ocupadas pelo lote", f"=B{L_HPROD}+B{L_HSETUP}", "h", FMT_NUM2,
        "Calculado: produção + setup. É esta hora que MOD e GGF cobram.")
r += 1

# -------------------------------------- 5.2 grupo 1: MP da formulacao
r = secao(wsc, r, "5.2 GRUPO 1 — MATÉRIAS-PRIMAS DA FORMULAÇÃO", NC)
r = nota_larga(wsc, r,
    "O custo da matéria-prima é o preço posto na fábrica MENOS os impostos que a empresa recupera na compra. "
    "Lançar o preço da nota cheio superestima o custo e faz o produto parecer menos rentável do que é. "
    "Confirme com a Contabilidade quais créditos o regime tributário da empresa aproveita.")
r = cabecalho(wsc, r, [
    "Matéria-prima", "Função / INCI", "% na fórmula", "Unidade", "Preço bruto (R$/kg)",
    "Frete inbound (R$/kg)", "Impostos recuperáveis (%)", "Custo líquido (R$/kg)",
    "Perda específica (%)", "Custo por unidade (R$)", "% do custo", "Fornecedor / observação",
])
MP_INI = r
MP_FIM = r + 13
for i in range(MP_INI, MP_FIM + 1):
    if i == MP_INI:
        inp(wsc, i, 1, "[EXEMPLO — apagar] Água purificada")
        inp(wsc, i, 2, "Aqua — veículo")
        inp(wsc, i, 3, 0.70, FMT_PCT)
        inp(wsc, i, 5, 0.02, FMT_BRL)
    else:
        inp(wsc, i, 1); inp(wsc, i, 2)
        inp(wsc, i, 3, fmt=FMT_PCT)
        inp(wsc, i, 5, fmt=FMT_BRL)
    inp(wsc, i, 4, "kg")
    inp(wsc, i, 6, fmt=FMT_BRL)
    inp(wsc, i, 7, fmt=FMT_PCT)
    calc(wsc, i, 8, f'=IF(E{i}="","",(E{i}+F{i})*(1-G{i}))', FMT_BRL)
    inp(wsc, i, 9, fmt=FMT_PCT)
    calc(wsc, i, 10,
         f'=IF(OR(C{i}="",E{i}=""),"",IFERROR(H{i}*C{i}*$B${L_GRAMEF}/1000/(1-$B${L_PERDAGR})/(1-I{i}),""))', FMT_BRL)
    inp(wsc, i, 12)
    wsc.row_dimensions[i].height = 22
r = MP_FIM + 1
L_MP_SUB = r
r = rodape(wsc, r, "Subtotal · matérias-primas da formulação", {
    3: (f"=SUM(C{MP_INI}:C{MP_FIM})", FMT_PCT),
    10: (f"=SUM(J{MP_INI}:J{MP_FIM})", FMT_BRL),
})
L_MP_CHK = r
r = rodape(wsc, r, "Validação do fechamento da fórmula", {
    3: (f'=IF(ABS(C{L_MP_SUB}-1)<0.0001,"OK — 100%","AJUSTAR")', None),
})
r = nota_larga(wsc, r, "Enquanto a soma dos percentuais não fechar 100%, o custo por quilo de granel está errado.")
r += 1

# ---------------------------------------------- 5.3 grupo 2: embalagem
r = secao(wsc, r, "5.3 GRUPO 2 — EMBALAGEM", NC)
r = nota_larga(wsc, r,
    "Uma linha por componente, dos três níveis: primária (contato com o produto), secundária (cartucho, display) "
    "e terciária (caixa de embarque, filme, palete). Na coluna Origem, diga se o item é comprado pronto ou "
    "transformado internamente — se for transformado, calcule o custo por peça em 5.4 e traga o resultado para a coluna de preço.")
r = cabecalho(wsc, r, [
    "Componente", "Origem", "Qtd por unidade", "Unidade", "Preço bruto (R$/un.)",
    "Frete inbound (R$/un.)", "Impostos recuperáveis (%)", "Custo líquido (R$/un.)",
    "Refugo (%)", "Custo por unidade (R$)", "% do custo", "Fornecedor / nível",
])
EM_INI = r
componentes_custo = [
    ("Embalagem primária (frasco, pote, bisnaga, lata)", "Primária"),
    ("Tampa, válvula, pump ou dosador", "Primária"),
    ("Lacre, selo de indução ou vedante", "Primária"),
    ("Rótulo, sleeve ou decoração", "Primária"),
    ("Cartucho ou estojo", "Secundária"),
    ("Bula, encarte ou brinde", "Secundária"),
    ("Caixa de embarque", "Terciária"),
    ("Filme, cantoneira e palete", "Terciária"),
    ("Outro componente", ""),
]
for nome, nivel in componentes_custo:
    txt(wsc, r, 1, nome, font=f_label, fill=fill_claro)
    inp(wsc, r, 2)
    inp(wsc, r, 3, fmt=FMT_NUM2)
    inp(wsc, r, 4, "un.")
    inp(wsc, r, 5, fmt=FMT_BRL)
    inp(wsc, r, 6, fmt=FMT_BRL)
    inp(wsc, r, 7, fmt=FMT_PCT)
    calc(wsc, r, 8, f'=IF(E{r}="","",(E{r}+F{r})*(1-G{r}))', FMT_BRL)
    inp(wsc, r, 9, fmt=FMT_PCT)
    calc(wsc, r, 10, f'=IF(OR(C{r}="",E{r}=""),"",IFERROR(H{r}*C{r}/(1-I{r}),""))', FMT_BRL)
    inp(wsc, r, 12, nivel)
    wsc.row_dimensions[r].height = 22
    r += 1
EM_FIM = r - 1
dv(wsc, '"Comprada pronta,Transformada internamente,Fornecida pelo terceirista"', f"B{EM_INI}:B{EM_FIM}")
L_EM_SUB = r
r = rodape(wsc, r, "Subtotal · embalagem", {10: (f"=SUM(J{EM_INI}:J{EM_FIM})", FMT_BRL)})
r += 1

# --------------------------- 5.4 calculadora de embalagem transformada
r = secao(wsc, r, "5.4 CALCULADORA — COMPONENTE DE EMBALAGEM TRANSFORMADO INTERNAMENTE", NC)
r = nota_larga(wsc, r,
    "Use quando a empresa compra resina e produz a peça (injeção, sopro, extrusão) em vez de comprar pronta. "
    "O resultado da última linha é o que deve ir para a coluna Preço bruto do componente correspondente em 5.3, "
    "com frete e impostos recuperáveis zerados, porque já estão embutidos aqui.")
r = cabecalho(wsc, r, ["Parâmetro", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
T_PESO = r
r = par(wsc, r, "Peso da peça", None, "g", FMT_NUM2, "Peso da peça acabada, não da resina carregada.")
T_RESINA = r
r = par(wsc, r, "Preço da resina", None, "R$/kg", FMT_BRL, "Polietileno, PP, PET, PVC. Já líquido dos impostos recuperáveis.")
T_MBPCT = r
r = par(wsc, r, "Percentual de masterbatch e aditivos", 0.02, "%", FMT_PCT, "Pigmento, antiestático, UV.")
T_MBPRECO = r
r = par(wsc, r, "Preço do masterbatch", None, "R$/kg", FMT_BRL, "Costuma custar várias vezes o preço da resina base.")
T_MAT = r
r = par(wsc, r, "Custo de material por peça",
        f"=IFERROR(B{T_PESO}/1000*(B{T_RESINA}*(1-B{T_MBPCT})+B{T_MBPRECO}*B{T_MBPCT}),0)", "R$/peça", FMT_BRL,
        "Calculado: peso × preço ponderado de resina e masterbatch.")
T_REFUGO = r
r = par(wsc, r, "Refugo de transformação", 0.03, "%", FMT_PCT, "Partida de máquina, peça fora de especificação, galho e canal.")
T_MATREF = r
r = par(wsc, r, "Custo de material com refugo", f"=IFERROR(B{T_MAT}/(1-B{T_REFUGO}),0)", "R$/peça", FMT_BRL,
        "Calculado: custo de material ÷ (1 − refugo). Material reciclado internamente reduz esta perda — registre na observação.")
T_CAV = r
r = par(wsc, r, "Cavidades do molde", 1, "cavidades", FMT_NUM, "Quantas peças saem por ciclo.")
T_CICLO = r
r = par(wsc, r, "Tempo de ciclo", None, "segundos", FMT_NUM2, "Do fechamento à extração.")
T_PPH = r
r = par(wsc, r, "Peças por hora", f"=IFERROR(3600/B{T_CICLO}*B{T_CAV},0)", "peças/h", FMT_NUM,
        "Calculado: 3600 ÷ ciclo × cavidades.")
T_HORA = r
r = par(wsc, r, "Custo hora-máquina de transformação", None, "R$/h", FMT_BRL,
        "Energia, MOD da injetora, manutenção e depreciação da máquina. Se preferir, use a taxa de GGF por hora calculada em 5.6.")
T_TRANSF = r
r = par(wsc, r, "Custo de transformação por peça", f"=IFERROR(B{T_HORA}/B{T_PPH},0)", "R$/peça", FMT_BRL,
        "Calculado: hora-máquina ÷ peças por hora.")
T_MOLDE = r
r = par(wsc, r, "Amortização do molde por peça", None, "R$/peça", FMT_BRL,
        "Valor do molde ÷ número de peças que ele produzirá na vida útil. Zero se o molde já estiver amortizado.")
T_TOTAL = r
r = par(wsc, r, "CUSTO TOTAL DA PEÇA TRANSFORMADA",
        f"=B{T_MATREF}+B{T_TRANSF}+B{T_MOLDE}", "R$/peça", FMT_BRL,
        "Leve este valor para a coluna Preço bruto do componente correspondente em 5.3.", destaque=True)
r += 1

# ------------------------------------------------ 5.5 grupo 3: MOD
r = secao(wsc, r, "5.5 GRUPO 3 — MÃO DE OBRA DIRETA (MOD)", NC)
r = nota_larga(wsc, r,
    "Só as pessoas que colocam a mão no produto. Supervisão, PCP, qualidade e almoxarifado são indiretos e entram no GGF (5.6). "
    "O fator de encargos transforma salário em custo real: encargos sociais, férias, 13º, FGTS, rescisão, vale-transporte, "
    "alimentação e plano de saúde. Peça o número ao RH em vez de estimar.")
r = cabecalho(wsc, r, [
    "Função", "Nº de pessoas", "Salário mensal (R$)", "Fator de encargos", "Custo mensal (R$)",
    "Horas produtivas/mês", "Custo-hora (R$)", "Horas no lote", "Custo no lote (R$)",
    "Custo por unidade (R$)", "% do custo", "Observação",
])
MOD_INI = r
funcoes = [
    "Operador de fabricação do granel",
    "Operador de envase",
    "Operador de embalagem e encaixotamento",
    "Auxiliar de linha",
    "Líder de linha",
]
for f_nome in funcoes:
    txt(wsc, r, 1, f_nome, font=f_label, fill=fill_claro)
    inp(wsc, r, 2, fmt=FMT_NUM)
    inp(wsc, r, 3, fmt=FMT_BRL0)
    inp(wsc, r, 4, 1.80, FMT_NUM2)
    calc(wsc, r, 5, f"=IFERROR(B{r}*C{r}*D{r},0)", FMT_BRL0)
    inp(wsc, r, 6, 176, FMT_NUM)
    calc(wsc, r, 7, f"=IFERROR(E{r}/F{r},0)", FMT_BRL)
    calc(wsc, r, 8, f"=$B${L_HTOT}", FMT_NUM2)
    calc(wsc, r, 9, f"=G{r}*H{r}", FMT_BRL)
    calc(wsc, r, 10, f"=IFERROR(I{r}/$B${L_LOTE},0)", FMT_BRL)
    inp(wsc, r, 12)
    wsc.row_dimensions[r].height = 22
    r += 1
MOD_FIM = r - 1
L_MOD_SUB = r
r = rodape(wsc, r, "Subtotal · mão de obra direta", {
    5: (f"=SUM(E{MOD_INI}:E{MOD_FIM})", FMT_BRL0),
    9: (f"=SUM(I{MOD_INI}:I{MOD_FIM})", FMT_BRL0),
    10: (f"=SUM(J{MOD_INI}:J{MOD_FIM})", FMT_BRL),
})
r = nota_larga(wsc, r,
    "O fator de encargos vem preenchido com 1,80 apenas como ordem de grandeza usual em indústria CLT — substitua pelo número real do RH. "
    "176 horas/mês equivalem a 8 h em 22 dias úteis; ajuste conforme a jornada e os turnos praticados.")
r += 1

# ------------------------------------------------ 5.6 grupo 4: GGF
r = secao(wsc, r, "5.6 GRUPO 4 — GASTOS GERAIS DE FABRICAÇÃO (GGF)", NC)
r = nota_larga(wsc, r,
    "Tudo que a fábrica consome e não dá para apontar direto no produto. Rateado por hora ocupada de linha: "
    "GGF mensal ÷ horas produtivas da fábrica no mês = taxa por hora; a taxa multiplica as horas do lote e divide pelas unidades. "
    "Quem rateia por unidade produzida distorce o custo de produto lento contra produto rápido.")
r = cabecalho(wsc, r, [
    "Item de GGF", "Natureza", "Valor mensal (R$)", "Comentário", "", "", "", "", "", "", "", "",
])
GGF_INI = r
itens_ggf = [
    ("Depreciação de máquinas, moldes e instalações", "Fixo", "Mesmo parado, o ativo se deprecia."),
    ("Manutenção preventiva e corretiva", "Misto", "Peças, contratos e mão de obra de manutenção."),
    ("Energia elétrica da produção", "Variável", "Se houver medição por linha, considere tratar como custo direto."),
    ("Água, vapor, ar comprimido e utilidades", "Variável", "Água purificada tem custo próprio de tratamento em cosmético."),
    ("Tratamento de efluentes e resíduos", "Misto", "Descarte de granel reprovado e lavagem de tanque."),
    ("Supervisão de produção e PCP", "Fixo", "Não é MOD: não põe a mão no produto."),
    ("Laboratório, controle de qualidade e microbiologia", "Fixo", "Estrutura; as análises por lote entram em 5.7."),
    ("Almoxarifado, movimentação e empilhadeira", "Fixo", "Recebimento, separação e abastecimento de linha."),
    ("Limpeza, sanitização e produtos de higienização", "Misto", "Custo alto e recorrente em linha de cosmético."),
    ("Segurança do trabalho, EPI e uniformes", "Fixo", ""),
    ("Ocupação: aluguel, condomínio, IPTU e seguros", "Fixo", "Ou custo de oportunidade do imóvel próprio."),
    ("Outros gastos indiretos de fabricação", "", ""),
]
for nome, nat, obs in itens_ggf:
    txt(wsc, r, 1, nome, font=f_label, fill=fill_claro)
    inp(wsc, r, 2, nat)
    inp(wsc, r, 3, fmt=FMT_BRL0)
    wsc.merge_cells(start_row=r, start_column=4, end_row=r, end_column=NC)
    txt(wsc, r, 4, obs, font=f_nota)
    wsc.row_dimensions[r].height = 22
    r += 1
GGF_FIM = r - 1
L_GGF_MES = r
r = rodape(wsc, r, "GGF total mensal", {3: (f"=SUM(C{GGF_INI}:C{GGF_FIM})", FMT_BRL0)})
r = cabecalho(wsc, r, ["Rateio do GGF", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
L_GGF_HORAS = r
r = par(wsc, r, "Horas produtivas da fábrica no mês", None, "h", FMT_NUM,
        "Horas em que as linhas efetivamente rodam. Usar a capacidade teórica joga custo para debaixo do tapete.")
L_GGF_TAXA = r
r = par(wsc, r, "Taxa de GGF por hora", f"=IFERROR(C{L_GGF_MES}/B{L_GGF_HORAS},0)", "R$/h", FMT_BRL,
        "Calculado: GGF mensal ÷ horas produtivas.")
L_GGF_UN = r
r = par(wsc, r, "GGF rateado por unidade", f"=IFERROR(B{L_GGF_TAXA}*$B${L_HTOT}/$B${L_LOTE},0)", "R$/un.", FMT_BRL,
        "Calculado: taxa por hora × horas do lote ÷ unidades do lote.")
L_GGF_VAR = r
r = par(wsc, r, "GGF variável medido por unidade", None, "R$/un.", FMT_BRL,
        "Só se algum indireto for medido direto na unidade e não estiver na tabela acima. Cuidado para não contar duas vezes.")
L_GGF_TOT = r
r = par(wsc, r, "Total de GGF por unidade", f"=B{L_GGF_UN}+B{L_GGF_VAR}", "R$/un.", FMT_BRL,
        "Calculado: rateio + variável medido.", destaque=True)
r += 1

# --------------------------------------- 5.7 outros custos de producao
r = secao(wsc, r, "5.7 GRUPO 5 — OUTROS CUSTOS DE PRODUÇÃO", NC)
r = nota_larga(wsc, r,
    "Custos reais que não cabem nos quatro grupos clássicos e que costumam sumir da conta. "
    "Cada linha tem a sua própria forma de cálculo, indicada na segunda coluna.")
r = cabecalho(wsc, r, [
    "Item", "Forma de cálculo", "Valor informado", "Unidade", "Referência", "", "", "", "",
    "Custo por unidade (R$)", "% do custo", "Observação",
])
OUT_INI = r
L_QC = r
txt(wsc, r, 1, "Análises de qualidade por lote", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "Valor por lote ÷ lote", font=f_nota)
inp(wsc, r, 3, fmt=FMT_BRL0)
txt(wsc, r, 4, "R$/lote", font=f_nota)
txt(wsc, r, 5, "MP, granel, produto acabado, contraprova", font=f_nota)
calc(wsc, r, 10, f"=IFERROR(C{r}/$B${L_LOTE},0)", FMT_BRL)
inp(wsc, r, 12)
r += 1
L_AMOST = r
txt(wsc, r, 1, "Amostras de retenção e contraprova", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "Unidades retidas × custo", font=f_nota)
inp(wsc, r, 3, fmt=FMT_NUM)
txt(wsc, r, 4, "un./lote", font=f_nota)
txt(wsc, r, 5, "Produto que sai do lote e não é vendido", font=f_nota)
calc(wsc, r, 10, f"=IFERROR(C{r}/$B${L_LOTE}*(J{L_MP_SUB}+J{L_EM_SUB}),0)", FMT_BRL)
inp(wsc, r, 12)
r += 1
L_FERR = r
txt(wsc, r, 1, "Amortização de ferramental e moldes", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "Valor ÷ unidades projetadas", font=f_nota)
inp(wsc, r, 3, fmt=FMT_BRL0)
txt(wsc, r, 4, "R$ total", font=f_nota)
inp(wsc, r, 5, fmt=FMT_NUM)
calc(wsc, r, 10, f"=IFERROR(C{r}/E{r},0)", FMT_BRL)
inp(wsc, r, 12, "Informe as unidades projetadas na coluna Referência")
r += 1
L_ROY = r
txt(wsc, r, 1, "Royalties e licenciamento", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "% sobre o preço de tabela", font=f_nota)
inp(wsc, r, 3, fmt=FMT_PCT)
txt(wsc, r, 4, "%", font=f_nota)
txt(wsc, r, 5, "Marca licenciada, personagem, fragrância exclusiva", font=f_nota)
inp(wsc, r, 12)
L_ROY_J = r
r += 1
L_TOLL = r
txt(wsc, r, 1, "Taxa de terceirização (toll manufacturing)", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "Valor por unidade", font=f_nota)
inp(wsc, r, 3, fmt=FMT_BRL)
txt(wsc, r, 4, "R$/un.", font=f_nota)
txt(wsc, r, 5, "Se usar, zere MOD e GGF: já estão na taxa", font=f_nota)
calc(wsc, r, 10, f"=C{r}", FMT_BRL)
inp(wsc, r, 12)
r += 1
L_OBSOL = r
txt(wsc, r, 1, "Perda por obsolescência e validade", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "% sobre material", font=f_nota)
inp(wsc, r, 3, fmt=FMT_PCT)
txt(wsc, r, 4, "%", font=f_nota)
txt(wsc, r, 5, "Embalagem com arte trocada, granel vencido", font=f_nota)
calc(wsc, r, 10, f"=IFERROR(C{r}*(J{L_MP_SUB}+J{L_EM_SUB}),0)", FMT_BRL)
inp(wsc, r, 12)
r += 1
L_CGIRO = r
txt(wsc, r, 1, "Custo financeiro do estoque", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "Material × taxa × dias ÷ 360", font=f_nota)
inp(wsc, r, 3, fmt=FMT_PCT)
txt(wsc, r, 4, "% ao ano", font=f_nota)
inp(wsc, r, 5, fmt=FMT_NUM)
calc(wsc, r, 10, f"=IFERROR((J{L_MP_SUB}+J{L_EM_SUB})*C{r}*E{r}/360,0)", FMT_BRL)
inp(wsc, r, 12, "Informe os dias de estoque na coluna Referência")
r += 1
L_OUTRO = r
txt(wsc, r, 1, "Outro custo de produção", font=f_label, fill=fill_claro)
txt(wsc, r, 2, "Valor por unidade", font=f_nota)
inp(wsc, r, 3, fmt=FMT_BRL)
txt(wsc, r, 4, "R$/un.", font=f_nota)
inp(wsc, r, 5)
calc(wsc, r, 10, f"=C{r}", FMT_BRL)
inp(wsc, r, 12)
r += 1
OUT_FIM = r - 1
L_OUT_SUB = r
r = rodape(wsc, r, "Subtotal · outros custos de produção",
           {10: (f"=SUM(J{OUT_INI}:J{OUT_FIM})", FMT_BRL)})
r += 1

# ------------------------------------------ 5.8 ficha consolidada
r = secao(wsc, r, "5.8 FICHA DE CUSTO CONSOLIDADA", NC)
r = cabecalho(wsc, r, [
    "Grupo de custo", "Custo por unidade (R$)", "% do custo industrial", "Custo do lote (R$)",
    "O que entra", "", "", "", "", "", "", "",
])
FICHA_INI = r
K = {}
grupos = [
    ("mp",  "Grupo 1 · Matérias-primas da formulação", f"=J{L_MP_SUB}",
     "Insumos da fórmula, líquidos de impostos recuperáveis, com frete de entrada e perdas."),
    ("emb", "Grupo 2 · Embalagem",                     f"=J{L_EM_SUB}",
     "Primária, secundária e terciária, compradas prontas ou transformadas internamente."),
    ("mod", "Grupo 3 · Mão de obra direta",            f"=J{L_MOD_SUB}",
     "Quem põe a mão no produto, com encargos, rateado pelas horas do lote."),
    ("ggf", "Grupo 4 · Gastos gerais de fabricação",   f"=B{L_GGF_TOT}",
     "Indiretos da fábrica rateados por hora ocupada de linha."),
    ("out", "Grupo 5 · Outros custos de produção",     f"=J{L_OUT_SUB}",
     "Qualidade, ferramental, obsolescência, terceirização e custo financeiro do estoque."),
]
for chave, rot, form, oque in grupos:
    txt(wsc, r, 1, rot, font=f_label, fill=fill_claro)
    calc(wsc, r, 2, form, FMT_BRL, link=True)
    K[chave] = r
    r += 1
FICHA_FIM = r - 1
L_CPV = r
K["cpv"] = r
txt(wsc, r, 1, "CUSTO INDUSTRIAL TOTAL (CPV unitário)",
    font=Font(name=FONTE, size=11, bold=True, color=ROSA_ESCURO), fill=fill_claro)
calc(wsc, r, 2, f"=SUM(B{FICHA_INI}:B{FICHA_FIM})", FMT_BRL)
calc(wsc, r, 3, f"=IF(B{r}=0,0,1)", FMT_PCT)
calc(wsc, r, 4, f"=B{r}*$B${L_LOTE}", FMT_BRL0)
wsc.merge_cells(start_row=r, start_column=5, end_row=r, end_column=NC)
txt(wsc, r, 5, "Soma dos cinco grupos. É a base de toda a precificação abaixo.", font=f_nota)
wsc.row_dimensions[r].height = 24
r += 1
for chave, rot, form, oque in grupos:
    lin = K[chave]
    calc(wsc, lin, 3, f"=IFERROR(B{lin}/$B${L_CPV},0)", FMT_PCT)
    calc(wsc, lin, 4, f"=B{lin}*$B${L_LOTE}", FMT_BRL0)
    wsc.merge_cells(start_row=lin, start_column=5, end_row=lin, end_column=NC)
    txt(wsc, lin, 5, oque, font=f_nota)
    wsc.row_dimensions[lin].height = 24
# participacao por linha nas tabelas de detalhe
for i in list(range(MP_INI, MP_FIM + 1)) + list(range(EM_INI, EM_FIM + 1)):
    calc(wsc, i, 11, f'=IF(J{i}="","",IFERROR(J{i}/$B${L_CPV},""))', FMT_PCT)
for i in range(MOD_INI, MOD_FIM + 1):
    calc(wsc, i, 11, f"=IFERROR(J{i}/$B${L_CPV},0)", FMT_PCT)
for i in range(OUT_INI, OUT_FIM + 1):
    calc(wsc, i, 11, f'=IF(J{i}="","",IFERROR(J{i}/$B${L_CPV},""))', FMT_PCT)
calc(wsc, L_MP_SUB, 11, f"=IFERROR(J{L_MP_SUB}/$B${L_CPV},0)", FMT_PCT)
calc(wsc, L_EM_SUB, 11, f"=IFERROR(J{L_EM_SUB}/$B${L_CPV},0)", FMT_PCT)
calc(wsc, L_MOD_SUB, 11, f"=IFERROR(J{L_MOD_SUB}/$B${L_CPV},0)", FMT_PCT)
calc(wsc, L_OUT_SUB, 11, f"=IFERROR(J{L_OUT_SUB}/$B${L_CPV},0)", FMT_PCT)
r += 1

# ------------------------------ 5.9 impostos de venda e preco de tabela
r = secao(wsc, r, "5.9 IMPOSTOS DE VENDA E FORMAÇÃO DO PREÇO", NC)
r = nota_larga(wsc, r,
    "Dois comportamentos diferentes. IPI e ICMS-ST são tributos POR FORA: entram na nota, o cliente paga, "
    "mas não são receita da empresa — passam direto para o governo. ICMS próprio, PIS e COFINS são POR DENTRO: "
    "já estão embutidos no preço de tabela e saem como dedução da receita bruta. "
    "Confirme com a Contabilidade as alíquotas do regime tributário e do estado de destino antes de decidir preço.", altura=2)
r = cabecalho(wsc, r, ["Item", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
P = {}
L_PTAB = r
P["pf"] = r
r = par(wsc, r, "Preço de tabela (sem IPI e sem ST)", None, "R$/un.", FMT_BRL,
        "O preço que sai na nota como valor da mercadoria. É a receita bruta da empresa.")
L_AIPI = r
r = par(wsc, r, "Alíquota de IPI", None, "%", FMT_PCT, "Por fora. Depende da NCM do produto.")
L_AICMS = r
P["imp"] = r
r = par(wsc, r, "Alíquota de ICMS próprio", None, "%", FMT_PCT, "Por dentro. Varia por estado de origem e destino.")
L_APIS = r
r = par(wsc, r, "Alíquota de PIS", 0.0165, "%", FMT_PCT, "Por dentro. Valor usual do regime não cumulativo — confirme o seu.")
L_ACOF = r
r = par(wsc, r, "Alíquota de COFINS", 0.076, "%", FMT_PCT, "Por dentro. Valor usual do regime não cumulativo — confirme o seu.")
L_AMVA = r
r = par(wsc, r, "MVA / IVA-ST", None, "%", FMT_PCT,
        "Margem de valor agregado da substituição tributária. Em higiene pessoal e cosméticos quase sempre há ST, e é ela que infla o preço na nota.")
L_AICMSST = r
r = par(wsc, r, "Alíquota de ICMS no destino (para a ST)", None, "%", FMT_PCT,
        "Alíquota interna do estado onde o produto será vendido ao consumidor.")
L_ADESC = r
P["desc"] = r
r = par(wsc, r, "Descontos, bonificações e devoluções", None, "%", FMT_PCT,
        "Sobre o preço de tabela. É o vazamento invisível da margem: verba de encarte, bonificação em produto, rebate e devolução.")
L_VIPI = r
r = par(wsc, r, "Valor do IPI", f"=B{L_PTAB}*B{L_AIPI}", "R$/un.", FMT_BRL, "Calculado: preço de tabela × alíquota de IPI.")
L_BASEST = r
r = par(wsc, r, "Base de cálculo da ST", f"=(B{L_PTAB}+B{L_VIPI})*(1+B{L_AMVA})", "R$/un.", FMT_BRL,
        "Calculado: (preço de tabela + IPI) × (1 + MVA).")
L_VST = r
r = par(wsc, r, "Valor do ICMS-ST retido",
        f"=MAX(0,B{L_BASEST}*B{L_AICMSST}-B{L_PTAB}*B{L_AICMS})", "R$/un.", FMT_BRL,
        "Calculado: ICMS sobre a base de ST menos o ICMS próprio já destacado.")
L_NOTA = r
r = par(wsc, r, "VALOR TOTAL NA NOTA (o que o cliente paga)",
        f"=B{L_PTAB}+B{L_VIPI}+B{L_VST}", "R$/un.", FMT_BRL,
        "Calculado: preço de tabela + IPI + ST. Este é o custo de aquisição do varejo, não o preço de tabela.", destaque=True)
r += 1
r = cabecalho(wsc, r, ["Da receita bruta à margem", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
L_RB = r
r = par(wsc, r, "Receita bruta", f"=B{L_PTAB}", "R$/un.", FMT_BRL,
        "Igual ao preço de tabela. IPI e ST não são receita.")
L_DICMS = r
r = par(wsc, r, "(−) ICMS próprio", f"=-B{L_PTAB}*B{L_AICMS}", "R$/un.", FMT_BRL, "Por dentro do preço.")
L_DPIS = r
r = par(wsc, r, "(−) PIS", f"=-B{L_PTAB}*B{L_APIS}", "R$/un.", FMT_BRL, "Por dentro do preço.")
L_DCOF = r
r = par(wsc, r, "(−) COFINS", f"=-B{L_PTAB}*B{L_ACOF}", "R$/un.", FMT_BRL, "Por dentro do preço.")
L_DDESC = r
r = par(wsc, r, "(−) Descontos, bonificações e devoluções", f"=-B{L_PTAB}*B{L_ADESC}", "R$/un.", FMT_BRL, "")
L_RL = r
P["rl"] = r
r = par(wsc, r, "RECEITA LÍQUIDA", f"=B{L_RB}+B{L_DICMS}+B{L_DPIS}+B{L_DCOF}+B{L_DDESC}", "R$/un.", FMT_BRL,
        "Calculado: receita bruta menos tributos por dentro e deduções comerciais.", destaque=True)
L_CPVLINK = r
r = par(wsc, r, "(−) Custo industrial (CPV)", f"=-B{L_CPV}", "R$/un.", FMT_BRL,
        "Puxado da ficha consolidada em 5.8.", link=True)
L_MB = r
r = par(wsc, r, "MARGEM BRUTA", f"=B{L_RL}+B{L_CPVLINK}", "R$/un.", FMT_BRL,
        "Calculado: receita líquida menos custo industrial.", destaque=True)
L_MBP = r
r = par(wsc, r, "Margem bruta (%)", f"=IF(B{L_RL}=0,0,B{L_MB}/B{L_RL})", "%", FMT_PCT,
        "Calculado: margem bruta ÷ receita líquida. É a margem que a Diretoria persegue.")
L_MARKUP = r
r = par(wsc, r, "Markup sobre o custo industrial", f'=IF(B{L_CPV}=0,0,B{L_PTAB}/B{L_CPV})', "x", '0.00"x"',
        "Calculado: preço de tabela ÷ custo industrial.")
r += 1
r = cabecalho(wsc, r, ["Despesas variáveis de venda", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
L_ACOM = r
r = par(wsc, r, "Comissão de representantes", None, "%", FMT_PCT, "Sobre o preço de tabela.")
L_AFRETE = r
r = par(wsc, r, "Frete de saída e armazenagem", None, "%", FMT_PCT, "Se o frete for por conta da empresa (CIF).")
L_AVERBA = r
r = par(wsc, r, "Verba de trade e ações de canal", None, "%", FMT_PCT, "Contratos de gôndola, encarte, ponto extra.")
L_DVAR = r
r = par(wsc, r, "(−) Total de despesas variáveis",
        f"=-B{L_PTAB}*(B{L_ACOM}+B{L_AFRETE}+B{L_AVERBA})", "R$/un.", FMT_BRL, "Calculado sobre o preço de tabela.")
L_MC = r
P["mc"] = r
r = par(wsc, r, "MARGEM DE CONTRIBUIÇÃO", f"=B{L_MB}+B{L_DVAR}", "R$/un.", FMT_BRL,
        "Calculado: margem bruta menos despesas variáveis de venda.", destaque=True)
L_MCP = r
P["mcpct"] = r
r = par(wsc, r, "Margem de contribuição (%)", f"=IF(B{L_RL}=0,0,B{L_MC}/B{L_RL})", "%", FMT_PCT,
        "Calculado: margem de contribuição ÷ receita líquida.")
r += 1

# royalties: agora que existe preco de tabela
calc(wsc, L_ROY_J, 10, f"=IFERROR(C{L_ROY}*$B${L_PTAB},0)", FMT_BRL)

# ------------------------------------- 5.10 do varejo para tras
r = secao(wsc, r, "5.10 DO PREÇO DE PRATELEIRA PARA TRÁS", NC)
r = nota_larga(wsc, r,
    "O consumidor decide pelo preço de prateleira, não pelo nosso preço de tabela. Este bloco desce da prateleira "
    "até a fábrica e mostra qual preço de tabela cabe dentro do preço que o mercado aceita — e qual margem bruta sobra.", altura=2)
r = cabecalho(wsc, r, ["Item", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
L_PRAT = r
P["gond"] = r
r = par(wsc, r, "Preço de prateleira alvo (com impostos)", None, "R$/un.", FMT_BRL,
        "Ancorado no benchmark de PDV da aba 2. Comece pelo que o consumidor aceita pagar.")
L_MKVAR = r
P["mkvar"] = r
r = par(wsc, r, "Markup do varejo", None, "%", FMT_PCT,
        "Quanto o cliente marca sobre o custo de aquisição. Atacarejo, farma e varejo tradicional são muito diferentes entre si.")
L_AQUIS = r
r = par(wsc, r, "Custo de aquisição do varejo", f"=IFERROR(B{L_PRAT}/(1+B{L_MKVAR}),0)", "R$/un.", FMT_BRL,
        "Calculado: preço de prateleira ÷ (1 + markup do varejo). É o valor total da nota que o cliente aceita pagar.")
L_FATOR = r
r = par(wsc, r, "Fator de conversão nota → tabela",
        f"=IF(B{L_AICMSST}=0,1+B{L_AIPI},(1+B{L_AIPI})*(1+(1+B{L_AMVA})*B{L_AICMSST})-B{L_AICMS})", "×", FMT_NUM2,
        "Calculado: quanto o valor da nota é maior que o preço de tabela, considerando IPI e ST.")
L_PTAB_IMP = r
r = par(wsc, r, "Preço de tabela implícito no preço de prateleira",
        f"=IFERROR(B{L_AQUIS}/B{L_FATOR},0)", "R$/un.", FMT_BRL,
        "Calculado: custo de aquisição ÷ fator de conversão. É o máximo que dá para cobrar mantendo o preço de prateleira alvo.")
L_DESVIO = r
r = par(wsc, r, "Desvio do preço de tabela praticado",
        f'=IF(B{L_PTAB_IMP}=0,"",IFERROR(B{L_PTAB}/B{L_PTAB_IMP}-1,""))', "%", FMT_PCT,
        "Positivo significa que o nosso preço de tabela estoura o preço de prateleira alvo: ou o varejo comprime a própria margem, ou o produto sai mais caro na gôndola.")
L_MBALVO = r
r = par(wsc, r, "Margem bruta-alvo", f"='1. Briefing'!B{LIN_META_MC}", "%", FMT_PCT,
        "Puxado da aba 1 (célula 1.3).", link=True)
L_DEN = r
r = par(wsc, r, "Fator de margem disponível",
        f"=(1-B{L_AICMS}-B{L_APIS}-B{L_ACOF}-B{L_ADESC}-B{L_ACOM}-B{L_AFRETE}-B{L_AVERBA})"
        f"-B{L_MBALVO}*(1-B{L_AICMS}-B{L_APIS}-B{L_ACOF}-B{L_ADESC})", "fator", FMT_NUM2,
        "Calculado. Se este fator for zero ou negativo, nenhum preço atinge a margem-alvo: os impostos e as despesas variáveis já consomem tudo.")
L_PTABMIN = r
r = par(wsc, r, "Preço de tabela mínimo para a margem-alvo",
        f'=IF(B{L_DEN}<=0,"Inviável",IFERROR(B{L_CPV}/B{L_DEN},0))', "R$/un.", FMT_BRL,
        "Calculado: custo industrial ÷ fator de margem disponível.")
L_NOTAMIN = r
r = par(wsc, r, "Valor mínimo na nota",
        f'=IF(B{L_DEN}<=0,"Inviável",IFERROR(B{L_PTABMIN}*B{L_FATOR},0))', "R$/un.", FMT_BRL,
        "Calculado: preço de tabela mínimo × fator de conversão.")
L_PRATMIN = r
r = par(wsc, r, "Preço de prateleira mínimo",
        f'=IF(B{L_DEN}<=0,"Inviável",IFERROR(B{L_NOTAMIN}*(1+B{L_MKVAR}),0))', "R$/un.", FMT_BRL,
        "Calculado: valor mínimo na nota × (1 + markup do varejo). Compare com o teto da categoria no benchmark da aba 2.")
L_VER = r
P["veredito"] = r
r = par(wsc, r,
        "VEREDITO DE PRECIFICAÇÃO",
        f'=IF(B{L_RL}=0,"Preencha as premissas",'
        f'IF(B{L_MBALVO}=0,"Defina a margem-alvo no briefing",'
        f'IF(B{L_MCP}>=B{L_MBALVO},"APROVADO — margem acima do alvo",'
        f'IF(B{L_MCP}>=B{L_MBALVO}*0.9,"ATENÇÃO — até 10% abaixo do alvo","REPROVADO — margem insuficiente"))))',
        "", None, "Compara a margem de contribuição calculada com a margem-alvo do briefing.", destaque=True)
r += 1

# ------------------------------------------- 5.11 ponto de equilibrio
r = secao(wsc, r, "5.11 PONTO DE EQUILÍBRIO", NC)
r = cabecalho(wsc, r, ["Item", "Valor", "Unidade", "Comentário", "", "", "", "", "", "", "", ""])
B = {}
L_FIXOS = r
r = par(wsc, r, "Custos fixos incrementais mensais", None, "R$/mês", FMT_BRL0,
        "Só o que o projeto adiciona: pessoas, aluguel de linha, sistema, depreciação do ferramental.")
L_MKTM = r
r = par(wsc, r, "Investimento de marketing mensal", None, "R$/mês", FMT_BRL0,
        "Mídia, trade, degustação, encarte, ativação.")
L_COMPR = r
r = par(wsc, r, "Compromisso fixo mensal total", f"=B{L_FIXOS}+B{L_MKTM}", "R$/mês", FMT_BRL0, "Calculado: fixos + marketing.")
L_BEUN = r
B["beun"] = r
r = par(wsc, r, "Volume mensal de equilíbrio",
        f'=IF(B{L_MC}<=0,0,B{L_COMPR}/B{L_MC})', "un./mês", FMT_NUM,
        "Calculado: compromisso fixo ÷ margem de contribuição unitária.")
L_BEREAL = r
r = par(wsc, r, "Volume mensal previsto (Ano 1)", f"=IFERROR('1. Briefing'!B{LIN_META_VOL}/12,0)", "un./mês", FMT_NUM,
        "Puxado da aba 1: meta do Ano 1 ÷ 12.", link=True)
L_FOLGA = r
r = par(wsc, r, "Folga sobre o ponto de equilíbrio",
        f'=IF(B{L_BEUN}=0,0,B{L_BEREAL}/B{L_BEUN}-1)', "%", FMT_PCT,
        "Calculado. Negativo significa que a meta não cobre nem o ponto de equilíbrio.")
L_LOTEBE = r
r = par(wsc, r, "Lotes por mês no volume previsto", f"=IFERROR(B{L_BEREAL}/B{L_LOTE},0)", "lotes/mês", FMT_NUM2,
        "Calculado: volume previsto ÷ tamanho do lote. Menos de um lote por mês significa que o rateio de MOD e GGF em 5.1 está otimista.")
r += 1

# ---------------------------------------------- 5.12 sensibilidade
r = secao(wsc, r, "5.12 SENSIBILIDADE", NC)
r = cabecalho(wsc, r, [
    "Cenário", "Variação no preço de tabela", "Variação no custo industrial", "Preço de tabela (R$)",
    "Receita líquida (R$)", "Custo industrial (R$)", "Margem bruta (R$)", "Margem bruta (%)",
    "Margem de contribuição (%)", "", "", "",
])
SENS_INI = r
for nome, dp, dc in [
    ("Estresse duplo", -0.10, 0.10),
    ("Preço sob pressão", -0.10, 0.00),
    ("Custo sob pressão", 0.00, 0.10),
    ("Base", 0.00, 0.00),
    ("Cenário favorável", 0.05, -0.05),
]:
    txt(wsc, r, 1, nome, font=f_label, fill=fill_claro)
    inp(wsc, r, 2, dp, FMT_PCT)
    inp(wsc, r, 3, dc, FMT_PCT)
    calc(wsc, r, 4, f"=$B${L_PTAB}*(1+B{r})", FMT_BRL)
    calc(wsc, r, 5, f"=D{r}*(1-$B${L_AICMS}-$B${L_APIS}-$B${L_ACOF}-$B${L_ADESC})", FMT_BRL)
    calc(wsc, r, 6, f"=$B${L_CPV}*(1+C{r})", FMT_BRL)
    calc(wsc, r, 7, f"=E{r}-F{r}", FMT_BRL)
    calc(wsc, r, 8, f'=IF(E{r}=0,0,G{r}/E{r})', FMT_PCT)
    calc(wsc, r, 9, f'=IF(E{r}=0,0,(G{r}-D{r}*($B${L_ACOM}+$B${L_AFRETE}+$B${L_AVERBA}))/E{r})', FMT_PCT)
    wsc.row_dimensions[r].height = 22
    r += 1
SENS_FIM = r - 1
r = rodape(wsc, r, "Pior margem de contribuição entre os cenários",
           {9: (f"=IFERROR(MIN(I{SENS_INI}:I{SENS_FIM}),0)", FMT_PCT)})
r = nota_larga(wsc, r,
    "Se a margem no cenário de estresse duplo já fica abaixo do alvo, o projeto não tem folga para negociar preço com o varejo "
    "nem para absorver reajuste de matéria-prima. Em caixa curto, projeto sem folga vira prejuízo no primeiro reajuste.", altura=2)


# ===================================================== 6. VIABILIDADE
wsv, r = nova_aba(
    "6. Viabilidade", [40, 18, 18, 18, 18, 46],
    "6 · VIABILIDADE ECONÔMICA — 3 ANOS",
    "Puxa preço e custo da aba 5 e investimentos das abas 3 e 4. Preencha apenas crescimento, percentuais de despesa e taxa de desconto.",
)

r = secao(wsv, r, "6.1 PREMISSAS", 6)
r = cabecalho(wsv, r, ["Premissa", "Valor", "", "", "", "Comentário"])
V = {}
premissas = [
    ("g2",    "Crescimento de volume — Ano 2",     0.25,  FMT_PCT,  "Sobre o volume do Ano 1. Lançamento costuma crescer no Ano 2 pela distribuição, não pelo giro."),
    ("g3",    "Crescimento de volume — Ano 3",     0.15,  FMT_PCT,  "Maturação. Crescimento de dois dígitos altos no Ano 3 precisa de justificativa."),
    ("mkt",   "Marketing e trade (% da receita líquida)", 0.08, FMT_PCT, "Inclui mídia, trade, encarte e ativação de PDV."),
    ("com",   "Despesas comerciais e estrutura (% da RL)", 0.06, FMT_PCT, "Comissão, representação, estrutura de vendas alocada."),
    ("taxa",  "Taxa de desconto anual",            0.18,  FMT_PCT,  "Custo de capital. Em cenário de caixa curto e dívida cara, o piso é o custo da dívida — alinhar com a Diretoria Financeira."),
    ("out",   "Outros investimentos no Ano 0",     None,  FMT_BRL0, "Consultoria, arte, fotografia, ativação de lançamento, cadastro em clientes."),
]
for chave, rot, val, fmt, nota in premissas:
    txt(wsv, r, 1, rot, font=f_label, fill=fill_claro)
    inp(wsv, r, 2, val, fmt)
    for c in range(3, 6):
        txt(wsv, r, c, "", fill=fill_cinza)
    txt(wsv, r, 6, nota, font=f_nota)
    wsv.row_dimensions[r].height = 26
    V[chave] = r
    r += 1
txt(wsv, r, 1, "Valores de crescimento e de despesa são ilustrativos — substitua pelos seus.",
    font=f_nota)
r += 2

r = secao(wsv, r, "6.2 DEMONSTRATIVO INCREMENTAL DO PROJETO", 6)
r = cabecalho(wsv, r, ["Linha", "Ano 0", "Ano 1", "Ano 2", "Ano 3", "Comentário"])

def linha_ano(linha, rotulo, f0, f1, f2, f3, fmt, nota, destaque=False, link=False):
    fill = fill_claro if not destaque else PatternFill("solid", fgColor=ROSA_CLARO)
    c = txt(wsv, linha, 1, rotulo, font=f_label, fill=fill)
    if destaque:
        c.font = Font(name=FONTE, size=10, bold=True, color=ROSA_ESCURO)
    for col, form in zip((2, 3, 4, 5), (f0, f1, f2, f3)):
        if form is None:
            cc = ws_blank(linha, col)
        else:
            cc = calc(wsv, linha, col, form, fmt, link=link)
    txt(wsv, linha, 6, nota, font=f_nota)
    wsv.row_dimensions[linha].height = 22


def ws_blank(linha, col):
    c = wsv.cell(row=linha, column=col, value=None)
    c.fill = fill_cinza
    c.border = borda
    return c

VOL = r;      r += 1
PFAB = r;     r += 1
RB = r;       r += 1
RLIQ = r;     r += 1
CPVT = r;     r += 1
MCT = r;      r += 1
DMKT = r;     r += 1
DCOM = r;     r += 1
RESULT = r;   r += 1

linha_ano(VOL, "Volume (un.)", None,
          f"=IFERROR('1. Briefing'!B{LIN_META_VOL},0)",
          f"=C{VOL}*(1+$B${V['g2']})",
          f"=D{VOL}*(1+$B${V['g3']})",
          FMT_NUM, "Ano 1 vem da meta do briefing; Anos 2 e 3 aplicam o crescimento premissado.", link=True)
linha_ano(PFAB, "Preço de fábrica (R$/un.)", None,
          f"='5. Custos'!B{P['pf']}", f"=C{PFAB}", f"=D{PFAB}",
          FMT_BRL, "Puxado da aba 5. Mantido nominal — sem reajuste. Se houver política de preço, ajuste aqui.", link=True)
linha_ano(RB, "Receita bruta", None,
          f"=C{VOL}*C{PFAB}", f"=D{VOL}*D{PFAB}", f"=E{VOL}*E{PFAB}",
          FMT_BRL0, "Volume × preço de fábrica.")
linha_ano(RLIQ, "Receita líquida", None,
          f"=C{VOL}*'5. Custos'!$B${P['rl']}",
          f"=D{VOL}*'5. Custos'!$B${P['rl']}",
          f"=E{VOL}*'5. Custos'!$B${P['rl']}",
          FMT_BRL0, "Volume × receita líquida unitária da aba 5 (já descontados impostos e verbas).", link=True)
linha_ano(CPVT, "(−) Custo industrial", None,
          f"=-C{VOL}*'5. Custos'!$B${K['cpv']}",
          f"=-D{VOL}*'5. Custos'!$B${K['cpv']}",
          f"=-E{VOL}*'5. Custos'!$B${K['cpv']}",
          FMT_BRL0, "Volume × CPV unitário da aba 5.", link=True)
linha_ano(MCT, "► Margem bruta", None,
          f"=C{RLIQ}+C{CPVT}", f"=D{RLIQ}+D{CPVT}", f"=E{RLIQ}+E{CPVT}",
          FMT_BRL0, "Receita líquida − custo industrial. As despesas variáveis de venda estão detalhadas na aba 5.", destaque=True)
linha_ano(DMKT, "(−) Marketing e trade", None,
          f"=-C{RLIQ}*$B${V['mkt']}", f"=-D{RLIQ}*$B${V['mkt']}", f"=-E{RLIQ}*$B${V['mkt']}",
          FMT_BRL0, "Percentual da receita líquida definido em 6.1.")
linha_ano(DCOM, "(−) Despesas comerciais e estrutura", None,
          f"=-C{RLIQ}*$B${V['com']}", f"=-D{RLIQ}*$B${V['com']}", f"=-E{RLIQ}*$B${V['com']}",
          FMT_BRL0, "Percentual da receita líquida definido em 6.1.")
linha_ano(RESULT, "► Resultado contributivo do projeto", None,
          f"=C{MCT}+C{DMKT}+C{DCOM}", f"=D{MCT}+D{DMKT}+D{DCOM}", f"=E{MCT}+E{DMKT}+E{DCOM}",
          FMT_BRL0, "O que o projeto devolve ao caixa antes de investimento e de rateio de fixos corporativos.", destaque=True)
r = RESULT + 2

r = secao(wsv, r, "6.3 INVESTIMENTO (ANO 0) E FLUXO DE CAIXA", 6)
r = cabecalho(wsv, r, ["Linha", "Ano 0", "Ano 1", "Ano 2", "Ano 3", "Comentário"])
INV_FERR = r; r += 1
INV_REG  = r; r += 1
INV_TST  = r; r += 1
INV_EST  = r; r += 1
INV_OUT  = r; r += 1
INV_TOT  = r; r += 1
FC       = r; r += 1
FCAC     = r; r += 1

linha_ano(INV_FERR, "Ferramental e moldes", f"='4. Embalagem'!H{L_EMB_CAPEX}", None, None, None,
          FMT_BRL0, "Puxado da aba 4.", link=True)
linha_ano(INV_REG, "Regulatório", f"='3. Formulação'!F{L_CUSTO_REG}", None, None, None,
          FMT_BRL0, "Puxado da aba 3.", link=True)
linha_ano(INV_TST, "Pesquisa, desenvolvimento e testes", f"='3. Formulação'!B{L_CUSTO_TESTES}", None, None, None,
          FMT_BRL0, "Puxado da aba 3.", link=True)
linha_ano(INV_EST, "Capital de giro — primeiro lote de embalagem", f"='4. Embalagem'!G{L_EMB_1LOTE}", None, None, None,
          FMT_BRL0, "Puxado da aba 4. MOQ máximo × custo de embalagem por unidade.", link=True)
linha_ano(INV_OUT, "Outros investimentos", f"=$B${V['out']}", None, None, None,
          FMT_BRL0, "Definido em 6.1.", link=True)
linha_ano(INV_TOT, "► Investimento total", f"=SUM(B{INV_FERR}:B{INV_OUT})", None, None, None,
          FMT_BRL0, "Soma das linhas acima. Compare com o capex máximo autorizado no briefing.", destaque=True)
linha_ano(FC, "Fluxo de caixa livre", f"=-B{INV_TOT}", f"=C{RESULT}", f"=D{RESULT}", f"=E{RESULT}",
          FMT_BRL0, "Ano 0 negativo (desembolso); anos seguintes, o resultado contributivo.")
linha_ano(FCAC, "Fluxo de caixa acumulado", f"=B{FC}", f"=B{FCAC}+C{FC}", f"=C{FCAC}+D{FC}", f"=D{FCAC}+E{FC}",
          FMT_BRL0, "Quando vira positivo, o projeto se pagou.", destaque=True)
r = FCAC + 2

r = secao(wsv, r, "6.4 INDICADORES DE DECISÃO", 6)
r = cabecalho(wsv, r, ["Indicador", "Resultado", "", "", "", "Leitura"])
ind = [
    ("VPL (Valor Presente Líquido)",
     f"=IFERROR(NPV($B${V['taxa']},C{FC}:E{FC})+B{FC},0)", FMT_BRL0,
     "Positivo, o projeto cria valor acima do custo de capital. Negativo, destrói."),
    ("TIR (Taxa Interna de Retorno)",
     f'=IFERROR(IRR(B{FC}:E{FC}),"n/d")', FMT_PCT,
     "Compare com a taxa de desconto de 6.1. Abaixo dela, o dinheiro rende mais em outro lugar."),
    ("Payback (anos)",
     f'=IF(B{FCAC}>=0,0,IF(C{FCAC}>=0,IFERROR(-B{FC}/C{FC},""),'
     f'IF(D{FCAC}>=0,IFERROR(1-C{FCAC}/D{FC},""),'
     f'IF(E{FCAC}>=0,IFERROR(2-D{FCAC}/E{FC},""),"Acima de 3 anos"))))',
     FMT_NUM2,
     "Em caixa curto, payback acima de 24 meses é decisão de Diretoria, não de área."),
    ("ROI em 3 anos",
     f'=IF(B{INV_TOT}=0,0,(SUM(C{FC}:E{FC})-B{INV_TOT})/B{INV_TOT})', FMT_PCT,
     "Retorno acumulado sobre o investimento do Ano 0."),
    ("Investimento × capex autorizado",
     f'=IF(\'1. Briefing\'!B{LIN_CAPEX_MAX}="","Capex não informado no briefing",'
     f'IF(B{INV_TOT}<=\'1. Briefing\'!B{LIN_CAPEX_MAX},"Dentro do teto autorizado","ESTOURA o teto autorizado"))',
     None,
     "Confronta o investimento total com o teto declarado na aba 1."),
    ("Margem bruta consolidada — Ano 1",
     f'=IF(C{RLIQ}=0,0,C{MCT}/C{RLIQ})', FMT_PCT,
     "Deve bater com a margem bruta unitária da aba 5. Divergência indica premissa inconsistente."),
]
IND_INI = r
for rot, form, fmt, leitura in ind:
    txt(wsv, r, 1, rot, font=f_label, fill=fill_claro)
    calc(wsv, r, 2, form, fmt)
    for c in range(3, 6):
        txt(wsv, r, c, "", fill=fill_cinza)
    txt(wsv, r, 6, leitura, font=f_nota)
    wsv.row_dimensions[r].height = 28
    r += 1
L_VPL = IND_INI
L_TIR = IND_INI + 1
L_PAYBACK = IND_INI + 2


# ====================================================== 7. SCORECARD
wss, r = nova_aba(
    "7. Scorecard", [40, 12, 12, 16, 60],
    "7 · SCORECARD DE PRIORIZAÇÃO DE PORTFÓLIO",
    "Pesos somam 100%. Notas de 1 a 5. O score ponderado define a ordem da fila de desenvolvimento.",
)
r = secao(wss, r, "7.1 CRITÉRIOS", 5)
r = cabecalho(wss, r, ["Critério", "Peso", "Nota (1-5)", "Ponderado", "Como pontuar"])
SC_INI = r
criterios = [
    ("Aderência à estratégia e à marca", 0.20,
     "5 = usa o território da Leite de Rosas sem forçar. 1 = a marca não tem autoridade nenhuma nessa promessa."),
    ("Tamanho da oportunidade (SOM)", 0.20,
     "Ancorar no SOM da aba 2. 5 = move o ponteiro do faturamento. 1 = nicho que não paga o esforço."),
    ("Margem de contribuição", 0.20,
     "Ancorar no percentual da aba 5. 5 = bem acima da margem média da casa. 1 = abaixo do alvo do briefing."),
    ("Força do conceito para o consumidor", 0.20,
     "Ancorar em teste de conceito. 5 = intenção de compra alta e benefício claro. 1 = ninguém entendeu."),
    ("Complexidade técnica e regulatória (quanto menor, melhor)", 0.12,
     "5 = fórmula conhecida, grau de risco 1, sem registro. 1 = tecnologia nova e registro exigido."),
    ("Baixo risco de canibalização (quanto menor, melhor)", 0.08,
     "5 = o volume vem de fora de casa. 1 = tira volume direto do carro-chefe."),
]
for nome, peso, como in criterios:
    txt(wss, r, 1, nome, font=f_label, fill=fill_claro)
    inp(wss, r, 2, peso, FMT_PCT)
    inp(wss, r, 3, None, FMT_NUM)
    calc(wss, r, 4, f'=IF(C{r}="","",B{r}*C{r})', FMT_NUM2)
    txt(wss, r, 5, como, font=f_nota)
    wss.row_dimensions[r].height = 30
    r += 1
SC_FIM = r - 1
dv(wss, '"1,2,3,4,5"', f"C{SC_INI}:C{SC_FIM}")

L_SC_PESO = r
txt(wss, r, 1, "Soma dos pesos", font=f_label, fill=fill_cinza)
calc(wss, r, 2, f"=SUM(B{SC_INI}:B{SC_FIM})", FMT_PCT)
txt(wss, r, 3, "", fill=fill_cinza)
txt(wss, r, 4, "", fill=fill_cinza)
calc(wss, r, 5, f'=IF(ABS(B{r}-1)<0.0001,"OK — pesos somam 100%","AJUSTAR — os pesos precisam somar 100%")')
r += 1
L_SC_TOTAL = r
txt(wss, r, 1, "SCORE PONDERADO (1 a 5)", font=Font(name=FONTE, size=11, bold=True, color=ROSA_ESCURO), fill=fill_claro)
txt(wss, r, 2, "", fill=fill_cinza)
calc(wss, r, 3, f"=COUNT(C{SC_INI}:C{SC_FIM})", FMT_NUM)
calc(wss, r, 4, f"=IFERROR(SUMPRODUCT(B{SC_INI}:B{SC_FIM},C{SC_INI}:C{SC_FIM}),0)", FMT_NUM2)
txt(wss, r, 5, "Soma dos ponderados. A coluna C mostra quantos critérios já foram pontuados — abaixo de 10, o score está incompleto.", font=f_nota)
wss.row_dimensions[r].height = 24
r += 1
L_SC_CLASSE = r
txt(wss, r, 1, "CLASSIFICAÇÃO", font=Font(name=FONTE, size=11, bold=True, color=ROSA_ESCURO), fill=fill_claro)
wss.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
calc(wss, r, 2,
     f'=IF(COUNT(C{SC_INI}:C{SC_FIM})<{SC_FIM-SC_INI+1},"Incompleto — pontue todos os critérios",'
     f'IF(D{L_SC_TOTAL}>=4,"PRIORIDADE MÁXIMA — entra na fila agora",'
     f'IF(D{L_SC_TOTAL}>=3.2,"APROVADO — entra na fila conforme capacidade",'
     f'IF(D{L_SC_TOTAL}>=2.5,"REVISAR — reformular conceito, custo ou escopo",'
     f'"DESCARTAR — não justifica o esforço"))))')
txt(wss, r, 5, "Faixas de corte definidas pela gestão de portfólio. Ajuste-as se a régua da casa for outra.", font=f_nota)
wss.row_dimensions[r].height = 24
r += 2

r = secao(wss, r, "7.2 COMPARATIVO COM OUTROS PROJETOS DA FILA", 5)
r = cabecalho(wss, r, ["Projeto", "Score", "Investimento (R$)", "Payback (anos)", "Situação"])
CMP_INI = r
txt(wss, r, 1, "Este projeto", font=f_label, fill=fill_claro)
calc(wss, r, 2, f"=D{L_SC_TOTAL}", FMT_NUM2)
calc(wss, r, 3, f"='6. Viabilidade'!B{INV_TOT}", FMT_BRL0, link=True)
calc(wss, r, 4, f"='6. Viabilidade'!B{L_PAYBACK}", FMT_NUM2, link=True)
calc(wss, r, 5, f"=B{L_SC_CLASSE}")
r += 1
for _ in range(6):
    inp(wss, r, 1)
    inp(wss, r, 2, fmt=FMT_NUM2)
    inp(wss, r, 3, fmt=FMT_BRL0)
    inp(wss, r, 4, fmt=FMT_NUM2)
    inp(wss, r, 5)
    r += 1
CMP_FIM = r - 1
txt(wss, r, 1, "Posição deste projeto na fila", font=f_label, fill=fill_cinza)
calc(wss, r, 2, f"=IFERROR(RANK(B{CMP_INI},B{CMP_INI}:B{CMP_FIM},0),0)", FMT_NUM)
txt(wss, r, 3, "", fill=fill_cinza)
txt(wss, r, 4, "", fill=fill_cinza)
txt(wss, r, 5, "Ranking por score entre os projetos listados. Preencha os concorrentes internos para a comparação fazer sentido.", font=f_nota)


# ====================================================== 8. CRONOGRAMA
wsk, r = nova_aba(
    "8. Cronograma", [8, 40, 22, 16, 16, 16, 22, 14, 14],
    "8 · CRONOGRAMA STAGE-GATE",
    "Preencha a data de início e as durações. As datas de término e o encadeamento são calculados.",
)
r = secao(wsk, r, "8.1 ÂNCORA DO CRONOGRAMA", 9)
L_INICIO = r + 1
r = cabecalho(wsk, r, ["", "Parâmetro", "Valor", "", "", "", "Comentário", "", ""])
txt(wsk, r, 1, "", fill=fill_claro)
txt(wsk, r, 2, "Data de início do projeto", font=f_label, fill=fill_claro)
inp(wsk, r, 3, None, FMT_DATA, nota="Data em que a primeira fase começa. Todas as demais datas derivam desta.")
for c in (4, 5, 6):
    txt(wsk, r, c, "", fill=fill_cinza)
wsk.merge_cells(start_row=r, start_column=7, end_row=r, end_column=9)
txt(wsk, r, 7, "Sem esta data, nenhuma outra é calculada.", font=f_nota)
r += 2

r = secao(wsk, r, "8.2 FASES E GATES", 9)
r = cabecalho(wsk, r, [
    "#", "Fase / entrega", "Gate de saída", "Início", "Duração (dias)",
    "Término", "Responsável", "% concluído", "Status",
])
CR_INI = r
fases = [
    ("Exploração e abertura do briefing", "G0 — ideia aprovada", 10),
    ("Pesquisa de mercado e benchmark de PDV", "G1 — conceito validado", 20),
    ("Definição de conceito e teste com consumidor", "G1 — conceito validado", 25),
    ("Desenvolvimento de fórmula em bancada", "G2 — viabilidade técnica", 45),
    ("Definição de embalagem e cotação de fornecedores", "G2 — viabilidade técnica", 30),
    ("Custeio, precificação e caso de negócio", "G2 — viabilidade econômica", 15),
    ("Aprovação do gate de investimento", "G3 — GO de desenvolvimento", 10),
    ("Estabilidade, compatibilidade e microbiologia", "G3 — dossiê técnico", 90),
    ("Regulatório: notificação ou registro", "G3 — regularização", 45),
    ("Design de embalagem, arte e fotolito", "G4 — arte liberada", 40),
    ("Ferramental, amostras e aprovação de fornecedores", "G4 — suprimentos prontos", 60),
    ("Piloto industrial e validação de linha", "G4 — processo validado", 20),
    ("Cadastro comercial, GTIN e ficha técnica", "G5 — pronto para vender", 15),
    ("Produção do primeiro lote", "G5 — estoque disponível", 20),
    ("Sell-in e lançamento no canal prioritário", "G5 — produto na gôndola", 30),
    ("Acompanhamento pós-lançamento (90 dias)", "Revisão de KPIs", 90),
]
for i, (nome, gate, dur) in enumerate(fases, start=1):
    txt(wsk, r, 1, i, font=f_label)
    txt(wsk, r, 2, nome, font=f_label, fill=fill_claro)
    txt(wsk, r, 3, gate, font=f_nota)
    if i == 1:
        calc(wsk, r, 4, f'=IF($C${L_INICIO}="","",$C${L_INICIO})', FMT_DATA)
    else:
        calc(wsk, r, 4, f'=IF(F{r-1}="","",F{r-1}+1)', FMT_DATA)
    inp(wsk, r, 5, dur, FMT_NUM)
    calc(wsk, r, 6, f'=IF(OR(D{r}="",E{r}=""),"",D{r}+E{r})', FMT_DATA)
    inp(wsk, r, 7)
    inp(wsk, r, 8, 0, FMT_PCT)
    inp(wsk, r, 9)
    wsk.row_dimensions[r].height = 22
    r += 1
CR_FIM = r - 1
dv(wsk, '"Não iniciada,Em andamento,Concluída,Atrasada,Bloqueada"', f"I{CR_INI}:I{CR_FIM}")

txt(wsk, r, 1, "", fill=fill_cinza)
txt(wsk, r, 2, "Duração total (sequencial)", font=f_label, fill=fill_cinza)
txt(wsk, r, 3, "", fill=fill_cinza)
txt(wsk, r, 4, "", fill=fill_cinza)
calc(wsk, r, 5, f"=SUM(E{CR_INI}:E{CR_FIM})", FMT_NUM)
L_FIM_PROJ = r
calc(wsk, r, 6, f'=IF(F{CR_FIM}="","",F{CR_FIM})', FMT_DATA)
txt(wsk, r, 7, "Cenário 100% sequencial.", font=f_nota)
calc(wsk, r, 8, f"=IFERROR(AVERAGE(H{CR_INI}:H{CR_FIM}),0)", FMT_PCT)
txt(wsk, r, 9, "", fill=fill_cinza)
r += 1
txt(wsk, r, 1, "", fill=fill_cinza)
txt(wsk, r, 2, "Duração em meses", font=f_label, fill=fill_cinza)
txt(wsk, r, 3, "", fill=fill_cinza)
txt(wsk, r, 4, "", fill=fill_cinza)
calc(wsk, r, 5, f"=IFERROR(SUM(E{CR_INI}:E{CR_FIM})/30,0)", FMT_NUM2)
for c in range(6, 10):
    txt(wsk, r, c, "", fill=fill_cinza)
r += 1
L_LANC = r
txt(wsk, r, 1, "", fill=fill_cinza)
txt(wsk, r, 2, "Data prevista de gôndola", font=f_label, fill=fill_cinza)
txt(wsk, r, 3, "", fill=fill_cinza)
txt(wsk, r, 4, "", fill=fill_cinza)
txt(wsk, r, 5, "", fill=fill_cinza)
calc(wsk, r, 6, f'=IF(F{CR_FIM-1}="","",F{CR_FIM-1})', FMT_DATA)
wsk.merge_cells(start_row=r, start_column=7, end_row=r, end_column=9)
txt(wsk, r, 7, "Término da fase de sell-in e lançamento.", font=f_nota)
r += 1
txt(wsk, r, 1, "", fill=fill_cinza)
txt(wsk, r, 2, "Dias restantes até a gôndola", font=f_label, fill=fill_cinza)
txt(wsk, r, 3, "", fill=fill_cinza)
txt(wsk, r, 4, "", fill=fill_cinza)
txt(wsk, r, 5, "", fill=fill_cinza)
calc(wsk, r, 6, f'=IF(F{L_LANC}="","",F{L_LANC}-TODAY())', FMT_NUM)
wsk.merge_cells(start_row=r, start_column=7, end_row=r, end_column=9)
txt(wsk, r, 7, "Recalcula sozinho a cada abertura do arquivo.", font=f_nota)
r += 2

r = secao(wsk, r, "8.3 PARALELIZAÇÃO — ONDE DÁ PARA GANHAR TEMPO", 9)
wsk.merge_cells(start_row=r, start_column=1, end_row=r + 3, end_column=9)
txt(wsk, r, 1,
    "O cálculo acima é sequencial e propositalmente pessimista: serve de teto. Na prática, estabilidade, "
    "regulatório, arte e ferramental correm em paralelo, e é aí que se ganham meses. Estabilidade é quase sempre "
    "o caminho crítico — comece por ela assim que a fórmula estiver congelada, não depois da arte aprovada. "
    "Em cenário de caixa curto, atrasar o ferramental até a fórmula estar validada evita imobilizar dinheiro em "
    "molde de um produto que ainda pode mudar. Registre aqui, fase a fase, o que roda em paralelo e qual é a "
    "dependência real entre elas.",
    font=f_texto)
wsk.row_dimensions[r].height = 22


# ========================================================== 9. RISCOS
wsr, r = nova_aba(
    "9. Riscos", [8, 42, 20, 14, 14, 14, 16, 46, 20, 14],
    "9 · MATRIZ DE RISCOS DO PROJETO",
    "Probabilidade e impacto de 1 a 5. Severidade e nível são calculados. Risco sem dono e sem prazo não é risco tratado.",
)
r = secao(wsr, r, "9.1 RISCOS MAPEADOS", 10)
r = cabecalho(wsr, r, [
    "#", "Risco", "Categoria", "Prob. (1-5)", "Impacto (1-5)", "Severidade",
    "Nível", "Mitigação", "Responsável", "Prazo",
])
RSK_INI = r
riscos = [
    ("Custo de matéria-prima acima do orçado derruba a margem", "Custo"),
    ("Varejo não aceita o preço e exige verba adicional", "Comercial"),
    ("MOQ de embalagem imobiliza caixa acima do previsto", "Financeiro"),
    ("Estabilidade reprova e obriga a refazer a fórmula", "Técnico"),
    ("Notificação ou registro atrasa e trava o lançamento", "Regulatório"),
    ("Claim sem lastro gera questionamento de órgão ou concorrente", "Jurídico"),
    ("Produto canibaliza o carro-chefe em vez de somar volume", "Portfólio"),
    ("Concorrente lança conceito equivalente antes", "Competitivo"),
    ("Fornecedor único de componente crítico atrasa ou falha", "Suprimentos"),
    ("Giro abaixo do previsto gera devolução e ruptura de confiança no canal", "Comercial"),
    ("Capacidade fabril insuficiente no pico de demanda", "Operacional"),
    ("Investimento estoura o capex autorizado", "Financeiro"),
]
for i, (risco, cat) in enumerate(riscos, start=1):
    txt(wsr, r, 1, i, font=f_label)
    txt(wsr, r, 2, risco, font=f_label, fill=fill_claro)
    txt(wsr, r, 3, cat, font=f_nota)
    inp(wsr, r, 4, fmt=FMT_NUM)
    inp(wsr, r, 5, fmt=FMT_NUM)
    calc(wsr, r, 6, f'=IF(OR(D{r}="",E{r}=""),"",D{r}*E{r})', FMT_NUM)
    calc(wsr, r, 7,
         f'=IF(F{r}="","",IF(F{r}>=15,"CRÍTICO",IF(F{r}>=9,"ALTO",IF(F{r}>=4,"MÉDIO","BAIXO"))))')
    inp(wsr, r, 8)
    inp(wsr, r, 9)
    inp(wsr, r, 10, fmt=FMT_DATA)
    wsr.row_dimensions[r].height = 24
    r += 1
RSK_FIM = r - 1
dv(wsr, '"1,2,3,4,5"', f"D{RSK_INI}:E{RSK_FIM}")

txt(wsr, r, 1, "", fill=fill_cinza)
txt(wsr, r, 2, "Severidade média da carteira de riscos", font=f_label, fill=fill_cinza)
for c in (3, 4, 5):
    txt(wsr, r, c, "", fill=fill_cinza)
calc(wsr, r, 6, f"=IFERROR(AVERAGE(F{RSK_INI}:F{RSK_FIM}),0)", FMT_NUM2)
txt(wsr, r, 7, "", fill=fill_cinza)
txt(wsr, r, 8, "", fill=fill_cinza)
txt(wsr, r, 9, "", fill=fill_cinza)
txt(wsr, r, 10, "", fill=fill_cinza)
r += 1
txt(wsr, r, 1, "", fill=fill_cinza)
txt(wsr, r, 2, "Riscos críticos ou altos", font=f_label, fill=fill_cinza)
for c in (3, 4, 5):
    txt(wsr, r, c, "", fill=fill_cinza)
L_RSK_ALTOS = r
calc(wsr, r, 6, f'=COUNTIF(G{RSK_INI}:G{RSK_FIM},"CRÍTICO")+COUNTIF(G{RSK_INI}:G{RSK_FIM},"ALTO")', FMT_NUM)
wsr.merge_cells(start_row=r, start_column=7, end_row=r, end_column=10)
txt(wsr, r, 7, "Todo risco crítico ou alto precisa de mitigação escrita, dono e prazo antes do gate de investimento.", font=f_nota)
r += 1
txt(wsr, r, 1, "", fill=fill_cinza)
txt(wsr, r, 2, "Riscos altos sem mitigação definida", font=f_label, fill=fill_cinza)
for c in (3, 4, 5):
    txt(wsr, r, c, "", fill=fill_cinza)
calc(wsr, r, 6,
     f'=COUNTIFS(G{RSK_INI}:G{RSK_FIM},"CRÍTICO",H{RSK_INI}:H{RSK_FIM},"")'
     f'+COUNTIFS(G{RSK_INI}:G{RSK_FIM},"ALTO",H{RSK_INI}:H{RSK_FIM},"")', FMT_NUM)
wsr.merge_cells(start_row=r, start_column=7, end_row=r, end_column=10)
txt(wsr, r, 7, "Precisa chegar a zero antes da aprovação.", font=f_nota)
r += 2

r = secao(wsr, r, "9.2 CRITÉRIO DE SEVERIDADE", 10)
r = cabecalho(wsr, r, ["Faixa", "Nível", "Ação exigida", "", "", "", "", "", "", ""])
for faixa, nivel, acao in [
    ("15 a 25", "CRÍTICO", "Plano de mitigação aprovado pela Diretoria antes do gate. Sem plano, sem GO."),
    ("9 a 14", "ALTO", "Mitigação com dono e prazo, revisada a cada gate."),
    ("4 a 8", "MÉDIO", "Monitorar e reavaliar a cada gate."),
    ("1 a 3", "BAIXO", "Registrar e seguir."),
]:
    txt(wsr, r, 1, faixa, font=f_label, fill=fill_claro)
    txt(wsr, r, 2, nivel, font=f_label)
    wsr.merge_cells(start_row=r, start_column=3, end_row=r, end_column=10)
    txt(wsr, r, 3, acao, font=f_texto)
    r += 1


# ================================================= 10. APROVACAO / GATES
wsa, r = nova_aba(
    "10. Aprovação", [8, 46, 18, 18, 16, 16, 44],
    "10 · CHECKLIST DE GATE E REGISTRO DE APROVAÇÃO",
    "Documento de decisão. Vai assinado para o comitê junto com as abas 6, 7 e 9.",
)
r = secao(wsa, r, "10.1 CHECKLIST DE PRONTIDÃO PARA O GATE", 7)
r = cabecalho(wsa, r, ["#", "Item", "Gate", "Status", "Responsável", "Data", "Observação"])
CHK_INI = r
checklist = [
    ("Briefing preenchido por completo (aba 1)", "G1"),
    ("Dimensionamento de mercado com fonte declarada (aba 2)", "G1"),
    ("Benchmark com no mínimo 5 SKUs coletados em PDV (aba 2)", "G1"),
    ("Conceito testado com consumidor", "G1"),
    ("Especificação técnica alvo definida (aba 3)", "G2"),
    ("Enquadramento regulatório confirmado (aba 3)", "G2"),
    ("Cada claim com plano de comprovação (aba 3)", "G2"),
    ("Embalagem cotada com no mínimo 2 fornecedores (aba 4)", "G2"),
    ("BOM fechando 100% e custo industrial calculado (aba 5)", "G2"),
    ("Margem de contribuição igual ou acima do alvo (aba 5)", "G2"),
    ("Caso de negócio com VPL, TIR e payback (aba 6)", "G3"),
    ("Investimento dentro do capex autorizado (aba 6)", "G3"),
    ("Scorecard pontuado e classificado (aba 7)", "G3"),
    ("Cronograma com responsáveis por fase (aba 8)", "G3"),
    ("Riscos críticos e altos com mitigação e dono (aba 9)", "G3"),
    ("Estabilidade e microbiologia aprovadas", "G4"),
    ("Regularização concluída junto à ANVISA", "G4"),
    ("Arte aprovada por regulatório, jurídico e marketing", "G4"),
    ("Piloto industrial validado", "G4"),
    ("Cadastro comercial, GTIN e ficha técnica prontos", "G5"),
    ("Plano de sell-in e verba de lançamento aprovados", "G5"),
    ("Primeiro lote produzido e disponível", "G5"),
]
for i, (item, gate) in enumerate(checklist, start=1):
    txt(wsa, r, 1, i, font=f_label)
    txt(wsa, r, 2, item, font=f_label, fill=fill_claro)
    txt(wsa, r, 3, gate, font=f_nota)
    inp(wsa, r, 4)
    inp(wsa, r, 5)
    inp(wsa, r, 6, fmt=FMT_DATA)
    inp(wsa, r, 7)
    wsa.row_dimensions[r].height = 22
    r += 1
CHK_FIM = r - 1
dv(wsa, '"Sim,Não,N/A"', f"D{CHK_INI}:D{CHK_FIM}")

L_CHK_PCT = r
txt(wsa, r, 1, "", fill=fill_cinza)
txt(wsa, r, 2, "Prontidão geral", font=f_label, fill=fill_cinza)
txt(wsa, r, 3, "", fill=fill_cinza)
calc(wsa, r, 4,
     f'=IFERROR(COUNTIF(D{CHK_INI}:D{CHK_FIM},"Sim")/(COUNTA(D{CHK_INI}:D{CHK_FIM})-COUNTIF(D{CHK_INI}:D{CHK_FIM},"N/A")),0)',
     FMT_PCT)
txt(wsa, r, 5, "", fill=fill_cinza)
txt(wsa, r, 6, "", fill=fill_cinza)
txt(wsa, r, 7, 'Itens "Sim" sobre o total aplicável.', font=f_nota)
r += 1
txt(wsa, r, 1, "", fill=fill_cinza)
txt(wsa, r, 2, "Pendências abertas", font=f_label, fill=fill_cinza)
txt(wsa, r, 3, "", fill=fill_cinza)
calc(wsa, r, 4, f'=COUNTIF(D{CHK_INI}:D{CHK_FIM},"Não")', FMT_NUM)
txt(wsa, r, 5, "", fill=fill_cinza)
txt(wsa, r, 6, "", fill=fill_cinza)
txt(wsa, r, 7, "Itens marcados como Não.", font=f_nota)
r += 2

r = secao(wsa, r, "10.2 SÍNTESE PARA O COMITÊ", 7)
r = cabecalho(wsa, r, ["", "Indicador", "Valor", "", "", "", "Origem"])
sintese = [
    ("Score de priorização", f"='7. Scorecard'!D{L_SC_TOTAL}", FMT_NUM2, "Aba 7"),
    ("Classificação", f"='7. Scorecard'!B{L_SC_CLASSE}", None, "Aba 7"),
    ("Margem de contribuição", f"='5. Custos'!B{P['mcpct']}", FMT_PCT, "Aba 5"),
    ("Veredito de precificação", f"='5. Custos'!B{P['veredito']}", None, "Aba 5"),
    ("Investimento total", f"='6. Viabilidade'!B{INV_TOT}", FMT_BRL0, "Aba 6"),
    ("VPL", f"='6. Viabilidade'!B{L_VPL}", FMT_BRL0, "Aba 6"),
    ("TIR", f"='6. Viabilidade'!B{L_TIR}", FMT_PCT, "Aba 6"),
    ("Payback (anos)", f"='6. Viabilidade'!B{L_PAYBACK}", FMT_NUM2, "Aba 6"),
    ("Riscos críticos ou altos", f"='9. Riscos'!F{L_RSK_ALTOS}", FMT_NUM, "Aba 9"),
    ("Prontidão do checklist", f"=D{L_CHK_PCT}", FMT_PCT, "Aba 10"),
]
for rot, form, fmt, origem in sintese:
    txt(wsa, r, 1, "", fill=fill_claro)
    txt(wsa, r, 2, rot, font=f_label, fill=fill_claro)
    wsa.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
    calc(wsa, r, 3, form, fmt, link=True)
    txt(wsa, r, 7, origem, font=f_nota)
    wsa.row_dimensions[r].height = 22
    r += 1
r += 1

r = secao(wsa, r, "10.3 DECISÃO", 7)
r = cabecalho(wsa, r, ["", "Campo", "Registro", "", "", "", "Observação"])
decisoes = [
    ("Decisão do comitê", "GO | GO condicionado | AJUSTAR e retornar | NO-GO"),
    ("Condicionantes da aprovação", "O que precisa acontecer para o GO se manter válido."),
    ("Data da decisão", "Data da reunião de gate."),
    ("Próximo gate e data prevista", "Quando o projeto volta ao comitê."),
    ("Aprovador — Marketing / Produto", "Nome e data."),
    ("Aprovador — Industrial / P&D", "Nome e data."),
    ("Aprovador — Comercial", "Nome e data."),
    ("Aprovador — Financeiro", "Nome e data."),
    ("Aprovador — Diretoria Executiva", "Nome e data."),
]
for campo_nome, obs in decisoes:
    txt(wsa, r, 1, "", fill=fill_claro)
    txt(wsa, r, 2, campo_nome, font=f_label, fill=fill_claro)
    wsa.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
    inp(wsa, r, 3)
    txt(wsa, r, 7, obs, font=f_nota)
    wsa.row_dimensions[r].height = 24
    r += 1
dv(wsa, '"GO,GO condicionado,AJUSTAR e retornar,NO-GO"', f"C{r-9}")


# ===================================== 1.9 PAINEL CONSOLIDADO (na aba 1)
r = LIN_CONSOL
r = secao(wsb, r, "1.9 PAINEL CONSOLIDADO — CALCULADO PELAS DEMAIS ABAS", 3)
r = cabecalho(wsb, r, ["Indicador", "Valor", "Origem"])
painel = [
    ("SOM — receita capturável no Ano 1",   f"='2. Mercado'!B{L_SOM}",          FMT_BRL0, "Aba 2 · dimensionamento"),
    ("Preço de prateleira alvo",            f"='5. Custos'!B{P['gond']}",       FMT_BRL,  "Aba 5 · precificação"),
    ("Custo industrial unitário (CPV)",     f"='5. Custos'!B{K['cpv']}",        FMT_BRL,  "Aba 5 · ficha de custo"),
    ("· matérias-primas da fórmula",        f"='5. Custos'!C{K['mp']}",         FMT_PCT,  "Aba 5 · participação no CPV"),
    ("· embalagem",                         f"='5. Custos'!C{K['emb']}",        FMT_PCT,  "Aba 5 · participação no CPV"),
    ("· mão de obra direta",                f"='5. Custos'!C{K['mod']}",        FMT_PCT,  "Aba 5 · participação no CPV"),
    ("· gastos gerais de fabricação",       f"='5. Custos'!C{K['ggf']}",        FMT_PCT,  "Aba 5 · participação no CPV"),
    ("· outros custos de produção",         f"='5. Custos'!C{K['out']}",        FMT_PCT,  "Aba 5 · participação no CPV"),
    ("Preço de tabela",                     f"='5. Custos'!B{P['pf']}",         FMT_BRL,  "Aba 5 · impostos de venda"),
    ("Valor total na nota (com IPI e ST)",  f"='5. Custos'!B{L_NOTA}",          FMT_BRL,  "Aba 5 · impostos de venda"),
    ("Margem bruta (%)",                    f"='5. Custos'!B{L_MBP}",           FMT_PCT,  "Aba 5 · margem"),
    ("Margem de contribuição (%)",          f"='5. Custos'!B{P['mcpct']}",      FMT_PCT,  "Aba 5 · precificação"),
    ("Veredito de precificação",            f"='5. Custos'!B{P['veredito']}",   None,     "Aba 5 · regra automática"),
    ("Volume mensal de equilíbrio",         f"='5. Custos'!B{B['beun']}",       FMT_NUM,  "Aba 5 · ponto de equilíbrio"),
    ("Investimento total (Ano 0)",          f"='6. Viabilidade'!B{INV_TOT}",    FMT_BRL0, "Aba 6 · investimento"),
    ("VPL",                                 f"='6. Viabilidade'!B{L_VPL}",      FMT_BRL0, "Aba 6 · indicadores"),
    ("TIR",                                 f"='6. Viabilidade'!B{L_TIR}",      FMT_PCT,  "Aba 6 · indicadores"),
    ("Payback (anos)",                      f"='6. Viabilidade'!B{L_PAYBACK}",  FMT_NUM2, "Aba 6 · indicadores"),
    ("Score de priorização",                f"='7. Scorecard'!D{L_SC_TOTAL}",   FMT_NUM2, "Aba 7 · scorecard"),
    ("Classificação do projeto",            f"='7. Scorecard'!B{L_SC_CLASSE}",  None,     "Aba 7 · scorecard"),
    ("Duração total do cronograma (meses)", f"='8. Cronograma'!E{L_FIM_PROJ+1}", FMT_NUM2, "Aba 8 · cronograma"),
    ("Data prevista de gôndola",            f"='8. Cronograma'!F{L_LANC}",      FMT_DATA, "Aba 8 · cronograma"),
    ("Riscos críticos ou altos",            f"='9. Riscos'!F{L_RSK_ALTOS}",     FMT_NUM,  "Aba 9 · matriz de riscos"),
    ("Prontidão do checklist de gate",      f"='10. Aprovação'!D{L_CHK_PCT}",   FMT_PCT,  "Aba 10 · checklist"),
]
for rot, form, fmt, origem in painel:
    txt(wsb, r, 1, rot, font=f_label, fill=fill_claro)
    calc(wsb, r, 2, form, fmt, link=True)
    txt(wsb, r, 3, origem, font=f_nota)
    wsb.row_dimensions[r].height = 22
    r += 1
r += 1
wsb.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
txt(wsb, r, 1,
    "Este painel é o resumo de uma página do projeto. Se ele não convence em 30 segundos, o projeto ainda não está pronto para o comitê.",
    font=Font(name=FONTE, size=10, italic=True, color=ROSA_ESCURO))
wsb.row_dimensions[r].height = 24


# ---------------- referencia cruzada resolvida no fim (aba 4 -> aba 5)
calc(wse, L_EMB_CUSTO, 7, f"='5. Custos'!J{L_EM_SUB}", FMT_BRL, link=True)
txt(wse, L_EMB_CUSTO, 9, "", fill=fill_cinza)


# ------------------------------------------------------------------ saida
del wb["Sheet"]
wb.active = 0
saida = "briefing_hppc_leite_de_rosas.xlsx"
wb.save(saida)
print("gerado:", saida)
print("abas:", wb.sheetnames)
