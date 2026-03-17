import {
  SidePanel,
  Container,
  Text,
  Button,
  Toast,
  ContextStore,
  __dayjs,
} from '../libs/nofbiz/nofbiz.base.js';

import { STATUS, STATUS_FLOW, statusLabel, chipClass } from './status-helpers.js';
import { transitionStatus } from './iniciativas-api.js';
import { getAssignedMentor, getAssignedGestor } from './routing-rules.js';

/**
 * Builds and opens a SidePanel showing full detail for an initiative.
 *
 * @param {Object} initiative - The initiative data object from the list
 * @param {string} context - The context from which the panel is opened ('pessoal', 'mentoria', 'gestor', 'catalogo')
 * @returns {SidePanel} The panel instance (for cleanup in route teardown)
 */
export function openInitiativeDetail(initiative, context) {
  const user = ContextStore.get('currentUser');
  const currentEmail = user.get('email');
  const isOwner = initiative.CreatedByEmail === currentEmail || initiative.SubmittedByEmail === currentEmail;
  const status = initiative.Status;

  // -- Header chips --
  const headerChips = [
    new Text(initiative.Code || '', { type: 'span', class: 'pace-chip pace-chip--active pace-detail-code' }),
    new Text(statusLabel(status), { type: 'span', class: `pace-chip ${chipClass(status)}` }),
    new Text(initiative.ImpactedTeamOUID || '', { type: 'span', class: 'pace-chip pace-chip--inactive' }),
  ];

  if (initiative.Confidential === true || initiative.Confidential === 'true') {
    headerChips.push(new Text('Confidencial', { type: 'span', class: 'pace-chip pace-chip--conf' }));
  }

  const header = new Container([
    new Container(headerChips, { class: 'pace-detail-chips' }),
    new Text(initiative.Title || 'Sem titulo', { type: 'h2', class: 'pace-detail-title' }),
  ], { class: 'pace-detail-header' });

  // -- Dados Gerais grid --
  const mentor = getAssignedMentor(initiative.ImpactedTeamOUID);
  const gestor = getAssignedGestor(
    initiative.SavingType || 'Sem saving',
    initiative.SavingsValue || '0',
    initiative.ImpactedTeamOUID
  );
  const createdDate = initiative.Created
    ? __dayjs(initiative.Created).format('DD/MM/YYYY')
    : '-';

  const dadosPairs = [
    ['Colaborador', initiative.CreatedByName || '-'],
    ['Equipa', initiative.ImpactedTeamOUID || '-'],
    ['Mentor Responsavel', mentor ? mentor.displayName : '-'],
    ['Data Submissao', createdDate],
    ['Gestor Validador', gestor ? gestor.displayName : '-'],
    ['Routing', buildRoutingText(initiative)],
  ];
  if (initiative.ImplementedDate) {
    dadosPairs.push(['Data Implementacao', __dayjs(initiative.ImplementedDate).format('DD/MM/YYYY')]);
  }

  const dadosGerais = new Container([
    new Text('Dados Gerais', { type: 'h3', class: 'pace-sec-title' }),
    buildInfoGrid(dadosPairs),
  ]);

  // -- Description, Problem, Objective --
  const sections = [];
  if (initiative.Description) {
    sections.push(buildTextSection('Descricao', initiative.Description));
  }
  if (initiative.Problem) {
    sections.push(buildTextSection('Problema / Oportunidade', initiative.Problem));
  }
  if (initiative.Objective) {
    sections.push(buildTextSection('Objectivo', initiative.Objective));
  }

  // -- Savings section --
  const savingType = initiative.SavingType || 'Sem saving';
  if (savingType !== 'Sem saving') {
    const savingValue = initiative.SavingsValue || '-';
    sections.push(new Container([
      new Text('Savings', { type: 'h3', class: 'pace-sec-title' }),
      buildInfoGrid([
        ['Tipo', savingType],
        ['Valor Estimado', typeof savingValue === 'number' ? `${savingValue} EUR` : savingValue],
      ]),
    ]));
  }

  // -- Progress timeline (skip for catalogo -- terminal-state items only) --
  let progress;
  if (context !== 'catalogo') {
    const progressSteps = STATUS_FLOW.map((stepStatus, i) => {
      const currentIndex = STATUS_FLOW.indexOf(status);
      let dotClass = 'pace-flow-dot';
      if (i < currentIndex) dotClass += ' pace-flow-dot--done';
      else if (i === currentIndex) dotClass += ' pace-flow-dot--active';

      const connectorClass = i < currentIndex
        ? 'pace-flow-connector pace-flow-connector--done'
        : 'pace-flow-connector';

      const step = new Container([
        new Container([
          new Text(String(i + 1), { type: 'span' }),
        ], { class: dotClass }),
        new Text(statusLabel(stepStatus), { type: 'span', class: 'pace-flow-label' }),
      ], { class: 'pace-flow-step' });

      if (i < STATUS_FLOW.length - 1) {
        return new Container([
          step,
          new Container([], { class: connectorClass }),
        ], { as: 'span', class: 'pace-flow-step-wrap' });
      }
      return step;
    });

    progress = new Container([
      new Text('Progresso', { type: 'h3', class: 'pace-sec-title' }),
      new Container(progressSteps, { class: 'pace-flow' }),
    ]);
  }

  // -- Content --
  const content = new Container([
    header,
    dadosGerais,
    ...sections,
    ...(progress ? [progress] : []),
  ], { class: 'pace-detail-content' });

  // -- Footer action buttons --
  const footerButtons = buildActionButtons(initiative, context, isOwner, status);

  const footer = footerButtons.length > 0
    ? new Container(footerButtons, { class: 'pace-detail-footer' })
    : undefined;

  // -- Create and open panel --
  const panel = new SidePanel({
    title: initiative.Code || 'Detalhe da Iniciativa',
    content,
    footer,
    width: '540px',
    closeOnFocusLoss: true,
  });
  panel.render();
  panel.open();
  return panel;
}


// -- Helper: info grid (key-value pairs) --
function buildInfoGrid(pairs) {
  const rows = pairs.map(([label, value]) =>
    new Container([
      new Text(label, { type: 'span', class: 'pace-detail-label' }),
      new Text(String(value), { type: 'span', class: 'pace-detail-value' }),
    ], { class: 'pace-detail-row' })
  );
  return new Container(rows, { class: 'pace-detail-grid' });
}

// -- Helper: text section --
function buildTextSection(title, text) {
  return new Container([
    new Text(title, { type: 'h3', class: 'pace-sec-title' }),
    new Text(text, { type: 'p', class: 'pace-detail-text' }),
  ]);
}

// -- Helper: routing description text --
function buildRoutingText(initiative) {
  const savingType = initiative.SavingType || 'Sem saving';
  if (savingType === 'Sem saving') return 'Automatico (sem saving)';
  const value = parseFloat(String(initiative.SavingsValue || '0').replace(/[^\d.]/g, '')) || 0;
  if (savingType === 'Soft Saving' && value < 10000) return 'Gestor RD (Soft < 10k)';
  if (savingType === 'Hard Saving' || value >= 10000) return 'Gestor RF / COMEX';
  return 'Gestor RD';
}

// -- Helper: context-sensitive action buttons --
function buildActionButtons(initiative, context, isOwner, status) {
  const buttons = [];

  if (context === 'pessoal' && isOwner) {
    if (status === STATUS.RASCUNHO) {
      buttons.push(
        new Button('Submeter', {
          variant: 'primary',
          onClickHandler: () => {
            alert('Submeter iniciativa: ' + initiative.Code);
          },
        }),
        new Button('Editar', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Editar iniciativa: ' + initiative.Code);
          },
        }),
        new Button('Cancelar', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Cancelar iniciativa: ' + initiative.Code);
          },
        }),
      );
    } else if (status === STATUS.EM_EXECUCAO) {
      buttons.push(
        new Button('Declarar Implementacao', {
          variant: 'primary',
          onClickHandler: () => {
            alert('Declarar implementacao: ' + initiative.Code);
          },
        }),
        new Button('Cancelar', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Cancelar iniciativa: ' + initiative.Code);
          },
        }),
      );
    } else if (status === STATUS.EM_REVISAO) {
      buttons.push(
        new Button('Re-submeter', {
          variant: 'primary',
          onClickHandler: () => {
            alert('Re-submeter iniciativa: ' + initiative.Code);
          },
        }),
        new Button('Editar', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Editar iniciativa: ' + initiative.Code);
          },
        }),
        new Button('Cancelar', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Cancelar iniciativa: ' + initiative.Code);
          },
        }),
      );
    }
  }

  if (context === 'mentoria') {
    if (status === STATUS.SUBMETIDO) {
      buttons.push(
        new Button('Aprovar', {
          variant: 'primary',
          onClickHandler: () => {
            alert('Aprovar projecto: ' + initiative.Code);
          },
        }),
        new Button('Rejeitar', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Rejeitar projecto: ' + initiative.Code);
          },
        }),
        new Button('Solicitar Revisao', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Solicitar revisao: ' + initiative.Code);
          },
        }),
      );
    } else if (status === STATUS.POR_VALIDAR) {
      buttons.push(
        new Button('Confirmar Saving', {
          variant: 'primary',
          onClickHandler: () => {
            alert('Confirmar saving: ' + initiative.Code);
          },
        }),
        new Button('Rejeitar', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Rejeitar: ' + initiative.Code);
          },
        }),
        new Button('Solicitar Revisao', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Solicitar revisao: ' + initiative.Code);
          },
        }),
      );
    }
  }

  if (context === 'gestor') {
    if (status === STATUS.POR_VALIDAR) {
      buttons.push(
        new Button('Aprovar Savings', {
          variant: 'primary',
          onClickHandler: () => {
            alert('Aprovar savings: ' + initiative.Code);
          },
        }),
        new Button('Rejeitar', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Rejeitar: ' + initiative.Code);
          },
        }),
        new Button('Solicitar Revisao', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Solicitar revisao: ' + initiative.Code);
          },
        }),
      );
    }
  }

  // Partilhar is always available
  buttons.push(
    new Button('Partilhar', {
      variant: 'secondary',
      isOutlined: true,
      onClickHandler: () => {
        alert('Partilhar iniciativa: ' + initiative.Code);
      },
    }),
  );

  return buttons;
}
