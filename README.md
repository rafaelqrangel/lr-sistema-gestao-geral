# Painel de Gestão — Cargos · Pessoas · Processos · Agenda

Ferramenta única, simples e sem servidor para o gestor acompanhar:

- **Arquitetura de cargos** — a tabela-mãe. Cargo e pessoa são entidades
  separadas: o cargo existe independente de quem o ocupa e carrega propósito,
  atribuições núcleo, entregáveis, alçada decisória, requisitos e vínculo.
  Quatro visões: catálogo, **faixas salariais** (aba de acesso restrito, com
  amplitude, ocupantes e média praticada por cargo), **KPIs por cargo** com
  teste de controlabilidade, e **trilha de carreira** em dois eixos (técnico e
  gestão).
- **Pessoas** — quem ocupa cada cargo: vínculo, admissão, tempo de casa,
  salário e sua **posição na faixa**, modelo de variável, gestor direto,
  substituto formal, eixo de carreira e status.
- **Calendário** — a agenda do gestor num lugar só: ocorrências das rotinas,
  prazos finais, férias da equipe, viagens aprovadas e eventos avulsos.
- **Férias** — situação legal por colaborador CLT: período aquisitivo, saldo,
  limite do art. 137 (pagamento em dobro), alertas de risco e agenda de períodos
  com validação de fracionamento (art. 134, §1º) e abono (máx. 10 dias). O campo
  decisivo não é a data: é o **substituto formal**, a **alçada** que ele assume e
  para quem escalona o que exceder. **Regras de bloqueio** detectam ausências
  simultâneas incompatíveis (dois GRs na mesma janela, RGM e ADM juntos).
- **Processos e rotinas** — dono, backup, frequência, entregável, indicador de
  cobrança, meta e criticidade, mais **próxima ocorrência, horário, prazo final
  de execução e antecedência do lembrete**. Cada ocorrência pode registrar uma
  **ata** (pauta, decisões, encaminhamentos, participantes), que vira arquivo
  Markdown versionado no GitHub por processo — pronto para baixar ou copiar e
  enviar aos participantes.
- **Aprovações** — a fila do gestor: viagens, Uber/mobilidade, reembolsos,
  orçamentos, compras e contratos, com prazo de resposta, aprovação/reprovação em
  um clique e histórico. Pedidos que chegam por e-mail entram por
  **Importar de e-mail** (cole o texto da mensagem ou a extração do Copilot);
  rotinas fixas, como a revisão semanal do Uber Business, entram como
  **solicitação recorrente** — ao decidir, a próxima ocorrência agenda sozinha.
- **Performance** — avaliações por ciclo (5 competências + resultado, escala
  1–5), potencial e o 9-box (resultado × potencial) para decisões de promoção,
  desenvolvimento e sucessão.
- **Visão geral** — KPIs (equipe, folha, fila, riscos, rotinas na janela) e
  alertas ordenados por gravidade: férias vencendo, aprovação estourada, rotina
  no lembrete ou fora do prazo, conflito de cobertura de férias, ausência sem
  substituto e KPI cobrado de quem não controla a alavanca.

## Como usar

O produto final é **um único arquivo HTML** (`dist/index.html`): abra no
navegador com duplo clique, guarde no OneDrive/SharePoint ou fixe como guia no
Teams. Não precisa de servidor, login nem instalação.

Os dados ficam salvos no navegador (localStorage). Na aba **Dados & GitHub**:

- **Sincronização com o GitHub** — o repositório passa a guardar `banco.json` e
  o histórico de atas (`gestao/atas/<processo>/<data>-<processo>.md`). Assim o
  painel abre de qualquer máquina, cada ata fica versionada e o backup é
  automático. Requer um *fine-grained PAT* com `Contents: Read and write`
  restrito a um repositório — o token fica só no navegador e nunca entra no
  backup JSON nem nos CSVs. Use repositório **privado**.

- **Backup completo (JSON)** — exporte e guarde no OneDrive; restaure em
  qualquer máquina.
- **CSVs** (cargos, quadro de pessoal, faixas salariais, férias, processos,
  KPIs, atas, aprovações e avaliações) — separador `;`, abrem direto no Excel
  pt-BR e servem de fonte para o **Power BI** (Obter dados → Texto/CSV).

Na primeira abertura é possível carregar a **arquitetura LR Nordeste** — 12
cargos, 13 pessoas, 22 KPIs, trilha de carreira e regras de cobertura já
estruturados, com salários, faixas, datas de admissão e metas em branco para
preenchimento.

### Usar como aplicativo no Mac, sem instalar nada

Com a sincronização ligada, publique o `dist/index.html` numa URL (GitHub Pages
ou OneDrive) e use **Safari → Compartilhar → Adicionar ao Dock**. Vira ícone de
aplicativo com janela própria, sem instalação e sem depender do administrador da
rede. Os dados vêm do GitHub, então a mesma conta abre em qualquer máquina.

### Alimentando as aprovações a partir do e-mail

Em **Aprovações → Importar de e-mail** há duas formas:

1. **Colar o e-mail** — Ctrl+A / Ctrl+C na mensagem do Outlook e colar no
   campo. O painel extrai assunto, solicitante (se estiver no cadastro de
   pessoas), data de envio, período da viagem e valores por heurística.
2. **Via Copilot do Outlook** (mais preciso) — o modal traz um prompt pronto
   com botão *Copiar*: cole no Copilot com o e-mail aberto e traga a resposta
   estruturada de volta para o campo de importação.

Nos dois casos nada é salvo direto: o formulário abre pré-preenchido para
revisão. Para a **revisão semanal do Uber Business**, o botão *↻ Rotina Uber*
cria uma solicitação recorrente com o link do dashboard — guarde apenas o
link no painel, nunca credenciais.

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
  types.ts              # modelo de dados (Cargo, Faixa, Pessoa, Ferias, Processo, Ata, Kpi, Evento…)
  lib/
    datas.ts            # datas ISO locais, prazos, sobreposição
    ferias.ts           # regras CLT: art. 137, fracionamento, conflitos de cobertura
    agenda.ts           # recorrência de processos, lembretes e itens do calendário
    atas.ts             # ata → Markdown, nome de arquivo e texto para e-mail
    github.ts           # API de conteúdo do GitHub (ler/gravar banco e atas)
    migracao.ts         # bancos da v1 (cargo dentro da pessoa) → v2 (cargo separado)
    formato.ts          # moeda, números e ids
    armazenamento.ts    # localStorage + export JSON/CSV + import
    importarEmail.ts    # parser de e-mails/Copilot → aprovação pré-preenchida
    exemplo.ts          # carga inicial: arquitetura de cargos LR Nordeste
  views/                # uma tela por eixo + calendário e dados
  components/ui.tsx     # Badge, Modal, Campo, Abas, ListaTexto, Barras
```

## Avisos

- As regras de férias são um **apoio de gestão**, não parecer jurídico: faltas
  injustificadas (art. 130) não são modeladas — confirme saldos com o RH antes
  de formalizar.
- **KPI só vira cobrança quando a alavanca é do ocupante.** O painel bloqueia a
  combinação inválida e alerta na visão geral: cobrar margem de quem não decide
  preço produz desengajamento, não performance.
- Nomes, cargos e vínculos da carga inicial precisam de conferência junto ao
  RH/folha antes de virar documento oficial — especialmente o vínculo dos RCAs,
  que não entram em faixa salarial CLT.
- Salários e avaliações são dados sensíveis. Sem sincronização, nada sai do
  navegador; com ela ligada, use repositório privado. Trate os exports com o
  mesmo cuidado de uma planilha de RH.
- Quando o time todo precisar editar ao mesmo tempo, o caminho no Microsoft 365
  Business Standard é migrar as tabelas para Listas do SharePoint (o Power BI lê
  direto). A sincronização com o GitHub resolve acesso de várias máquinas por um
  usuário só — não resolve edição simultânea por várias pessoas.
