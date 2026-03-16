import { Container, Text, Button, LinkButton, ContextStore, Toast } from '../libs/nofbiz/nofbiz.base.js';
import { openNewInitiativeModal } from './new-initiative.js';

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

function createHeader() {
  const user = ContextStore.get('currentUser');
  const roleManager = ContextStore.get('roleManager');
  const displayName = user.get('displayName');
  const role = roleManager.roles[0] || 'Colaborador';

  return new Container([
    new Container([
      new Text('Place', { type: 'span', class: 'pace-header__logo' }),
      new Text('Plataforma de PDCAs . Cetelem Portugal', { type: 'span', class: 'pace-header__subtitle' }),
    ], { class: 'pace-header__left' }),
    new Container([
      new Button('+ Nova Iniciativa', {
        class: 'pace-header__new-btn',
        onClickHandler: () => {
          openNewInitiativeModal(() => {
            Toast.success('Iniciativa criada. A pagina sera actualizada.');
          });
        },
      }),
      new Container([
        new Text(displayName, { type: 'span', class: 'pace-header__user-name' }),
        new Text(role, { type: 'span', class: 'pace-header__user-role' }),
      ], { class: 'pace-header__user' }),
    ], { class: 'pace-header__right' }),
  ], { as: 'header', class: 'pace-header' });
}

function createTabBar() {
  const routes = ContextStore.get('routes');
  const allTabs = ['inicio', ...routes];

  const tabLinks = allTabs.map((key) => {
    const path = key === 'inicio' ? '' : key;
    return new LinkButton(TAB_LABELS[key], path, {
      class: `pace-tabs__tab pace-tab-${key}`,
    });
  });

  return new Container(tabLinks, { as: 'nav', class: 'pace-tabs' });
}

export function createPageLayout(content) {
  const items = Array.isArray(content) ? content : [content];
  return [createHeader(), createTabBar(), ...items];
}
