import {
  Text,
  Container,
  Button,
  Toast,
  ContextStore,
  defineRoute,
  __dayjs,
} from '../../libs/nofbiz/nofbiz.base.js';

import { getPersonal, getByUUIDs } from '../../utils/iniciativas-api.js';
import { getSharedWithMe } from '../../utils/shared-api.js';
import { STATUS, statusLabel, chipClass } from '../../utils/status-helpers.js';
import { openNewInitiativeModal } from '../../utils/new-initiative.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';
import { createPageLayout } from '../../utils/navbar.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Pessoal');

  const user = ContextStore.get('currentUser');
  const currentEmail = user.get('email');

  // -- Fetch personal initiatives (created or submitted by me) --
  let personalItems = [];
  try {
    personalItems = await getPersonal(currentEmail);
  } catch (error) {
    Toast.error('Erro ao carregar iniciativas pessoais.');
  }

  // -- Fetch shared with me --
  let sharedRecords = [];
  try {
    sharedRecords = await getSharedWithMe(currentEmail);
  } catch (error) {
    // Non-critical, continue without shared items
  }

  // -- Fetch actual shared initiatives (if any) --
  let sharedItems = [];
  if (sharedRecords.length > 0) {
    try {
      const sharedUUIDs = sharedRecords.map((r) => r.InitiativeUUID);
      sharedItems = await getByUUIDs(sharedUUIDs);
    } catch (error) {
      // Non-critical
    }
  }

  // -- Merge and deduplicate --
  const seenUUIDs = new Set(personalItems.map((i) => i.UUID));
  const allMyItems = [...personalItems];
  for (const item of sharedItems) {
    if (!seenUUIDs.has(item.UUID)) {
      allMyItems.push(item);
      seenUUIDs.add(item.UUID);
    }
  }

  // -- Categorize personal items --
  const drafts = allMyItems.filter((item) => item.Status === STATUS.RASCUNHO);
  const pendingValidation = allMyItems.filter((item) =>
    item.Status === STATUS.SUBMETIDO || item.Status === STATUS.POR_VALIDAR
  );
  const revisionItems = allMyItems.filter((item) => item.Status === STATUS.EM_REVISAO);
  const activeStatuses = [STATUS.EM_EXECUCAO, STATUS.POR_VALIDAR, STATUS.VALIDADO_GESTOR, STATUS.VALIDADO_MENTOR];
  const activeItems = allMyItems.filter((item) => activeStatuses.includes(item.Status));

  const pendingCount = drafts.length + pendingValidation.length + revisionItems.length;

  // -- Helper: Build a pending item card --
  const buildPendingItem = (item, actionLabel) => {
    const daysSince = __dayjs().diff(__dayjs(item.Modified || item.Created), 'day');
    const urgent = daysSince > 7;
    const itemClass = urgent ? 'pace-pending-item pace-pending-item--urgent' : 'pace-pending-item';

    const meta = [item.ImpactedTeamOUID || '', statusLabel(item.Status)];
    if (item.SavingType && item.SavingType !== 'Sem saving') {
      meta.push(item.SavingType);
    }

    const container = new Container([
      new Container([
        new Text(item.Code || '', { type: 'span', class: 'pace-chip pace-chip--active pace-pending-code' }),
        new Text(item.Title || 'Sem titulo', { type: 'span', class: 'pace-pending-item-title' }),
      ]),
      new Text(meta.join(' | '), { type: 'p', class: 'pace-pending-item-meta' }),
      new Container([
        new Text(`${daysSince} dia${daysSince !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-pending-item-meta' }),
        new Button(actionLabel, {
          variant: 'secondary',
          onClickHandler: (e) => {
            e.stopPropagation();
            openInitiativeDetail(item, 'pessoal');
          },
        }),
      ], { class: 'pace-pending-item-actions' }),
    ], { class: itemClass });

    container.setEventHandler('click', () => openInitiativeDetail(item, 'pessoal'));
    return container;
  };

  // -- Helper: Build HTML table from data --
  const buildTable = (headers, rows, onRowClick) => {
    const headerCells = headers.map((h) => `<th>${h}</th>`).join('');

    const bodyRows = rows.map((row, rowIdx) => {
      const cells = row.cells.map((cell, cellIdx) => {
        if (cellIdx === row.chipIndex && row.chipStatus) {
          return `<td><span class="pace-chip ${chipClass(row.chipStatus)}">${cell}</span></td>`;
        }
        if (cellIdx === row.cells.length - 1 && cell === 'Ver') {
          return `<td><span class="pace-table-link" data-row="${rowIdx}">Ver</span></td>`;
        }
        return `<td>${cell}</td>`;
      }).join('');
      return `<tr data-row-idx="${rowIdx}">${cells}</tr>`;
    }).join('');

    const tableContainer = new Container([], { class: 'pace-table-wrap' });
    tableContainer.children = new Text(
      `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
      { type: 'span' }
    );

    if (onRowClick) {
      tableContainer.setEventHandler('click', (e) => {
        const target = e.target;
        const row = target.closest('tr[data-row-idx]');
        if (row) {
          const idx = parseInt(row.getAttribute('data-row-idx'), 10);
          if (rows[idx]) {
            onRowClick(rows[idx].item);
          }
        }
      });
    }

    return tableContainer;
  };

  // -- CTA Banner --
  const ctaBanner = new Container([
    new Container([
      new Text('As Tuas Iniciativas', { type: 'h2', class: 'pace-cta-text' }),
      pendingCount > 0
        ? new Text(`${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-chip pace-chip--pending' })
        : new Text('', { type: 'span' }),
    ], { class: 'pace-cta-left' }),
    new Button('+ Submeter Nova', {
      variant: 'primary',
      onClickHandler: () => {
        openNewInitiativeModal(() => {
          location.reload();
        });
      },
    }),
  ], { class: 'pace-cta' });

  // -- Validation columns (drafts + pending) --
  const components = [ctaBanner];

  if (drafts.length > 0 || pendingValidation.length > 0) {
    const draftCards = drafts.map((item) => buildPendingItem(item, 'Editar'));
    const pendingCards = pendingValidation.map((item) => buildPendingItem(item, 'Ver'));

    const validationGrid = new Container([
      new Container([
        new Text(`Rascunhos (${drafts.length})`, { type: 'h3' }),
        ...(draftCards.length > 0 ? draftCards : [new Text('Sem rascunhos.', { type: 'p', class: 'pace-empty-msg' })]),
      ], { class: 'pace-validation-col pace-validation-col--project' }),
      new Container([
        new Text(`A Aguardar Validacao (${pendingValidation.length})`, { type: 'h3' }),
        ...(pendingCards.length > 0 ? pendingCards : [new Text('Sem iniciativas pendentes.', { type: 'p', class: 'pace-empty-msg' })]),
      ], { class: 'pace-validation-col pace-validation-col--savings' }),
    ], { class: 'pace-validation-grid' });

    components.push(validationGrid);
  }

  // -- Revision section --
  if (revisionItems.length > 0) {
    const revCards = revisionItems.map((item) => {
      const daysSince = __dayjs().diff(__dayjs(item.Modified || item.Created), 'day');
      const urgent = daysSince > 7;
      const itemClass = urgent
        ? 'pace-pending-item pace-pending-item--urgent pace-revision-item'
        : 'pace-pending-item pace-revision-item';

      const container = new Container([
        new Container([
          new Text(item.Code || '', { type: 'span', class: 'pace-chip pace-chip--revision pace-pending-code' }),
          new Text(item.Title || 'Sem titulo', { type: 'span', class: 'pace-pending-item-title' }),
        ]),
        new Text(item.RevisionJustification || 'Revisao solicitada pelo mentor/gestor.', { type: 'p', class: 'pace-pending-item-meta' }),
        new Container([
          new Text(`${daysSince} dia${daysSince !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-pending-item-meta' }),
          new Button('Editar', {
            variant: 'secondary',
            onClickHandler: () => openInitiativeDetail(item, 'pessoal'),
          }),
        ], { class: 'pace-pending-item-actions' }),
      ], { class: itemClass });

      container.setEventHandler('click', () => openInitiativeDetail(item, 'pessoal'));
      return container;
    });

    components.push(new Container([
      new Text('Em Revisao', { type: 'h2', class: 'pace-sec-title' }),
      ...revCards,
    ]));
  }

  // -- Active initiatives table --
  if (activeItems.length > 0) {
    const activeTable = buildTable(
      ['Codigo', 'Iniciativa', 'Estado', 'Saving', 'Valor', ''],
      activeItems.map((item) => ({
        cells: [
          item.Code || '-',
          item.Title || '-',
          statusLabel(item.Status),
          item.SavingType || 'Sem saving',
          item.SavingsValue || '-',
          'Ver',
        ],
        chipIndex: 2,
        chipStatus: item.Status,
        item,
      })),
      (item) => openInitiativeDetail(item, 'pessoal'),
    );

    components.push(new Container([
      new Text('Em Curso', { type: 'h2', class: 'pace-sec-title' }),
      activeTable,
    ]));
  }

  // -- Collaboration received --
  const collabReceived = new Container([
    new Text(`Colaboracoes Recebidas (${sharedItems.length})`, { type: 'h3', class: 'pace-sec-title' }),
    sharedItems.length > 0
      ? new Text(`${sharedItems.length} iniciativa${sharedItems.length !== 1 ? 's' : ''} partilhada${sharedItems.length !== 1 ? 's' : ''} consigo.`, { type: 'p', class: 'pace-empty-msg' })
      : new Text('Sem colaboracoes recebidas de momento.', { type: 'p', class: 'pace-empty-msg' }),
  ]);

  components.push(collabReceived);

  return createPageLayout(components);
});
