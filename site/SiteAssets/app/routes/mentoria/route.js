import {
  Text,
  Container,
  Button,
  TextInput,
  ComboBox,
  FormField,
  Toast,
  defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';
import { getAll } from '../../utils/iniciativas-api.js';
import {
  STATUS,
  statusLabel,
  chipClass,
} from '../../utils/status-helpers.js';
import {
  parseSaving,
  ownerName,
  mentorName,
  gestorName,
  daysPending,
  buildKpi,
  buildTableHeader,
  buildCollabStub,
} from '../../utils/format-helpers.js';
import { createPageLayout } from '../../utils/navbar.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';

export default defineRoute((config) => {
  config.setRouteTitle('Mentoria');

  // -- state --

  let allItems = [];
  const statusFilter = new FormField({ value: '' });
  const searchField = new FormField({ value: '' });

  // -- layout containers (populated after data load) --

  const ctaBanner = new Container(
    [
      new Text('Mentoria', { type: 'h2', class: 'pace-cta-title' }),
      new Text(
        'Acompanhe as iniciativas da sua equipa, valide projectos submetidos e confirme savings implementados.',
        { type: 'p' }
      ),
    ],
    { class: 'pace-cta' }
  );
  const kpiRow = new Container([], { class: 'pace-kpi-row' });
  const validationGrid = new Container([], { class: 'pace-validation-grid' });
  const openTableSection = new Container([]);
  const collabSection = new Container([]);

  // -- data loading --

  async function loadData() {
    const loading = Toast.loading('A carregar iniciativas...');
    try {
      allItems = await getAll();
      loading.dismiss();
      buildUI();
    } catch (error) {
      loading.error('Erro ao carregar iniciativas');
    }
  }

  // -- build UI after data load --

  function buildUI() {
    const submetidos = allItems.filter((i) => i.Status === STATUS.SUBMETIDO);
    const porValidar = allItems.filter((i) => i.Status === STATUS.POR_VALIDAR);
    const pendingCount = submetidos.length + porValidar.length;

    // KPIs
    kpiRow.children = [
      buildKpi(String(pendingCount), 'Accoes Pendentes', true),
      buildKpi(String(submetidos.length), 'Validacoes de Projecto'),
      buildKpi(String(porValidar.length), 'Confirmacoes de Savings'),
    ];

    // Validation columns
    validationGrid.children = [
      new Container(
        [
          new Text('Validacao de Projecto', { type: 'h3' }),
          ...submetidos.map((item) => buildPendingItem(item, 'projecto')),
          ...(submetidos.length === 0
            ? [new Text('Sem iniciativas pendentes de validacao.', { type: 'p', class: 'pace-empty' })]
            : []),
        ],
        { class: 'pace-validation-col pace-validation-col--project' }
      ),
      new Container(
        [
          new Text('Validacao de Savings', { type: 'h3' }),
          ...porValidar.map((item) => buildPendingItem(item, 'savings')),
          ...(porValidar.length === 0
            ? [new Text('Sem savings pendentes de confirmacao.', { type: 'p', class: 'pace-empty' })]
            : []),
        ],
        { class: 'pace-validation-col pace-validation-col--savings' }
      ),
    ];

    // Open initiatives table -- create filter components ONCE
    const statusOptions = [
      STATUS.RASCUNHO,
      STATUS.SUBMETIDO,
      STATUS.EM_EXECUCAO,
      STATUS.POR_VALIDAR,
      STATUS.EM_REVISAO,
    ].map((s) => statusLabel(s));

    const statusCombo = new ComboBox(statusFilter, statusOptions, {
      placeholder: 'Filtrar por estado...',
    });
    const searchInput = new TextInput(searchField, {
      placeholder: 'Pesquisar...',
      debounceMs: 300,
    });
    const clearBtn = new Button('Limpar', {
      variant: 'secondary',
      onClickHandler: () => {
        statusFilter.value = '';
        searchField.value = '';
      },
    });
    const countText = new Text([() => `${getFilteredOpenItems().length} resultados`], {
      type: 'span',
      class: 'pace-filter-count',
    });
    const filterBarRow = new Container(
      [statusCombo, searchInput, clearBtn, countText],
      { class: 'pace-filters' }
    );

    // Container that holds ONLY the table rows (rebuilt on filter change)
    const tableContent = new Container([]);

    // Set section structure ONCE
    openTableSection.children = [
      new Text('Iniciativas em Aberto', { type: 'h2', class: 'pace-sec-title' }),
      filterBarRow,
      tableContent,
    ];

    // Function to rebuild just the table data
    const rebuildTableData = () => {
      const filtered = getFilteredOpenItems();
      const cols = ['Codigo', 'Iniciativa', 'Estado', 'Colaborador', 'Equipa', 'Saving', 'Valor', ''];
      const tableRows = filtered.map((item) => buildTableRow(item));
      tableContent.children = new Container(
        [buildTableHeader(cols), ...tableRows],
        { class: 'pace-table-wrap' }
      );
    };

    rebuildTableData();

    // Subscribe to filter changes
    statusFilter.subscribe(rebuildTableData);
    searchField.subscribe(rebuildTableData);

    // Collaboration stubs
    collabSection.children = [
      new Text('Colaboracao', { type: 'h2', class: 'pace-sec-title' }),
      buildCollabStub('Recebidos'),
      buildCollabStub('Enviados'),
    ];
  }

  function buildPendingItem(item, type) {
    const days = daysPending(item.SubmittedDate);
    const urgent = days > 5;
    const cls = urgent
      ? 'pace-pending-item pace-pending-item--urgent'
      : 'pace-pending-item';

    const metaText =
      type === 'projecto'
        ? `${ownerName(item)} | ${item.Team} | Mentor: ${mentorName(item)}`
        : `${ownerName(item)} | ${item.Team} | Gestor: ${gestorName(item)}`;

    const rightInfo =
      type === 'projecto'
        ? `${days}d pendente`
        : `EUR ${parseSaving(item.SavingsValue).toLocaleString()}`;

    const actionLabel = type === 'projecto' ? 'Validar' : 'Confirmar';

    return new Container(
      [
        new Container(
          [
            new Text(`${item.Code} - ${item.Title}`, {
              type: 'span',
              class: 'pace-pending-item-title',
            }),
            new Text(metaText, {
              type: 'span',
              class: 'pace-pending-item-meta',
            }),
          ],
          { as: 'div' }
        ),
        new Container(
          [
            new Text(rightInfo, { type: 'span', class: 'pace-pending-item-meta' }),
            new Button(actionLabel, {
              variant: 'secondary',
              onClickHandler: () => openInitiativeDetail(item, 'mentoria'),
            }),
          ],
          { class: 'pace-pending-item-actions' }
        ),
      ],
      { class: cls }
    );
  }

  // -- Open initiatives table --

  function getFilteredOpenItems() {
    const statusVal =
      statusFilter.value && typeof statusFilter.value === 'object'
        ? statusFilter.value.text
        : statusFilter.value || '';
    const searchVal = (searchField.value || '').toLowerCase();

    const openStatuses = [
      STATUS.RASCUNHO,
      STATUS.SUBMETIDO,
      STATUS.EM_EXECUCAO,
      STATUS.POR_VALIDAR,
      STATUS.EM_REVISAO,
      STATUS.VALIDADO_MENTOR,
      STATUS.VALIDADO_GESTOR,
    ];

    return allItems.filter((item) => {
      if (!openStatuses.includes(item.Status)) return false;
      if (statusVal && item.Status !== statusVal) return false;
      if (
        searchVal &&
        !item.Title.toLowerCase().includes(searchVal) &&
        !item.Code.toLowerCase().includes(searchVal)
      )
        return false;
      return true;
    });
  }

  function buildTableRow(item) {
    const saving = parseSaving(item.SavingsValue);
    return new Container(
      [
        new Text(item.Code, { type: 'span' }),
        new Button(item.Title, {
          variant: 'secondary',
          isOutlined: true,
          onClickHandler: () => openInitiativeDetail(item, 'mentoria'),
          class: 'pace-table-link-btn',
        }),
        new Text(statusLabel(item.Status), {
          type: 'span',
          class: `pace-chip ${chipClass(item.Status)}`,
        }),
        new Text(ownerName(item), { type: 'span' }),
        new Text(item.Team, { type: 'span' }),
        new Text(item.SavingType || '---', { type: 'span' }),
        new Text(saving ? `EUR ${saving.toLocaleString()}` : '---', { type: 'span' }),
        new Button('Ver', {
          variant: 'secondary',
          onClickHandler: () => openInitiativeDetail(item, 'mentoria'),
        }),
      ],
      { class: 'pace-table-row' }
    );
  }

  // -- init --

  loadData();

  return createPageLayout([ctaBanner, kpiRow, validationGrid, openTableSection, collabSection]);
});
