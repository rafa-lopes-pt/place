import {
  Text,
  Container,
  Toast,
  defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';

import { getByTeamScope } from '../../utils/iniciativas-api.js';
import { getUserOUID } from '../../utils/roles.js';
import { getDepartment } from '../../utils/equipas-api.js';
import { STATUS, statusLabel, chipClass } from '../../utils/status-helpers.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';
import { createFilterBar } from '../../utils/filters.js';
import { createPageLayout } from '../../utils/navbar.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Departamento');

  const userOUID = getUserOUID();

  // -- Resolve team scope --
  let deptName = userOUID;
  let teamItems = [];

  if (!userOUID) {
    Toast.error('OUID do utilizador nao definido.');
    return createPageLayout([
      new Text('Erro: Sem departamento associado ao utilizador.', { type: 'p', class: 'pace-empty-msg' }),
    ]);
  }

  try {
    const dept = await getDepartment(userOUID);
    if (dept) {
      deptName = dept.DeptName || userOUID;
      const descendants = dept.AllDescendants || [];
      const scope = [userOUID, ...descendants];
      teamItems = await getByTeamScope(scope);
    } else {
      // Fallback: query only own OUID
      teamItems = await getByTeamScope([userOUID]);
    }
  } catch (error) {
    Toast.error('Erro ao carregar iniciativas do departamento.');
  }

  // -- Team header --
  const scopeCount = teamItems.length;
  const teamHeader = new Container([
    new Container([
      new Text(deptName, { type: 'h2', class: 'pace-cta-text' }),

      new Text(userOUID, { type: 'span', class: 'pace-chip pace-chip--inactive' }),
      new Text(`${scopeCount} iniciativa${scopeCount !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-chip pace-chip--active' }),
    
    ], { class: 'pace-cta-left' }),
  ], { class: 'pace-cta' });

  // // -- Summary stats --
  // const activeCount = teamItems.filter((i) =>
  //   i.Status === STATUS.EM_EXECUCAO || i.Status === STATUS.POR_VALIDAR ||
  //   i.Status === STATUS.VALIDADO_GESTOR || i.Status === STATUS.VALIDADO_MENTOR
  // ).length;
  // const implementedCount = teamItems.filter((i) => i.Status === STATUS.IMPLEMENTADO).length;
  // const pendingCount = teamItems.filter((i) =>
  //   i.Status === STATUS.SUBMETIDO || i.Status === STATUS.EM_REVISAO
  // ).length;

  // const statsRow = new Container([
  //   new Container([
  //     new Text(String(activeCount), { type: 'span', class: 'pace-stat-number' }),
  //     new Text('Em Curso', { type: 'span', class: 'pace-stat-label' }),
  //   ], { class: 'pace-stat-card' }),
  //   new Container([
  //     new Text(String(pendingCount), { type: 'span', class: 'pace-stat-number' }),
  //     new Text('Pendentes', { type: 'span', class: 'pace-stat-label' }),
  //   ], { class: 'pace-stat-card' }),
  //   new Container([
  //     new Text(String(implementedCount), { type: 'span', class: 'pace-stat-number' }),
  //     new Text('Implementadas', { type: 'span', class: 'pace-stat-label' }),
  //   ], { class: 'pace-stat-card' }),
  // ], { class: 'pace-stats-row' });

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

  // -- Filterable table --
  let filteredItems = [...teamItems];
  const tableContainer = new Container([], { class: 'pace-open-table-container' });

  const renderTable = () => {
    if (filteredItems.length === 0) {
      tableContainer.children = new Text('Sem iniciativas encontradas.', { type: 'p', class: 'pace-empty-msg' });
      return;
    }

    const table = buildTable(
      ['Codigo', 'Iniciativa', 'Estado', 'Colaborador', 'Equipa', 'Saving', 'Valor', ''],
      filteredItems.map((item) => ({
        cells: [
          item.Code || '-',
          item.Title || '-',
          statusLabel(item.Status),
          item.CreatedByName || '-',
          item.ImpactedTeamOUID || '-',
          item.SavingType || 'Sem saving',
          item.SavingsValue || '-',
          'Ver',
        ],
        chipIndex: 2,
        chipStatus: item.Status,
        item,
      })),
      (item) => openInitiativeDetail(item, 'departamento'),
    );

    tableContainer.children = table;
  };

  const statusOptions = [
    STATUS.RASCUNHO,
    STATUS.SUBMETIDO,
    STATUS.VALIDADO_MENTOR,
    STATUS.EM_EXECUCAO,
    STATUS.POR_VALIDAR,
    STATUS.VALIDADO_GESTOR,
    STATUS.IMPLEMENTADO,
    STATUS.EM_REVISAO,
    STATUS.REJEITADO,
    STATUS.CANCELADO,
  ];

  const savingOptions = ['Sem saving', 'Hard Saving', 'Soft Saving'];

  const filterBar = createFilterBar({
    statusOptions,
    savingOptions,
    searchPlaceholder: 'Pesquisar iniciativas do departamento...',
    onFilterChange: (filters) => {
      filteredItems = teamItems.filter((item) => {
        if (filters.status && statusLabel(item.Status) !== filters.status && item.Status !== filters.status) {
          return false;
        }
        if (filters.savingType && (item.SavingType || 'Sem saving') !== filters.savingType) {
          return false;
        }
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          const searchable = [
            item.Code, item.Title, item.ImpactedTeamOUID, item.CreatedByName,
          ].filter(Boolean).join(' ').toLowerCase();
          if (!searchable.includes(query)) return false;
        }
        return true;
      });
      filterBar.setCount(filteredItems.length);
      renderTable();
    },
  });

  filterBar.setCount(filteredItems.length);
  renderTable();

  const tableSection = new Container([
    new Text('Iniciativas do Departamento', { type: 'h2', class: 'pace-sec-title' }),
    filterBar.container,
    tableContainer,
  ]);

  return createPageLayout([teamHeader, tableSection]);
});
