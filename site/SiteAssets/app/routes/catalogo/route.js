import {
  Text,
  Container,
  Button,
  View,
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
} from '../../utils/format-helpers.js';

export default defineRoute((config) => {
  config.setRouteTitle('Catalogo');

  // -- state --

  let allItems = [];
  let activeTab = 'implementados';

  // -- layout containers --

  const ctaBanner = new Container([], { class: 'pace-cta' });
  const kpiRow = new Container([], { class: 'pace-kpi-row' });
  const toggleContainer = new Container([], { class: 'pace-toggle-wrapper' });
  const implementadosView = new View([], { showOnRender: true });
  const arquivoView = new View([], { showOnRender: false });

  // -- data loading --

  async function loadData() {
    const loading = Toast.loading('A carregar catalogo...');
    try {
      allItems = await getAll();
      loading.dismiss();
      buildUI();
    } catch (error) {
      loading.error('Erro ao carregar catalogo');
    }
  }

  // -- build UI --

  function buildUI() {
    const implementados = allItems.filter((i) => i.Status === STATUS.IMPLEMENTADO);
    const arquivo = allItems.filter(
      (i) => i.Status === STATUS.CANCELADO || i.Status === STATUS.REJEITADO
    );

    const savingsTotal = implementados.reduce(
      (sum, i) => sum + parseSaving(i.SavingValidated),
      0
    );
    const avgSaving = implementados.length > 0 ? savingsTotal / implementados.length : 0;

    // CTA banner
    ctaBanner.children = [
      new Container(
        [
          new Text(`EUR ${(savingsTotal / 1000).toFixed(1)}k de savings gerados`, {
            type: 'span',
            class: 'pace-cta-text',
          }),
          new Text(
            `${implementados.length} iniciativas implementadas com sucesso.`,
            { type: 'p', class: 'pace-cta-text' }
          ),
        ],
        { as: 'div' }
      ),
      new Button('Exportar CSV', {
        variant: 'secondary',
        onClickHandler: () => {
          alert('Exportar CSV (placeholder)');
        },
      }),
    ];

    // KPIs
    kpiRow.children = [
      buildKpi(String(implementados.length), 'Implementados'),
      buildKpi(`EUR ${(savingsTotal / 1000).toFixed(1)}k`, 'Savings Acumulados', true),
      buildKpi(`EUR ${(avgSaving / 1000).toFixed(1)}k`, 'Media / Iniciativa'),
    ];

    // Toggle buttons
    rebuildToggle();

    // Table content
    implementadosView.children = buildTable(implementados, true);
    arquivoView.children = buildTable(arquivo, false);
  }

  function rebuildToggle() {
    toggleContainer.children = [
      new Container(
        [
          new Button('Implementados', {
            variant: activeTab === 'implementados' ? 'primary' : 'secondary',
            class: activeTab === 'implementados' ? 'pace-toggle-btn pace-toggle-btn--active' : 'pace-toggle-btn',
            onClickHandler: () => switchTab('implementados'),
          }),
          new Button('Arquivo', {
            variant: activeTab === 'arquivo' ? 'primary' : 'secondary',
            class: activeTab === 'arquivo' ? 'pace-toggle-btn pace-toggle-btn--active' : 'pace-toggle-btn',
            onClickHandler: () => switchTab('arquivo'),
          }),
        ],
        { class: 'pace-toggle' }
      ),
    ];
  }

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'implementados') {
      implementadosView.show();
      arquivoView.hide();
    } else {
      implementadosView.hide();
      arquivoView.show();
    }
    rebuildToggle();
  }

  function buildTable(items, showDate) {
    const headerCols = ['Codigo', 'Iniciativa', 'Estado', 'Colaborador', 'Equipa', 'Saving', 'Valor'];
    if (showDate) headerCols.push('Implementado');
    headerCols.push('');

    const rows = items.map((item) => {
      const saving = parseSaving(item.SavingValidated || item.SavingEstimate);
      const cells = [
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
      ];

      if (showDate) {
        cells.push(
          new Text(
            item.ImplementedDate
              ? __dayjs(item.ImplementedDate).format('DD/MM/YYYY')
              : '---',
            { type: 'span' }
          )
        );
      }

      cells.push(
        new Button('Ver', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Detalhe da iniciativa (placeholder)');
          },
        })
      );

      return new Container(cells, { class: 'pace-table-row' });
    });

    if (items.length === 0) {
      return [
        buildTableHeader(headerCols),
        new Text('Sem iniciativas nesta categoria.', { type: 'p', class: 'pace-empty' }),
      ];
    }

    return [new Container([buildTableHeader(headerCols), ...rows], { class: 'pace-table-wrap' })];
  }

  // -- init --

  loadData();

  return [ctaBanner, kpiRow, toggleContainer, implementadosView, arquivoView];
});
