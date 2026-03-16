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

  const buildHomeKpi = (value, label, greenValue = false) => {
    const valClass = greenValue ? 'pace-kpi-value pace-kpi-value--green' : 'pace-kpi-value';
    return new Container([
      new Text(label, { type: 'span', class: 'pace-kpi-label' }),
      new Text(value, { type: 'span', class: valClass }),
    ], { class: 'pace-kpi' });
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

  const savingsDisplay = savingsTotal > 0 ? `${savingsTotal.toLocaleString('pt-PT')} EUR` : '\u2014';

  // -- PDCA wheel visual (inside hero) --
  const pdcaWheel = new Container([
    new Container([new Text('P', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--plan' }),
    new Container([new Text('D', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--do' }),
    new Container([new Text('C', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--check' }),
    new Container([new Text('A', { type: 'span' })], { class: 'pace-pdca-seg pace-pdca-seg--act' }),
    new Container([new Text('PDCA', { type: 'span' })], { class: 'pace-pdca-center' }),
  ], { class: 'pace-pdca-wheel' });

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
      new Text('PLACE - CETELEM PORTUGAL', { type: 'span', class: 'pace-hero-badge' }),
      new Text(`Ola, ${firstName}`, { type: 'h1' }),
      new Text('Bem-vindo a plataforma de melhoria continua. Submeta ideias, acompanhe o progresso e quantifique o impacto das suas iniciativas PDCA.', { type: 'p' }),
      new Container([
        newInitiativeBtn,
        new LinkButton('Ver as minhas iniciativas ->', 'pessoal', { variant: 'secondary', class: 'pace-hero-link-btn' }),
      ], { class: 'pace-hero__actions' }),
    ], { class: 'pace-hero__content' }),
    new Container([pdcaWheel], { class: 'pace-hero__visual' }),
  ], { class: 'pace-hero' });

  // -- KPI cards (label-first layout) --
  const kpiRow = new Container([
    buildHomeKpi(String(totalOwned), 'As Minhas Iniciativas'),
    buildHomeKpi(String(pendingCount), 'Pendentes'),
    buildHomeKpi(savingsDisplay, 'Savings Declarados', savingsTotal > 0),
  ], { class: 'pace-kpi-row' });

  // -- Notifications list (relative time, matching mockup) --
  const notifications = [
    { text: 'PDCA-042 submetido para validacao de projecto.', time: 'ha 4 dias' },
    { text: 'PDCA-034 transitou para Em Execucao.', time: 'ha 2 semanas' },
    { text: 'Diogo Legatheaux comentou PDCA-043.', time: 'ha 9 dias' },
    { text: 'PDCA-031 -- savings submetidos por Hugo Pires.', time: 'ha 3 semanas' },
    { text: 'PDCA-047 recebido para validacao por Gil Gaspar.', time: 'ha 7 dias' },
  ];

  const notifItems = notifications.map((n) => {
    return new Container([
      new Container([], { class: 'pace-notif-icon' }),
      new Container([
        new Text(n.text, { type: 'span' }),
        new Text(n.time, { type: 'span', class: 'pace-notif-date' }),
      ]),
    ], { class: 'pace-notif-item' });
  });

  const notificationsSection = new Container([
    new Text('Notificacoes', { type: 'h3', class: 'pace-sec-title pace-sec-title--plain' }),
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
      new Container([new Text(initials, { type: 'span' })], { class: 'pace-mentor-avatar pace-mentor-avatar--filled' }),
      new Container([
        new Text(m.displayName, { type: 'span', class: 'pace-mentor-name' }),
        new Text(`Mentor - ${teams}`, { type: 'span', class: 'pace-mentor-role' }),
      ]),
    ], { class: 'pace-mentor-row pace-mentor-row--plain' });
  });

  const mentorsSection = new Container([
    new Text('Contactos Mentor', { type: 'h3', class: 'pace-sec-title pace-sec-title--plain' }),
    ...mentorRows,
  ], { class: 'pace-home-mentors' });

  // -- Two-column grid --
  const twoColGrid = new Container([
    notificationsSection,
    mentorsSection,
  ], { class: 'pace-home-grid' });

  return [hero, kpiRow, twoColGrid];
});
