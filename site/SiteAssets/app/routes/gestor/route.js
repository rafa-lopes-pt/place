import {
  Text,
  Container,
  Button,
  Toast,
  defineRoute,
  __dayjs,
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
  buildKpi,
  buildTableHeader,
  buildCollabStub,
} from '../../utils/format-helpers.js';

export default defineRoute((config) => {
  config.setRouteTitle('Gestor');

  // -- state --

  let allItems = [];

  // -- layout containers --

  const ctaBanner = new Container([], { class: 'pace-cta' });
  const kpiRow = new Container([], { class: 'pace-kpi-row' });
  const pendingGrid = new Container([], { class: 'pace-validation-grid' });
  const collabSection = new Container([]);
  const historySection = new Container([]);

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

  // -- build UI --

  function buildUI() {
    const porValidar = allItems.filter((i) => i.Status === STATUS.POR_VALIDAR);
    const validadosGestor = allItems.filter((i) => i.Status === STATUS.VALIDADO_GESTOR);
    const implementados = allItems.filter((i) => i.Status === STATUS.IMPLEMENTADO);

    const now = __dayjs();
    const thisMonthItems = [...validadosGestor, ...implementados].filter((i) => {
      const d = i.ImplementedDate || i.SubmittedDate;
      return d && __dayjs(d).month() === now.month() && __dayjs(d).year() === now.year();
    });

    const savingsAprovados = [...validadosGestor, ...implementados].reduce(
      (sum, i) => sum + parseSaving(i.SavingValidated || i.SavingEstimate),
      0
    );

    // CTA banner
    ctaBanner.children = [
      new Container(
        [
          new Text(`${porValidar.length} savings aguardam aprovacao`, {
            type: 'span',
            class: 'pace-cta-text',
          }),
          new Text('Valide os savings declarados pelas equipas.', {
            type: 'p',
            class: 'pace-cta-text',
          }),
        ],
        { as: 'div' }
      ),
      new Button('Aprovar', {
        variant: 'primary',
        onClickHandler: () => {
          if (pendingGrid.instance) {
            pendingGrid.instance[0].scrollIntoView({ behavior: 'smooth' });
          }
        },
      }),
    ];

    // KPIs
    kpiRow.children = [
      buildKpi(String(porValidar.length), 'Pendentes'),
      buildKpi(String(thisMonthItems.length), 'Validados Este Mes'),
      buildKpi(
        `EUR ${(savingsAprovados / 1000).toFixed(1)}k`,
        'Savings Aprovados',
        true
      ),
    ];

    // Pending grid -- split POR_VALIDAR items into two columns
    const midpoint = Math.ceil(porValidar.length / 2);
    const leftItems = porValidar.slice(0, midpoint);
    const rightItems = porValidar.slice(midpoint);

    pendingGrid.children = [
      new Container(
        [
          new Text('Savings Pendentes', { type: 'h3' }),
          ...leftItems.map((item) => buildPendingItem(item)),
          ...(leftItems.length === 0
            ? [new Text('Sem savings pendentes.', { type: 'p', class: 'pace-empty' })]
            : []),
        ],
        { class: 'pace-validation-col pace-validation-col--savings' }
      ),
      new Container(
        [
          new Text('Savings Pendentes', { type: 'h3' }),
          ...rightItems.map((item) => buildPendingItem(item)),
          ...(rightItems.length === 0
            ? [new Text('---', { type: 'p', class: 'pace-empty' })]
            : []),
        ],
        { class: 'pace-validation-col pace-validation-col--savings' }
      ),
    ];

    // Collaboration stubs
    collabSection.children = [
      new Text('Colaboracao', { type: 'h2', class: 'pace-sec-title' }),
      buildCollabStub('Recebidos'),
      buildCollabStub('Enviados'),
    ];

    // History table
    buildHistoryTable();
  }

  function buildPendingItem(item) {
    const saving = parseSaving(item.SavingEstimate);
    return new Container(
      [
        new Container(
          [
            new Text(`${item.Code} - ${item.Title}`, {
              type: 'span',
              class: 'pace-pending-item-title',
            }),
            new Text(
              `${ownerName(item)} | ${item.Team} | EUR ${saving.toLocaleString()}`,
              { type: 'span', class: 'pace-pending-item-meta' }
            ),
          ],
          { as: 'div' }
        ),
        new Button('Aprovar', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Detalhe da iniciativa (placeholder)');
          },
        }),
      ],
      { class: 'pace-pending-item' }
    );
  }

  function buildHistoryTable() {
    const historyStatuses = [STATUS.POR_VALIDAR, STATUS.VALIDADO_GESTOR, STATUS.IMPLEMENTADO];
    const historyItems = allItems.filter((i) => historyStatuses.includes(i.Status));

    const cols = ['Codigo', 'Iniciativa', 'Estado', 'Colaborador', 'Tipo', 'Valor', ''];
    const rows = historyItems.map((item) => {
      const saving = parseSaving(item.SavingValidated || item.SavingEstimate);
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
    });

    historySection.children = [
      new Text('Historico Completo', { type: 'h2', class: 'pace-sec-title' }),
      new Container([buildTableHeader(cols), ...rows], { class: 'pace-table-wrap' }),
    ];
  }

  // -- init --

  loadData();

  return [ctaBanner, kpiRow, pendingGrid, collabSection, historySection];
});
