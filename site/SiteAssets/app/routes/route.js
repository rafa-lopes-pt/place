import {
  Text,
  Container,
  Button,
  LinkButton,
  Toast,
  ContextStore,
  defineRoute,
} from '../libs/nofbiz/nofbiz.base.js';

import { getOwned } from '../utils/iniciativas-api.js';
import { STATUS } from '../utils/status-helpers.js';
import { MENTOR_MAP } from '../utils/routing-rules.js';
import { openNewInitiativeModal } from '../utils/new-initiative.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Inicio');

  const user = ContextStore.get('currentUser');
  const displayName = user.get('displayName') || 'Colaborador';
  const firstName = displayName.split(' ')[0];

  // -- Helpers (scoped inside defineRoute) --

  const buildKpiCard = (value, label, highlight) => {
    const cardClass = highlight ? 'pace-kpi pace-kpi--highlight' : 'pace-kpi';
    return new Container([
      new Text(value, { type: 'span', class: 'pace-kpi-value' }),
      new Text(label, { type: 'span', class: 'pace-kpi-label' }),
    ], { class: cardClass });
  };

  const getUniqueMentors = () => {
    const seen = new Set();
    const result = [];
    for (const mentor of Object.values(MENTOR_MAP)) {
      if (!seen.has(mentor.email)) {
        seen.add(mentor.email);
        result.push(mentor);
      }
    }
    return result;
  };

  // -- Fetch owned initiatives for KPIs --
  let ownedItems = [];
  try {
    ownedItems = await getOwned();
  } catch (error) {
    Toast.error('Erro ao carregar as suas iniciativas.');
  }

  const totalOwned = ownedItems.length;
  const pendingStatuses = [STATUS.SUBMETIDO, STATUS.POR_VALIDAR, STATUS.EM_REVISAO];
  const pendingCount = ownedItems.filter((item) => pendingStatuses.includes(item.Status)).length;

  const savingsTotal = ownedItems.reduce((sum, item) => {
    if (item.SavingType && item.SavingType !== 'Sem saving' && item.SavingEstimate) {
      const val = parseFloat(String(item.SavingEstimate).replace(/[^\d.]/g, '')) || 0;
      return sum + val;
    }
    return sum;
  }, 0);

  const savingsDisplay = savingsTotal > 0 ? `${savingsTotal.toLocaleString('pt-PT')} EUR` : '-';

  // -- Hero welcome banner --
  const newInitiativeBtn = new Button('+ Nova Iniciativa', {
    variant: 'primary',
    onClickHandler: () => {
      openNewInitiativeModal(() => {
        Toast.success('Iniciativa criada. A pagina sera actualizada.');
      });
    },
  });

  const hero = new Container([
    new Container([
      new Text('Place - Cetelem Portugal', { type: 'span', class: 'pace-hero-badge' }),
      new Text(`Ola, ${firstName}`, { type: 'h1' }),
      new Text('Bem-vindo ao Place, a plataforma de melhoria continua da Cetelem Portugal. Submete as tuas iniciativas PDCA e acompanha o seu progresso.', { type: 'p' }),
      new Container([
        newInitiativeBtn,
        new LinkButton('Ver as minhas iniciativas', 'pessoal', { variant: 'secondary', class: 'pace-hero-link-btn' }),
      ], { class: 'pace-hero__actions' }),
    ], { class: 'pace-hero__content' }),
    new Container([], { class: 'pace-hero-wheel' }),
  ], { class: 'pace-hero' });

  // -- PDCA wheel visual --
  const pdcaWheel = new Container([
    new Container([
      new Container([new Text('P', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--plan' }),
      new Container([new Text('D', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--do' }),
      new Container([new Text('C', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--check' }),
      new Container([new Text('A', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--act' }),
      new Container([new Text('PDCA', { type: 'span' })], { class: 'pace-pdca-center' }),
    ], { class: 'pace-pdca-wheel' }),
  ], { class: 'pace-pdca-wrap' });

  // -- KPI cards --
  const kpiRow = new Container([
    buildKpiCard(String(totalOwned), 'As Minhas Iniciativas', false),
    buildKpiCard(String(pendingCount), 'Pendentes', pendingCount > 0),
    buildKpiCard(savingsDisplay, 'Savings Declarados', savingsTotal > 0),
  ], { class: 'pace-kpi-row' });

  // -- Notifications list (sample data) --
  const notifications = [
    { text: 'A sua iniciativa PDCA-012 foi aprovada pelo mentor.', date: '14/03/2026', type: '' },
    { text: 'Novo comentario na iniciativa PDCA-008.', date: '13/03/2026', type: '' },
    { text: 'A iniciativa PDCA-005 esta pendente ha mais de 7 dias.', date: '12/03/2026', type: 'warn' },
    { text: 'Savings da PDCA-003 foram validados pelo gestor.', date: '10/03/2026', type: '' },
    { text: 'A sua iniciativa PDCA-015 requer revisao.', date: '09/03/2026', type: 'error' },
  ];

  const notifItems = notifications.map((n) => {
    const iconClass = n.type ? `pace-notif-icon pace-notif-icon--${n.type}` : 'pace-notif-icon';
    return new Container([
      new Container([], { class: iconClass }),
      new Container([
        new Text(n.text, { type: 'span' }),
        new Text(n.date, { type: 'span', class: 'pace-notif-date' }),
      ]),
    ], { class: 'pace-notif-item' });
  });

  const notificationsSection = new Container([
    new Text('Notificacoes', { type: 'h3', class: 'pace-sec-title' }),
    new Container(notifItems, { as: 'div', class: 'pace-notif-list' }),
  ], { class: 'pace-home-notifications' });

  // -- Mentor contacts --
  const uniqueMentors = getUniqueMentors();
  const mentorRows = uniqueMentors.slice(0, 2).map((m) => {
    const initials = m.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const teams = Object.entries(MENTOR_MAP)
      .filter(([, mentor]) => mentor.email === m.email)
      .map(([team]) => team)
      .join(', ');

    return new Container([
      new Container([new Text(initials, { type: 'span' })], { class: 'pace-mentor-avatar' }),
      new Container([
        new Text(m.displayName, { type: 'span', class: 'pace-mentor-name' }),
        new Text(teams, { type: 'span', class: 'pace-mentor-team' }),
      ]),
    ], { class: 'pace-mentor-row' });
  });

  const mentorsSection = new Container([
    new Text('Mentores', { type: 'h3', class: 'pace-sec-title' }),
    ...mentorRows,
  ], { class: 'pace-home-mentors' });

  // -- Two-column grid --
  const twoColGrid = new Container([
    notificationsSection,
    mentorsSection,
  ], { class: 'pace-home-grid' });

  return [hero, pdcaWheel, kpiRow, twoColGrid];
});
