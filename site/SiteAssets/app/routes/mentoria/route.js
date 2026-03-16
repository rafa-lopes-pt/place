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

export default defineRoute((config) => {
  config.setRouteTitle('Mentoria');

  // -- state --

  let allItems = [];
  const statusFilter = new FormField({ value: '' });
  const searchField = new FormField({ value: '' });

  // -- layout containers (populated after data load) --

  const ctaBanner = new Container([], { class: 'pace-cta' });
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
    const emExecucao = allItems.filter((i) => i.Status === STATUS.EM_EXECUCAO);
    const implementados = allItems.filter((i) => i.Status === STATUS.IMPLEMENTADO);

    const pendingCount = submetidos.length + porValidar.length;
    const savingsTotal = implementados.reduce(
      (sum, i) => sum + parseSaving(i.SavingValidated),
      0
    );

    // CTA banner
    ctaBanner.children = [
      new Container(
        [
          new Text(`${pendingCount} accoes pendentes`, {
            type: 'span',
            class: 'pace-cta-text',
          }),
          new Text(
            ` -- ${submetidos.length} validacoes de projecto - ${porValidar.length} confirmacoes de savings`,
            { type: 'span', class: 'pace-cta-text' }
          ),
        ],
        { as: 'div' }
      ),
      new Button('Validar Iniciativas', {
        variant: 'primary',
        onClickHandler: () => {
          if (validationGrid.instance) {
            validationGrid.instance[0].scrollIntoView({ behavior: 'smooth' });
          }
        },
      }),
    ];

    // KPIs
    kpiRow.children = [
      buildKpi(String(allItems.length), 'Total Carteira'),
      buildKpi(String(emExecucao.length), 'Em Execucao'),
      buildKpi(
        `EUR ${(savingsTotal / 1000).toFixed(1)}k`,
        'Savings Validados',
        true
      ),
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

    // Open initiatives table
    rebuildOpenTable();

    // Subscribe to filter changes
    statusFilter.subscribe(() => rebuildOpenTable());
    searchField.subscribe(() => rebuildOpenTable());

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
        : `EUR ${parseSaving(item.SavingEstimate).toLocaleString()}`;

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
              onClickHandler: () => {
                alert('Detalhe da iniciativa (placeholder)');
              },
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

  function rebuildOpenTable() {
    const filtered = getFilteredOpenItems();

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

    const filterBarRow = new Container(
      [
        statusCombo,
        searchInput,
        clearBtn,
        new Text([() => `${getFilteredOpenItems().length} resultados`], {
          type: 'span',
          class: 'pace-filter-count',
        }),
      ],
      { class: 'pace-filters' }
    );

    const cols = ['Codigo', 'Iniciativa', 'Estado', 'Colaborador', 'Equipa', 'Saving', 'Valor', ''];
    const tableRows = filtered.map((item) => buildTableRow(item));

    const tableWrapper = new Container(
      [buildTableHeader(cols), ...tableRows],
      { class: 'pace-table-wrap' }
    );

    openTableSection.children = [
      new Text('Iniciativas em Aberto', { type: 'h2', class: 'pace-sec-title' }),
      filterBarRow,
      tableWrapper,
    ];
  }

  function buildTableRow(item) {
    const saving = parseSaving(item.SavingEstimate);
    return new Container(
      [
        new Text(item.Code, { type: 'span' }),
        new Button(item.Title, {
          variant: 'secondary',
          isOutlined: true,
          onClickHandler: () => {
            alert('Detalhe da iniciativa (placeholder)');
          },
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
          onClickHandler: () => {
            alert('Detalhe da iniciativa (placeholder)');
          },
        }),
      ],
      { class: 'pace-table-row' }
    );
  }

  // -- init --

  loadData();

  return createPageLayout([ctaBanner, kpiRow, validationGrid, openTableSection, collabSection]);
});
