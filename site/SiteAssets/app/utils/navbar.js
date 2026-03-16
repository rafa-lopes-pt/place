import { LinkButton, Container, NavigationEvent } from '../libs/nofbiz/nofbiz.base.js';

const TAB_LABELS = {
  inicio: 'Inicio',
  instrucoes: 'Instrucoes',
  pessoal: 'Pessoal',
  mentoria: 'Mentoria',
  gestor: 'Gestor',
  catalogo: 'Catalogo',
  dashboard: 'Dashboard',
  admin: 'Configuracao',
};

export function renderNavbar(routes, user, roleManager) {
  // --- Header (plain DOM -- static structure, no SPARC component needed) ---

  const header = document.createElement('header');
  header.className = 'pace-header';

  const displayName = user.get('displayName');
  const role = roleManager.roles[0] || 'Colaborador';

  header.innerHTML = `
    <div class="pace-header__left">
      <span class="pace-header__logo">Place</span>
      <span class="pace-header__subtitle">Plataforma de PDCAs . Cetelem Portugal</span>
    </div>
    <div class="pace-header__right">
      <button class="pace-header__new-btn">+ Nova Iniciativa</button>
      <div class="pace-header__user">
        <div class="pace-header__user-name">${displayName}</div>
        <div class="pace-header__user-role">${role}</div>
      </div>
    </div>
  `;

  const newBtn = header.querySelector('.pace-header__new-btn');
  newBtn.addEventListener('click', () => {});

  // --- Tab bar (SPARC components for routing integration) ---

  const currentHash = location.hash || '#/';
  const allTabs = ['inicio', ...routes];
  const tabRefs = {};

  const tabLinks = allTabs.map((key) => {
    const isActive = (key === 'inicio' && (currentHash === '#/' || !currentHash))
                  || currentHash === `#/${key}`;
    const classes = `pace-tabs__tab pace-tab-${key}${isActive ? ' active' : ''}`;
    const path = key === 'inicio' ? '' : key;
    const btn = new LinkButton(TAB_LABELS[key], path, { class: classes });
    tabRefs[key] = btn;
    return btn;
  });

  const tabBar = new Container(tabLinks, { as: 'nav', class: 'pace-tabs' });

  // --- Active tab tracking ---

  NavigationEvent.listener((e) => {
    const to = e?.to || '/';
    const activeKey = to === '/' ? 'inicio' : to.slice(1);
    for (const [key, btn] of Object.entries(tabRefs)) {
      if (key === activeKey) {
        btn.instance?.addClass('active');
      } else {
        btn.instance?.removeClass('active');
      }
    }
  });

  // --- DOM insertion (header first, then tab bar below it) ---

  document.body.prepend(tabBar.instance[0]);
  document.body.prepend(header);
}
