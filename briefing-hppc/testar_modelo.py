# -*- coding: utf-8 -*-
"""Teste de ponta a ponta do modelo: preenche um cenario, recalcula e confere
cada resultado contra o valor esperado calculado em Python.
Uso: python3 testar_modelo.py  (exige LibreOffice para o recalculo)
"""
import json, shutil, subprocess, sys
from openpyxl import load_workbook

ORIG = "briefing_hppc_leite_de_rosas.xlsx"
COPIA = "/tmp/teste_modelo.xlsx"
RECALC = "/root/.claude/skills/synced/xlsx/scripts/recalc.py"

shutil.copy(ORIG, COPIA)
wb = load_workbook(COPIA)


def linha(ws, rotulo, col=1):
    for row in ws.iter_rows(min_col=col, max_col=col):
        v = row[0].value
        if isinstance(v, str) and v.strip() == rotulo:
            return row[0].row
    raise KeyError(f"{ws.title}: rotulo nao encontrado -> {rotulo}")


b, m, f, e, c, v, s = (wb["1. Briefing"], wb["2. Mercado"], wb["3. Formulação"],
                       wb["4. Embalagem"], wb["5. Custos"], wb["6. Viabilidade"],
                       wb["7. Scorecard"])

# ------------------------------------------------------------------ cenario
b.cell(row=linha(b, "Meta de volume — Ano 1 (un.)"), column=2).value = 600000
b.cell(row=linha(b, "Margem de contribuição-alvo (%)"), column=2).value = 0.35
b.cell(row=linha(b, "Capex máximo autorizado"), column=2).value = 300000

for rot, val in [("População do público-alvo", 30_000_000),
                 ("Penetração da categoria", 0.40),
                 ("Frequência de compra", 2),
                 ("Preço médio de gôndola da categoria", 20.0),
                 ("Cobertura de distribuição alcançável", 0.30),
                 ("Share-alvo dentro do SAM (Ano 1)", 0.02)]:
    m.cell(row=linha(m, rot), column=2).value = val

# regulatorio: 3 itens com custo
reg0 = linha(f, "Enquadramento do grau de risco (1 ou 2)")
for i, val in enumerate([1500, 2500, 4000]):
    f.cell(row=reg0 + i, column=6).value = val
CUSTO_REG = 8000
# testes: catalogo basico (3 variacoes) + dois especificos
NVAR = 3
f.cell(row=linha(f, "Nº de variações de fórmula a testar"), column=2).value = NVAR
BASICOS = [1264.0, 600.0, 1900.0, 1350.0]
CUSTO_BAS = NVAR * sum(BASICOS)
esp_a = linha(f, "Estabilidade acelerada")
esp_b = linha(f, "Teste de uso em casa (HUT)")
f.cell(row=esp_a, column=3).value = 3000.0
f.cell(row=esp_a, column=5).value = 45
f.cell(row=esp_b, column=3).value = 8000.0
f.cell(row=esp_b, column=5).value = 60
CUSTO_ESP = NVAR * (3000.0 + 8000.0)
CUSTO_TST = CUSTO_BAS + CUSTO_ESP

emb0 = linha(e, "Embalagem primária (frasco/pote/bisnaga)")
custos_emb = [0.80, 0.25, 0.00, 0.10, 0.00, 0.12, 0.00, 0.00]
moqs =       [50000, 30000, 0, 20000, 0, 5000, 0, 0]
capex =      [45000, 15000, 0, 0, 0, 0, 0, 0]
for i, (cu, mq, cp) in enumerate(zip(custos_emb, moqs, capex)):
    e.cell(row=emb0 + i, column=7).value = cu
    e.cell(row=emb0 + i, column=5).value = mq
    e.cell(row=emb0 + i, column=8).value = cp
EMB_UNIT = sum(custos_emb)          # 1.27
EMB_CAPEX = sum(capex)              # 60000
EMB_1LOTE = max(moqs) * EMB_UNIT    # 50000 * 1.27

bom0 = linha(c, "[EXEMPLO — apagar] Água")
bom = [("Água", 0.70, 0.02), ("Ativo claim-driver", 0.05, 60.0),
       ("Base emulsionante", 0.22, 4.0), ("Fragrância", 0.03, 90.0)]
for i, (nome, pct, preco) in enumerate(bom):
    c.cell(row=bom0 + i, column=1).value = nome
    c.cell(row=bom0 + i, column=3).value = pct
    c.cell(row=bom0 + i, column=4).value = preco
CUSTO_KG = sum(p * pr for _, p, pr in bom)

GRAM, PERDA, CONV, FRETE = 200.0, 0.03, 0.50, 0.20
c.cell(row=linha(c, "Gramatura líquida por unidade"), column=2).value = GRAM
c.cell(row=linha(c, "Perda de processo e envase"), column=2).value = PERDA
c.cell(row=linha(c, "Custo de conversão por unidade"), column=2).value = CONV
c.cell(row=linha(c, "Frete e armazenagem por unidade"), column=2).value = FRETE

GOND, MKVAR, IMP, DESC = 24.90, 0.40, 0.25, 0.08
c.cell(row=linha(c, "Preço-alvo de gôndola (com impostos)"), column=2).value = GOND
c.cell(row=linha(c, "Margem do varejo sobre o preço de fábrica"), column=2).value = MKVAR
c.cell(row=linha(c, "Carga tributária sobre faturamento"), column=2).value = IMP
c.cell(row=linha(c, "Descontos e verbas comerciais"), column=2).value = DESC
FIXOS, MKTM = 40000, 25000
c.cell(row=linha(c, "Custos fixos incrementais mensais"), column=2).value = FIXOS
c.cell(row=linha(c, "Investimento de marketing mensal"), column=2).value = MKTM

v.cell(row=linha(v, "Outros investimentos no Ano 0"), column=2).value = 50000
G2, G3, PMKT, PCOM, TAXA = 0.25, 0.15, 0.08, 0.06, 0.18

sc0 = linha(s, "Aderência à estratégia e à marca")
notas = [4, 4, 3, 5, 4, 4, 5, 3, 4, 3]
pesos = [0.15, 0.15, 0.15, 0.10, 0.10, 0.08, 0.07, 0.10, 0.05, 0.05]
for i, n in enumerate(notas):
    s.cell(row=sc0 + i, column=3).value = n
SCORE = sum(p * n for p, n in zip(pesos, notas))

wb.save(COPIA)
out = subprocess.run([sys.executable, RECALC, COPIA, "380"], capture_output=True, text=True)
print(out.stdout.strip())
if '"error"' in out.stdout:
    sys.exit(1)

# ---------------------------------------------------------------- esperados
CF = CUSTO_KG * GRAM / 1000 * (1 + PERDA)
CPV = CF + EMB_UNIT + CONV + FRETE
PF = GOND / (1 + MKVAR)
RL = PF * (1 - IMP - DESC)
MC = RL - CPV
MCPCT = MC / RL
PFMIN = CPV / ((1 - 0.35) * (1 - IMP - DESC))
BEUN = (FIXOS + MKTM) / MC
VOL1 = 600000
VOL2, VOL3 = VOL1 * (1 + G2), VOL1 * (1 + G2) * (1 + G3)
INV = EMB_CAPEX + CUSTO_REG + CUSTO_TST + EMB_1LOTE + 50000
res = [(vol * RL) - (vol * CPV) - (vol * RL * PMKT) - (vol * RL * PCOM) for vol in (VOL1, VOL2, VOL3)]
VPL = -INV + sum(r / (1 + TAXA) ** (i + 1) for i, r in enumerate(res))
acum1 = -INV + res[0]
PAYBACK = INV / res[0] if acum1 >= 0 else None

wbv = load_workbook(COPIA, data_only=True)
b2, m2, f2, c2, v2, s2 = (wbv["1. Briefing"], wbv["2. Mercado"], wbv["3. Formulação"],
                          wbv["5. Custos"], wbv["6. Viabilidade"], wbv["7. Scorecard"])

def val(ws, rotulo, col=2):
    return ws.cell(row=linha(ws, rotulo), column=col).value

checks = [
    ("SOM (R$)",                    val(m2, "SOM — receita capturável no Ano 1"), 2_880_000),
    ("SOM (un.)",                   val(m2, "SOM em unidades"), 144_000),
    ("Custo por kg de massa",       c2.cell(row=linha(c2, "Soma da fórmula"), column=5).value, CUSTO_KG),
    ("Custo da fórmula/un.",        val(c2, "Custo da fórmula por unidade"), CF),
    ("Custo embalagem/un. (link)",  val(c2, "Custo de embalagem por unidade"), EMB_UNIT),
    ("CPV unitário",                val(c2, "CUSTO INDUSTRIAL TOTAL (CPV unitário)"), CPV),
    ("Preço de fábrica",            val(c2, "Preço de fábrica implícito"), PF),
    ("Receita líquida/un.",         val(c2, "Receita líquida por unidade"), RL),
    ("MC unitária",                 val(c2, "Margem de contribuição por unidade"), MC),
    ("MC %",                        val(c2, "Margem de contribuição (%)"), MCPCT),
    ("PF mínimo p/ MC alvo",        val(c2, "Preço de fábrica mínimo p/ atingir o alvo"), PFMIN),
    ("Break-even mensal",           val(c2, "Volume mensal de equilíbrio"), BEUN),
    ("Volume Ano 3",                v2.cell(row=linha(v2, "Volume (un.)"), column=5).value, VOL3),
    ("Investimento total",          v2.cell(row=linha(v2, "► Investimento total"), column=2).value, INV),
    ("Resultado contributivo A1",   v2.cell(row=linha(v2, "► Resultado contributivo do projeto"), column=3).value, res[0]),
    ("VPL",                         val(v2, "VPL (Valor Presente Líquido)"), VPL),
    ("Payback (anos)",              val(v2, "Payback (anos)"), PAYBACK),
    ("Testes básicos — subtotal",  f2.cell(row=linha(f2, "Subtotal dos testes básicos"), column=4).value, CUSTO_BAS),
    ("Testes específicos — subtotal", f2.cell(row=linha(f2, "Subtotal dos testes específicos"), column=4).value, CUSTO_ESP),
    ("Plano de testes — custo total", f2.cell(row=linha(f2, "Custo total do plano de testes"), column=2).value, CUSTO_TST),
    ("Custo por variação adicional", f2.cell(row=linha(f2, "Custo de testes por variação adicional"), column=2).value, sum(BASICOS)+11000.0),
    ("Score ponderado",             s2.cell(row=linha(s2, "SCORE PONDERADO (1 a 5)"), column=4).value, SCORE),
    ("Painel: MC % (aba 1)",        val(b2, "Margem de contribuição (%)"), MCPCT),
    ("Painel: VPL (aba 1)",         val(b2, "VPL"), VPL),
]

falhas = 0
print(f"\n{'indicador':32} {'planilha':>16} {'esperado':>16}  ok")
for nome, obtido, esperado in checks:
    ok = obtido is not None and esperado is not None and abs(float(obtido) - float(esperado)) <= max(0.01, abs(esperado) * 1e-6)
    falhas += 0 if ok else 1
    print(f"{nome:32} {float(obtido) if obtido is not None else float('nan'):16,.4f} "
          f"{float(esperado) if esperado is not None else float('nan'):16,.4f}  {'OK' if ok else 'FALHOU'}")

txt_checks = [
    ("Veredito de precificação", val(c2, "Veredito de precificação")),
    ("Classificação (aba 7)",    s2.cell(row=linha(s2, "CLASSIFICAÇÃO"), column=2).value),
    ("Fechamento do BOM",        c2.cell(row=linha(c2, "Validação do fechamento da fórmula"), column=3).value),
    ("Soma dos pesos",           s2.cell(row=linha(s2, "Soma dos pesos"), column=5).value),
    ("Capex x autorizado",       val(v2, "Investimento × capex autorizado")),
    ("Pendência de prazo",       f2.cell(row=linha(f2, "Pendência de prazo"), column=2).value),
]
print()
for nome, valor in txt_checks:
    print(f"{nome:32} -> {valor}")

print(f"\n{len(checks)-falhas}/{len(checks)} verificacoes numericas OK")
sys.exit(1 if falhas else 0)
