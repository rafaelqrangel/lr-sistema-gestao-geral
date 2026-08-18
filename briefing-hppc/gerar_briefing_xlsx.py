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
r = campo(wsb, r, "Código do projeto", "Padrão BRF_<ano>_<nº sequencial>. Ex.: BRF_2026_004.")
LIN_NOME = r
r = campo(wsb, r, "Nome de trabalho", "Nome interno, não é o nome comercial. Ex.: 'Desodorante Creme Sensitive'.")
LIN_MARCA = r
r = campo(wsb, r, "Marca / arquitetura", "Leite de Rosas (extensão), Leite de Rosas sub-marca, marca do portfólio ou marca nova.")
LIN_CATEG = r
r = campo(wsb, r, "Categoria HPPC", "Desodorante, higiene corporal, cuidado facial, cabelos, infantil, perfumaria, higiene íntima etc.")
r = campo(wsb, r, "Tipo de projeto", "Novo produto | Extensão de linha | Renovação de fórmula | Novo tamanho | Restyling de embalagem | Redução de custo.")
r = campo(wsb, r, "Solicitante / área", "Quem abriu a demanda e a área responsável pela defesa do projeto no gate.")
r = campo(wsb, r, "Patrocinador (Diretoria)", "Diretor que responde pelo projeto perante a Diretoria Executiva.")
LIN_DATA_ABERT = r
r = campo(wsb, r, "Data de abertura", "Data em que o briefing foi aberto.", fmt=FMT_DATA)
r = campo(wsb, r, "Gate atual", "G0 Ideia | G1 Conceito | G2 Viabilidade | G3 Desenvolvimento | G4 Industrialização | G5 Lançamento.")
r = campo(wsb, r, "Prioridade declarada", "Alta | Média | Baixa. Prioridade declarada é hipótese; o Scorecard (aba 7) é o que vale.")

r += 1
r = secao(wsb, r, "1.2 CONTEXTO E RACIONAL — POR QUE ESTE PRODUTO, POR QUE AGORA", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Problema ou oportunidade", "Uma frase objetiva. O que existe hoje no mercado ou no consumidor que justifica gastar dinheiro nisso.")
r = campo(wsb, r, "Por que agora", "Gatilho de timing: mudança de hábito, movimento de concorrente, janela de canal, sazonalidade, mudança regulatória.")
r = campo(wsb, r, "Encaixe estratégico", "Como reduz a concentração de faturamento em poucos SKUs, ou como defende o carro-chefe.")
r = campo(wsb, r, "O que acontece se não fizermos", "O custo de não fazer. Se a resposta for 'nada', o projeto provavelmente não deveria existir.")
r = campo(wsb, r, "Alavanca da marca usada", "Que ativo da Leite de Rosas o produto empresta: reconhecimento, território de frescor/cuidado, o rosa, tradição, distribuição.")

r += 1
r = secao(wsb, r, "1.3 OBJETIVO E METAS", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Objetivo do produto (1 frase)", "Comece com um verbo. Ex.: 'Capturar o consumidor de pele sensível que hoje troca a marca por dermocosmético'.")
LIN_META_VOL = r
r = campo(wsb, r, "Meta de volume — Ano 1 (un.)", "Unidades vendidas no primeiro ano cheio. Este número alimenta a aba 6.", fmt=FMT_NUM)
r = campo(wsb, r, "Meta de receita líquida — Ano 1", "Deve bater com o resultado calculado na aba 6. Se não bater, uma das duas premissas está errada.", fmt=FMT_BRL0)
LIN_META_MC = r
r = campo(wsb, r, "Margem de contribuição-alvo (%)", "Piso de margem aceitável para o projeto seguir. Digite como percentual (ex.: 35%).", fmt=FMT_PCT)
r = campo(wsb, r, "Distribuição-alvo (nº de PDVs)", "Pontos de venda ativos ao fim do Ano 1.", fmt=FMT_NUM)

r += 1
r = secao(wsb, r, "1.4 CONSUMIDOR E OCASIÃO DE USO", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Público-alvo primário", "Demografia + comportamento. Demografia sozinha não é público-alvo.")
r = campo(wsb, r, "Público-alvo secundário", "Quem também compra, mas não é para quem a comunicação fala.")
r = campo(wsb, r, "Ocasião e frequência de uso", "Quando, onde, quantas vezes. Define tamanho de embalagem e giro.")
r = campo(wsb, r, "Dor / tensão do consumidor", "A frustração real com as soluções atuais, na linguagem do consumidor.")
r = campo(wsb, r, "Insight", "A verdade não óbvia que conecta a dor ao produto. Se soa como slogan, ainda não é insight.")
r = campo(wsb, r, "Barreira de adoção esperada", "Preço, ceticismo quanto ao benefício, hábito consolidado, percepção de marca. E como derrubar.")

r += 1
r = secao(wsb, r, "1.5 CONCEITO DE PRODUTO", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Conceito em uma frase", "O que é, para quem, e o que entrega de diferente. Uma frase, sem adjetivo vazio.")
r = campo(wsb, r, "Benefício principal", "Um só. O que o consumidor lembraria 3 dias depois.")
r = campo(wsb, r, "Benefícios secundários", "No máximo dois. O terceiro dilui os outros.")
r = campo(wsb, r, "Reason to believe (RTB)", "Por que acreditar: ativo, concentração, tecnologia, teste comprobatório, 96 anos de marca.")
r = campo(wsb, r, "Ativos / ingredientes-chave", "Nome INCI e função. Marcar o que for claim-driver, pois exige comprovação.")
r = campo(wsb, r, "Claims pretendidos", "Liste separando os claims de rotulagem dos claims publicitários. Cada um precisa de lastro (aba 3).")
r = campo(wsb, r, "Sensorial alvo", "Textura, absorção, toque residual, cor, fragrância e intensidade.")
r = campo(wsb, r, "Tamanhos / apresentações", "Grama­tura(s) e por que essa(s). Amarrar com ocasião de uso e preço de gôndola.")
r = campo(wsb, r, "Produto de referência (benchmark)", "O produto que o consumidor usaria no lugar deste. Serve de âncora sensorial e de preço.")
r = campo(wsb, r, "O que este produto NÃO é", "Delimitação explícita. Evita que o escopo cresça no meio do desenvolvimento.")

r += 1
r = secao(wsb, r, "1.6 POSICIONAMENTO, PREÇO E CANAL", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Posicionamento em uma frase", "Para <público>, <produto> é a <categoria> que <benefício> porque <RTB>.")
r = campo(wsb, r, "Faixa de preço pretendida", "Popular | Mainstream | Premium acessível | Premium. Coerente com marca e canal.")
r = campo(wsb, r, "Canal prioritário", "Farma | Atacarejo | Supermercado | Varejo tradicional | Distribuidor | E-commerce/marketplace | Perfumaria.")
r = campo(wsb, r, "Canais secundários", "Onde entra depois, e em que ordem.")
r = campo(wsb, r, "Regiões prioritárias", "Onde a distribuição já é forte tende a ser onde o lançamento custa menos.")
r = campo(wsb, r, "Risco de canibalização", "Quais SKUs próprios podem perder volume, e qual perda é aceitável.")

r += 1
r = secao(wsb, r, "1.7 RESTRIÇÕES E CONDIÇÕES DE CONTORNO", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "Make or buy", "Produção interna | Terceirização (co-packer) | Híbrido. Terceirizar preserva caixa e acelera; interna dilui fixo.")
LIN_CAPEX_MAX = r
r = campo(wsb, r, "Capex máximo autorizado", "Teto de investimento em ativo e ferramental. Confrontar com a aba 6.", fmt=FMT_BRL0)
r = campo(wsb, r, "Prazo máximo até o lançamento", "Em meses. Confrontar com o cronograma da aba 8.")
r = campo(wsb, r, "Restrições fabris / logísticas", "Limitações de linha, envase, capacidade, paletização, armazenagem.")
r = campo(wsb, r, "Restrições regulatórias", "Grau de risco, exigência de registro ou notificação, claims que demandam comprovação.")
r = campo(wsb, r, "Restrições de marca / jurídico", "Registro de marca, colidência, uso do rosa institucional, trade dress.")

r += 1
r = secao(wsb, r, "1.8 MÉTRICAS DE SUCESSO E CRITÉRIO DE MORTE", 3)
r = cabecalho(wsb, r, ["Campo", "Resposta", "Orientação de preenchimento"])
r = campo(wsb, r, "KPI primário", "Uma métrica só. Ex.: unidades/mês no 6º mês; margem de contribuição %; nº de PDVs ativos.")
r = campo(wsb, r, "KPIs secundários", "No máximo três, com meta numérica e data.")
r = campo(wsb, r, "Critério de kill", "A condição objetiva que encerra o projeto. Definida antes, não depois. Ex.: 'MC < 25% no teste de custo real'.")
r = campo(wsb, r, "Data da primeira revisão", "Quando o time volta a olhar os KPIs com o produto na rua.", fmt=FMT_DATA)

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

r = secao(wse, r, "4.1 ESTRUTURA DE EMBALAGEM E CUSTO POR UNIDADE", 9)
r = cabecalho(wse, r, [
    "Componente", "Material", "Especificação", "Fornecedor", "MOQ (un.)",
    "Lead time (dias)", "Custo unit. (R$)", "Ferramental / capex (R$)", "Un. por caixa",
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
    inp(wse, r, 7, fmt=FMT_BRL)
    inp(wse, r, 8, fmt=FMT_BRL0)
    inp(wse, r, 9, fmt=FMT_NUM)
    wse.row_dimensions[r].height = 24
    r += 1
EMB_FIM = r - 1

L_EMB_CUSTO = r
txt(wse, r, 1, "Custo de embalagem por unidade", font=f_label, fill=fill_cinza)
for c in range(2, 7):
    txt(wse, r, c, "", fill=fill_cinza)
calc(wse, r, 7, f"=SUM(G{EMB_INI}:G{EMB_FIM})", FMT_BRL)
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
    "5. Custos", [36, 26, 14, 16, 20, 20, 34],
    "5 · CUSTO INDUSTRIAL E PRECIFICAÇÃO",
    "Do BOM ao preço de gôndola. Toda célula preta é fórmula — mexer nelas quebra a cadeia de cálculo até a aba 6.",
)

r = secao(wsc, r, "5.1 BOM DA FÓRMULA (BASE 100% DA MASSA)", 7)
r = cabecalho(wsc, r, [
    "Matéria-prima", "Função / INCI", "% na fórmula", "Preço (R$/kg)",
    "Custo por kg de massa (R$)", "Fornecedor", "Observação",
])
BOM_INI = r
BOM_FIM = r + 13
for i in range(BOM_INI, BOM_FIM + 1):
    if i == BOM_INI:
        inp(wsc, i, 1, "[EXEMPLO — apagar] Água")
        inp(wsc, i, 2, "Aqua — veículo")
        inp(wsc, i, 3, 0.70, FMT_PCT)
        inp(wsc, i, 4, 0.02, FMT_BRL)
    else:
        inp(wsc, i, 1)
        inp(wsc, i, 2)
        inp(wsc, i, 3, fmt=FMT_PCT)
        inp(wsc, i, 4, fmt=FMT_BRL)
    calc(wsc, i, 5, f'=IF(OR(C{i}="",D{i}=""),"",C{i}*D{i})', FMT_BRL)
    inp(wsc, i, 6)
    inp(wsc, i, 7)
    wsc.row_dimensions[i].height = 22
r = BOM_FIM + 1

L_BOM_PCT = r
txt(wsc, r, 1, "Soma da fórmula", font=f_label, fill=fill_cinza)
txt(wsc, r, 2, "", fill=fill_cinza)
calc(wsc, r, 3, f"=SUM(C{BOM_INI}:C{BOM_FIM})", FMT_PCT)
txt(wsc, r, 4, "", fill=fill_cinza)
L_BOM_KG = r
calc(wsc, r, 5, f"=SUM(E{BOM_INI}:E{BOM_FIM})", FMT_BRL)
txt(wsc, r, 6, "", fill=fill_cinza)
txt(wsc, r, 7, "Custo de 1 kg de massa pronta.", font=f_nota)
r += 1
txt(wsc, r, 1, "Validação do fechamento da fórmula", font=f_label, fill=fill_cinza)
txt(wsc, r, 2, "", fill=fill_cinza)
calc(wsc, r, 3, f'=IF(ABS(C{L_BOM_PCT}-1)<0.0001,"OK — fecha 100%","AJUSTAR — não fecha 100%")')
txt(wsc, r, 4, "", fill=fill_cinza)
txt(wsc, r, 5, "", fill=fill_cinza)
txt(wsc, r, 6, "", fill=fill_cinza)
txt(wsc, r, 7, "Enquanto não fechar 100%, o custo por kg está subestimado ou superestimado.", font=f_nota)
r += 2


def bloco(ws, linha, titulo, itens, ncols=7):
    """itens: (rotulo, formula|None, unidade, formato, nota, link)"""
    linha = secao(ws, linha, titulo, ncols)
    linha = cabecalho(ws, linha, ["Item", "Valor", "Unidade", "Comentário", "", "", ""])
    refs = {}
    for chave, rot, form, uni, fmt, nota, is_link in itens:
        txt(ws, linha, 1, rot, font=f_label, fill=fill_claro)
        if form is None:
            inp(ws, linha, 2, None, fmt)
        else:
            calc(ws, linha, 2, form, fmt, link=is_link)
        txt(ws, linha, 3, uni, font=f_nota)
        ws.merge_cells(start_row=linha, start_column=4, end_row=linha, end_column=ncols)
        txt(ws, linha, 4, nota, font=f_nota)
        ws.row_dimensions[linha].height = 24
        refs[chave] = linha
        linha += 1
    return linha + 1, refs


# --------------------------------------------------- 5.2 custo industrial
base = r
K = {}
itens_custo = [
    ("gram",   "Gramatura líquida por unidade",            None, "g ou ml", FMT_NUM2, "Conteúdo declarado no rótulo.", False),
    ("perda",  "Perda de processo e envase",               None, "%",       FMT_PCT,  "Quebra, sobre-enchimento e resíduo de linha. Se não medir, use o histórico da linha.", False),
    ("cf",     "Custo da fórmula por unidade",             None, "R$/un.",  FMT_BRL,  "", False),
    ("ce",     "Custo de embalagem por unidade",           None, "R$/un.",  FMT_BRL,  "", False),
    ("conv",   "Custo de conversão por unidade",           None, "R$/un.",  FMT_BRL,  "Mão de obra direta, energia e overhead de linha. Se for terceirizado, use a taxa do co-packer.", False),
    ("frete",  "Frete e armazenagem por unidade",          None, "R$/un.",  FMT_BRL,  "Custo logístico até o cliente, se for por nossa conta.", False),
    ("cpv",    "CUSTO INDUSTRIAL TOTAL (CPV unitário)",    None, "R$/un.",  FMT_BRL,  "", False),
]
r, K = bloco(wsc, r, "5.2 CUSTO INDUSTRIAL UNITÁRIO", itens_custo)

calc(wsc, K["cf"], 2,
     f"=IFERROR(E{L_BOM_KG}*B{K['gram']}/1000*(1+B{K['perda']}),0)", FMT_BRL)
wsc.cell(row=K["cf"], column=4).value = "Calculado: custo por kg de massa × gramatura ÷ 1000 × (1 + perda)."
calc(wsc, K["ce"], 2, f"='4. Embalagem'!G{L_EMB_CUSTO}", FMT_BRL, link=True)
wsc.cell(row=K["ce"], column=4).value = "Puxado da aba 4 (soma dos componentes de embalagem)."
calc(wsc, K["cpv"], 2,
     f"=B{K['cf']}+B{K['ce']}+B{K['conv']}+B{K['frete']}", FMT_BRL)
wsc.cell(row=K["cpv"], column=4).value = "Calculado: fórmula + embalagem + conversão + frete. É a base de toda a precificação abaixo."
wsc.cell(row=K["cpv"], column=1).fill = PatternFill("solid", fgColor=ROSA_CLARO)

# ------------------------------------------------------- 5.3 precificacao
itens_preco = [
    ("gond",     "Preço-alvo de gôndola (com impostos)",     None, "R$/un.", FMT_BRL, "Ancorado no benchmark da aba 2. Comece pelo que o consumidor aceita pagar, não pelo custo.", False),
    ("mkvar",    "Margem do varejo sobre o preço de fábrica", None, "%",     FMT_PCT, "Quanto o cliente marca em cima. Varia por canal — atacarejo e farma são muito diferentes.", False),
    ("pf",       "Preço de fábrica implícito",               None, "R$/un.", FMT_BRL, "", False),
    ("imp",      "Carga tributária sobre faturamento",       None, "%",      FMT_PCT, "Soma dos tributos incidentes sobre a venda. Confirmar com a Contabilidade o regime aplicável.", False),
    ("desc",     "Descontos e verbas comerciais",            None, "%",      FMT_PCT, "Bonificação, verba de encarte, rebate, devolução. Costuma ser o vazamento invisível da margem.", False),
    ("rl",       "Receita líquida por unidade",              None, "R$/un.", FMT_BRL, "", False),
    ("mc",       "Margem de contribuição por unidade",       None, "R$/un.", FMT_BRL, "", False),
    ("mcpct",    "Margem de contribuição (%)",               None, "%",      FMT_PCT, "", False),
    ("markup",   "Markup sobre o custo industrial",          None, "x",      '0.00"x"', "", False),
    ("mcalvo",   "Margem de contribuição-alvo (briefing)",   None, "%",      FMT_PCT, "", True),
    ("pfmin",    "Preço de fábrica mínimo p/ atingir o alvo", None, "R$/un.", FMT_BRL, "", False),
    ("gondmin",  "Preço de gôndola mínimo p/ atingir o alvo", None, "R$/un.", FMT_BRL, "", False),
    ("veredito", "Veredito de precificação",                 None, "",       None,     "", False),
]
r, P = bloco(wsc, r, "5.3 PRECIFICAÇÃO E MARGEM", itens_preco)

calc(wsc, P["pf"], 2, f"=IFERROR(B{P['gond']}/(1+B{P['mkvar']}),0)", FMT_BRL)
wsc.cell(row=P["pf"], column=4).value = "Calculado: preço de gôndola ÷ (1 + margem do varejo)."
calc(wsc, P["rl"], 2, f"=IFERROR(B{P['pf']}*(1-B{P['imp']}-B{P['desc']}),0)", FMT_BRL)
wsc.cell(row=P["rl"], column=4).value = "Calculado: preço de fábrica × (1 − impostos − descontos)."
calc(wsc, P["mc"], 2, f"=B{P['rl']}-B{K['cpv']}", FMT_BRL)
wsc.cell(row=P["mc"], column=4).value = "Calculado: receita líquida − custo industrial total."
calc(wsc, P["mcpct"], 2, f'=IF(B{P["rl"]}=0,0,B{P["mc"]}/B{P["rl"]})', FMT_PCT)
wsc.cell(row=P["mcpct"], column=4).value = "Calculado: margem de contribuição ÷ receita líquida. É o número que a Diretoria olha primeiro."
calc(wsc, P["markup"], 2, f'=IF(B{K["cpv"]}=0,0,B{P["pf"]}/B{K["cpv"]})', '0.00"x"')
wsc.cell(row=P["markup"], column=4).value = "Calculado: preço de fábrica ÷ custo industrial."
calc(wsc, P["mcalvo"], 2, f"='1. Briefing'!B{LIN_META_MC}", FMT_PCT, link=True)
wsc.cell(row=P["mcalvo"], column=4).value = "Puxado da aba 1 (célula 1.3)."
calc(wsc, P["pfmin"], 2,
     f'=IFERROR(B{K["cpv"]}/((1-B{P["mcalvo"]})*(1-B{P["imp"]}-B{P["desc"]})),0)', FMT_BRL)
wsc.cell(row=P["pfmin"], column=4).value = "Calculado: custo industrial ÷ [(1 − MC alvo) × (1 − impostos − descontos)]. Abaixo disso, o projeto não entrega a margem prometida."
calc(wsc, P["gondmin"], 2, f"=IFERROR(B{P['pfmin']}*(1+B{P['mkvar']}),0)", FMT_BRL)
wsc.cell(row=P["gondmin"], column=4).value = "Calculado: preço de fábrica mínimo × (1 + margem do varejo). Compare com o benchmark da aba 2: se estourar o teto da categoria, o problema é de custo, não de preço."
calc(wsc, P["veredito"], 2,
     f'=IF(B{P["rl"]}=0,"Preencha as premissas",'
     f'IF(B{P["mcpct"]}>=B{P["mcalvo"]},"APROVADO — margem acima do alvo",'
     f'IF(B{P["mcpct"]}>=B{P["mcalvo"]}*0.9,"ATENÇÃO — até 10% abaixo do alvo","REPROVADO — margem insuficiente")))')
wsc.cell(row=P["veredito"], column=4).value = "Regra automática comparando a margem calculada com a margem-alvo do briefing."
wsc.cell(row=P["veredito"], column=1).fill = PatternFill("solid", fgColor=ROSA_CLARO)

# ---------------------------------------------------------- 5.4 equilibrio
itens_be = [
    ("fixos",  "Custos fixos incrementais mensais",   None, "R$/mês", FMT_BRL0, "Só o que o projeto adiciona: pessoas, aluguel de linha, sistema, depreciação do ferramental.", False),
    ("mkt",    "Investimento de marketing mensal",    None, "R$/mês", FMT_BRL0, "Mídia, trade, degustação, encarte, ativação.", False),
    ("total",  "Compromisso fixo mensal total",       None, "R$/mês", FMT_BRL0, "", False),
    ("beun",   "Volume mensal de equilíbrio",         None, "un./mês", FMT_NUM, "", False),
    ("bereal", "Volume mensal previsto (Ano 1)",      None, "un./mês", FMT_NUM, "", True),
    ("folga",  "Folga sobre o ponto de equilíbrio",   None, "%",       FMT_PCT, "", False),
]
r, B = bloco(wsc, r, "5.4 PONTO DE EQUILÍBRIO", itens_be)
calc(wsc, B["total"], 2, f"=B{B['fixos']}+B{B['mkt']}", FMT_BRL0)
wsc.cell(row=B["total"], column=4).value = "Calculado: fixos + marketing."
calc(wsc, B["beun"], 2, f'=IF(B{P["mc"]}<=0,0,B{B["total"]}/B{P["mc"]})', FMT_NUM)
wsc.cell(row=B["beun"], column=4).value = "Calculado: compromisso fixo ÷ margem de contribuição unitária. Quantas unidades por mês só para empatar."
calc(wsc, B["bereal"], 2, f"=IFERROR('1. Briefing'!B{LIN_META_VOL}/12,0)", FMT_NUM, link=True)
wsc.cell(row=B["bereal"], column=4).value = "Puxado da aba 1: meta de volume do Ano 1 ÷ 12."
calc(wsc, B["folga"], 2, f'=IF(B{B["beun"]}=0,0,B{B["bereal"]}/B{B["beun"]}-1)', FMT_PCT)
wsc.cell(row=B["folga"], column=4).value = "Calculado: volume previsto ÷ volume de equilíbrio − 1. Negativo significa que a meta não cobre nem o ponto de equilíbrio."

# ------------------------------------------------------- 5.5 sensibilidade
r = secao(wsc, r, "5.5 SENSIBILIDADE DE PREÇO E CUSTO", 7)
r = cabecalho(wsc, r, [
    "Cenário", "Variação no preço de gôndola", "Variação no custo industrial",
    "Preço de gôndola (R$)", "Receita líquida (R$)", "MC unitária (R$)", "MC (%)",
])
SENS_INI = r
cenarios = [
    ("Estresse duplo", -0.10, 0.10),
    ("Preço sob pressão", -0.10, 0.00),
    ("Custo sob pressão", 0.00, 0.10),
    ("Base", 0.00, 0.00),
    ("Cenário favorável", 0.05, -0.05),
]
for nome, dp, dc in cenarios:
    txt(wsc, r, 1, nome, font=f_label, fill=fill_claro)
    inp(wsc, r, 2, dp, FMT_PCT)
    inp(wsc, r, 3, dc, FMT_PCT)
    calc(wsc, r, 4, f"=IFERROR($B${P['gond']}*(1+B{r}),0)", FMT_BRL)
    calc(wsc, r, 5, f"=IFERROR(D{r}/(1+$B${P['mkvar']})*(1-$B${P['imp']}-$B${P['desc']}),0)", FMT_BRL)
    calc(wsc, r, 6, f"=IFERROR(E{r}-$B${K['cpv']}*(1+C{r}),0)", FMT_BRL)
    calc(wsc, r, 7, f'=IF(E{r}=0,0,F{r}/E{r})', FMT_PCT)
    wsc.row_dimensions[r].height = 22
    r += 1
SENS_FIM = r - 1
txt(wsc, r, 1, "Pior margem entre os cenários", font=f_label, fill=fill_cinza)
for c in range(2, 7):
    txt(wsc, r, c, "", fill=fill_cinza)
calc(wsc, r, 7, f"=IFERROR(MIN(G{SENS_INI}:G{SENS_FIM}),0)", FMT_PCT)
r += 1
txt(wsc, r, 1, "Leitura", font=f_label, fill=fill_cinza)
wsc.merge_cells(start_row=r, start_column=2, end_row=r, end_column=7)
txt(wsc, r, 2,
    "Se a margem no cenário de estresse duplo já fica abaixo do alvo, o projeto não tem folga para negociar preço com o varejo "
    "nem para absorver aumento de matéria-prima. Em caixa curto, projeto sem folga vira prejuízo no primeiro reajuste.",
    font=f_nota)
wsc.row_dimensions[r].height = 32


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
linha_ano(MCT, "► Margem de contribuição", None,
          f"=C{RLIQ}+C{CPVT}", f"=D{RLIQ}+D{CPVT}", f"=E{RLIQ}+E{CPVT}",
          FMT_BRL0, "Receita líquida − custo industrial.", destaque=True)
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
    ("Margem de contribuição consolidada — Ano 1",
     f'=IF(C{RLIQ}=0,0,C{MCT}/C{RLIQ})', FMT_PCT,
     "Deve bater com a margem unitária da aba 5. Divergência indica premissa inconsistente."),
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
    ("Aderência à estratégia e à marca", 0.15,
     "5 = usa o território da Leite de Rosas sem forçar. 1 = marca não tem autoridade nenhuma nessa promessa."),
    ("Tamanho da oportunidade (SOM)", 0.15,
     "Ancorar no SOM da aba 2. 5 = move o ponteiro do faturamento. 1 = nicho que não paga o esforço."),
    ("Margem de contribuição", 0.15,
     "Ancorar no percentual da aba 5. 5 = bem acima da margem média da casa. 1 = abaixo do alvo."),
    ("Investimento requerido (quanto menor, melhor)", 0.10,
     "5 = quase sem capex, roda em ativo existente ou terceirizado. 1 = exige linha nova."),
    ("Velocidade até o mercado", 0.10,
     "5 = na gôndola em até 6 meses. 1 = mais de 18 meses."),
    ("Complexidade técnica e regulatória (quanto menor, melhor)", 0.08,
     "5 = fórmula conhecida, grau de risco 1. 1 = tecnologia nova e registro exigido."),
    ("Sinergia fabril e logística", 0.07,
     "5 = mesma linha, mesmo fornecedor, mesma caixa. 1 = tudo novo."),
    ("Força do conceito para o consumidor", 0.10,
     "Ancorar em teste de conceito. 5 = intenção de compra alta e benefício claro. 1 = ninguém entendeu."),
    ("Baixo risco de canibalização (quanto menor, melhor)", 0.05,
     "5 = volume vem de fora da casa. 1 = tira volume direto do carro-chefe."),
    ("Sustentabilidade da vantagem", 0.05,
     "5 = difícil de copiar em 12 meses. 1 = concorrente replica em um trimestre."),
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
     f'=IF(COUNT(C{SC_INI}:C{SC_FIM})<10,"Incompleto — pontue todos os critérios",'
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
    ("Preço de gôndola alvo",               f"='5. Custos'!B{P['gond']}",       FMT_BRL,  "Aba 5 · precificação"),
    ("Custo industrial unitário",           f"='5. Custos'!B{K['cpv']}",        FMT_BRL,  "Aba 5 · BOM e conversão"),
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


# ------------------------------------------------------------------ saida
del wb["Sheet"]
wb.active = 0
saida = "briefing_hppc_leite_de_rosas.xlsx"
wb.save(saida)
print("gerado:", saida)
print("abas:", wb.sheetnames)
