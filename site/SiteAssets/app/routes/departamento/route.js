import {
  Text,
  Container,
  Button,
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
import { buildTableHeader } from '../../utils/format-helpers.js';

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

  // -- Filterable table --
  let filteredItems = [...teamItems];
  const tableContainer = new Container([], { class: 'pace-open-table-container' });

  const renderTable = () => {
    if (filteredItems.length === 0) {
      tableContainer.children = new Text('Sem iniciativas encontradas.', { type: 'p', class: 'pace-empty-msg' });
      return;
    }

    const rows = filteredItems.map((item) => new Container(
      [
        new Text(item.Code || '-', { type: 'span' }),
        new Button(item.Title || '-', {
          variant: 'secondary',
          isOutlined: true,
          onClickHandler: () => openInitiativeDetail(item, 'departamento'),
          class: 'pace-table-link-btn',
        }),
        new Text(statusLabel(item.Status), {
          type: 'span',
          class: `pace-chip ${chipClass(item.Status)}`,
        }),
        new Text(item.CreatedByName || '-', { type: 'span' }),
        new Text(item.ImpactedTeamOUID || '-', { type: 'span' }),
        new Text(item.SavingType || 'Sem saving', { type: 'span' }),
        new Text(item.SavingsValue || '-', { type: 'span' }),
        new Button('Ver', {
          variant: 'secondary',
          onClickHandler: () => openInitiativeDetail(item, 'departamento'),
        }),
      ],
      { class: 'pace-table-row' }
    ));

    tableContainer.children = new Container(
      [buildTableHeader(['Codigo', 'Iniciativa', 'Estado', 'Colaborador', 'Equipa', 'Saving', 'Valor', '']), ...rows],
      { class: 'pace-table-wrap' }
    );
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
