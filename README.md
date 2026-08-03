# Painel de Gestão — Pessoas · Processos · Performance

Ferramenta única, simples e sem servidor para o gestor acompanhar:

- **Pessoas** — cadastro da equipe: cargo, nível, regime, salário, admissão,
  gestor direto, atribuições e status (ativo, férias, afastado, desligado).
- **Férias** — situação legal por colaborador CLT: período aquisitivo, saldo,
  limite do art. 137 (pagamento em dobro), alertas de risco e agenda de períodos
  com validação de fracionamento (art. 134, §1º) e abono (máx. 10 dias).
- **Processos** — o mapa de rotinas: dono, backup, frequência, entregável,
  indicador de cobrança, meta, criticidade e status. Aponta processo crítico sem
  backup e alta criticidade sem documentação (POP).
- **Aprovações** — a fila do gestor: viagens, Uber/mobilidade, reembolsos,
  orçamentos, compras e contratos, com prazo de resposta, aprovação/reprovação em
  um clique e histórico.
- **Performance** — avaliações por ciclo (5 competências + resultado, escala
  1–5), potencial e o 9-box (resultado × potencial) para decisões de promoção,
  desenvolvimento e sucessão.
- **Visão geral** — KPIs (equipe, folha, fila, riscos) e alertas ordenados por
  gravidade.

## Como usar

O produto final é **um único arquivo HTML** (`dist/index.html`): abra no
navegador com duplo clique, guarde no OneDrive/SharePoint ou fixe como guia no
Teams. Não precisa de servidor, login nem instalação.

Os dados ficam salvos no navegador (localStorage). Na aba **Dados & Power BI**:

- **Backup completo (JSON)** — exporte e guarde no OneDrive; restaure em
  qualquer máquina.
- **5 CSVs** (pessoas, férias, processos, aprovações, avaliações) — separador
  `;`, abrem direto no Excel pt-BR e servem de fonte para o **Power BI**
  (Obter dados → Texto/CSV).

Na primeira abertura é possível carregar **dados de exemplo** para explorar.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local com hot reload
npm run build      # gera dist/index.html (arquivo único)
npm run typecheck  # verificação de tipos
```

Stack: Vite + React + TypeScript, sem backend e sem dependências de runtime além
do React. O plugin `vite-plugin-singlefile` embute JS e CSS no HTML final.

## Estrutura

```
src/
  types.ts              # modelo de dados (Pessoa, Ferias, Processo, Aprovacao, Avaliacao)
  lib/
    datas.ts            # datas ISO locais, prazos, sobreposição
    ferias.ts           # regras CLT: períodos aquisitivos, art. 137, fracionamento
    formato.ts          # moeda, números e ids
    armazenamento.ts    # localStorage + export JSON/CSV + import
    exemplo.ts          # dados de demonstração (datas relativas ao dia)
  views/                # uma tela por eixo + dados
  components/ui.tsx     # Badge, Modal, Campo, Barras
```

## Avisos

- As regras de férias são um **apoio de gestão**, não parecer jurídico: faltas
  injustificadas (art. 130) não são modeladas — confirme saldos com o RH antes
  de formalizar.
- Salários e avaliações são dados sensíveis; o painel não envia nada para a
  internet, mas trate exports com o mesmo cuidado de uma planilha de RH.
- Quando precisar de multiusuário, o caminho natural no Microsoft 365 Business
  Standard é migrar as tabelas para Listas do SharePoint (o Power BI lê direto).
