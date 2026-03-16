import {
  pageReset,
  Router,
  CurrentUser,
  RoleManager,
  ContextStore,
  SiteApi,
  resolvePath,
  StyleResource,
} from './libs/nofbiz/nofbiz.base.js';
import { renderNavbar } from './utils/navbar.js';

await pageReset({
  themePath: resolvePath('@/libs/nofbiz/nofbiz.base.css'),
  clearConsole: false,
});

const appStyles = new StyleResource('@/css/styles.css');
const themeStyles = new StyleResource('@/css/pace-theme.css');
await Promise.all([appStyles.ready, themeStyles.ready]);

const user = await new CurrentUser().initialize();

const roleManager = new RoleManager();
await roleManager.load('UserRoles');

const siteApi = new SiteApi();
ContextStore.set('siteApi', siteApi);
ContextStore.set('roleManager', roleManager);
ContextStore.set('currentUser', user);

const routes = ['instrucoes', 'pessoal'];

if (roleManager.hasRole('mentor')) {
  routes.push('mentoria');
}
if (roleManager.hasRole('gestor')) {
  routes.push('gestor');
}

routes.push('catalogo', 'dashboard');

if (roleManager.hasRole('mentor')) {
  routes.push('admin');
}

renderNavbar(routes, user, roleManager);

new Router(routes);
