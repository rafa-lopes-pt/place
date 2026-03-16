import {
  Text,
  Container,
  Button,
  TextInput,
  ComboBox,
  FormField,
  Toast,
  SiteApi,
  defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';
import { TEAMS } from '../../utils/roles.js';
import {
  getComboVal,
  parseJsonArray,
  buildTableHeader,
} from '../../utils/format-helpers.js';
import { createPageLayout } from '../../utils/navbar.js';

export default defineRoute((config) => {
  config.setRouteTitle('Admin');

  // -- helpers --

  function roleLabel(role) {
    const labels = {
      colaborador: 'Colaborador',
      resp_equipa: 'Resp. Equipa',
      gestor: 'Gestor',
      mentor: 'Mentor',
      executivo: 'Executivo',
    };
    return labels[role] || role;
  }

  function roleChipClass(role) {
    const map = {
      colaborador: 'pace-chip--inactive',
      resp_equipa: 'pace-chip--pending',
      gestor: 'pace-chip--pending',
      mentor: 'pace-chip--active',
      executivo: 'pace-chip--done',
    };
    return map[role] || 'pace-chip--inactive';
  }

  // -- state --

  let allUsers = [];
  const profileFilter = new FormField({ value: '' });
  const teamFilter = new FormField({ value: '' });
  const searchField = new FormField({ value: '' });

  // -- layout containers --

  const ctaBanner = new Container([], { class: 'pace-cta' });
  const filterBar = new Container([], { class: 'pace-filters' });
  const usersTable = new Container([]);

  // -- data loading --

  async function loadData() {
    const loading = Toast.loading('A carregar utilizadores...');
    try {
      const siteApi = new SiteApi();
      const userRolesApi = siteApi.list('UserRoles');
      allUsers = await userRolesApi.getItems({}, { limit: Infinity });
      loading.dismiss();
      buildUI();
    } catch (error) {
      loading.error('Erro ao carregar utilizadores');
    }
  }

  // -- filtering --

  function getFilteredUsers() {
    const profileVal = getComboVal(profileFilter);
    const teamVal = getComboVal(teamFilter);
    const searchVal = (searchField.value || '').toLowerCase();

    return allUsers.filter((user) => {
      const roles = parseJsonArray(user.Roles);

      if (profileVal) {
        const roleKey = Object.entries({
          colaborador: 'Colaborador',
          resp_equipa: 'Resp. Equipa',
          gestor: 'Gestor',
          mentor: 'Mentor',
          executivo: 'Executivo',
        }).find(([, label]) => label === profileVal);
        if (roleKey && !roles.includes(roleKey[0])) return false;
      }

      if (teamVal && user.Team !== teamVal) return false;

      if (
        searchVal &&
        !(user.DisplayName || '').toLowerCase().includes(searchVal) &&
        !(user.Title || '').toLowerCase().includes(searchVal)
      )
        return false;

      return true;
    });
  }

  // -- build UI --

  function buildUI() {
    // CTA banner
    ctaBanner.children = [
      new Container(
        [
          new Text('Configuracao de Utilizadores', {
            type: 'span',
            class: 'pace-cta-text',
          }),
          new Text(
            'Gerir perfis, permissoes e atribuicao de mentores.',
            { type: 'p', class: 'pace-cta-text' }
          ),
        ],
        { as: 'div' }
      ),
      new Button('Exportar Excel', {
        variant: 'secondary',
        onClickHandler: () => {
          alert('Exportar Excel (placeholder)');
        },
      }),
    ];

    buildFilters();
    rebuildUsersTable();

    profileFilter.subscribe(() => rebuildUsersTable());
    teamFilter.subscribe(() => rebuildUsersTable());
    searchField.subscribe(() => rebuildUsersTable());
  }

  function buildFilters() {
    const profileOptions = ['Colaborador', 'Resp. Equipa', 'Gestor', 'Mentor', 'Executivo'];
    const profileCombo = new ComboBox(profileFilter, profileOptions, {
      placeholder: 'Perfil...',
    });
    const teamCombo = new ComboBox(teamFilter, [...TEAMS, 'Transversal', 'CEO'], {
      placeholder: 'Equipa...',
    });
    const searchInput = new TextInput(searchField, {
      placeholder: 'Pesquisar...',
      debounceMs: 300,
    });

    const clearBtn = new Button('Limpar', {
      variant: 'secondary',
      onClickHandler: () => {
        profileFilter.value = '';
        teamFilter.value = '';
        searchField.value = '';
      },
    });

    const countText = new Text(
      [() => `${getFilteredUsers().length} utilizadores`],
      { type: 'span', class: 'pace-filter-count' }
    );

    filterBar.children = [profileCombo, teamCombo, searchInput, clearBtn, countText];
  }

  function rebuildUsersTable() {
    const filtered = getFilteredUsers();

    const cols = ['Nome', 'Equipa', 'Perfil', 'Valida Savings', 'Equipas Atribuidas', 'Email', 'Accoes'];
    const header = buildTableHeader(cols);

    const rows = filtered.map((user) => {
      const roles = parseJsonArray(user.Roles);
      const mentorTeams = parseJsonArray(user.MentorTeams);
      const validatesTeams = parseJsonArray(user.ValidatesTeams);
      const allTeams = [...new Set([...mentorTeams, ...validatesTeams])];

      const roleChips = roles.map(
        (role) =>
          new Text(roleLabel(role), {
            type: 'span',
            class: `pace-chip ${roleChipClass(role)}`,
          })
      );

      const validatesText = validatesTeams.length > 0 ? validatesTeams.join(', ') : '---';
      const assignedText = allTeams.length > 0 ? allTeams.join(', ') : '---';

      const isMentor = roles.includes('mentor');
      const isColab = roles.includes('colaborador') && !isMentor;
      let actionBtn;
      if (isColab) {
        actionBtn = new Button('Tornar Mentor', {
          variant: 'secondary',
          onClickHandler: () => {
            alert('Tornar Mentor (placeholder)');
          },
        });
      } else if (isMentor) {
        actionBtn = new Button('Remover Mentor', {
          variant: 'danger',
          isOutlined: true,
          onClickHandler: () => {
            alert('Remover Mentor (placeholder)');
          },
        });
      } else {
        actionBtn = new Text('---', { type: 'span' });
      }

      return new Container(
        [
          new Text(user.DisplayName || user.Title, { type: 'span' }),
          new Text(user.Team || '---', { type: 'span' }),
          new Container(roleChips, { class: 'pace-chip-group' }),
          new Text(validatesText, { type: 'span' }),
          new Text(assignedText, { type: 'span' }),
          new Text(user.Title, { type: 'span' }),
          actionBtn,
        ],
        { class: 'pace-table-row' }
      );
    });

    if (filtered.length === 0) {
      usersTable.children = [
        header,
        new Text('Nenhum utilizador encontrado.', { type: 'p', class: 'pace-empty' }),
      ];
    } else {
      usersTable.children = [
        new Container([header, ...rows], { class: 'pace-table-wrap' }),
      ];
    }
  }

  // -- init --

  loadData();

  return createPageLayout([ctaBanner, filterBar, usersTable]);
});
