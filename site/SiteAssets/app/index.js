import {
	pageReset,
	Router,
	CurrentUser,
	RoleManager,
	ContextStore,
	SiteApi,
	resolvePath,
	StyleResource,
} from "./libs/nofbiz/nofbiz.base.js";

await pageReset({
	themePath: resolvePath("@/css/pace-theme.css"),
	clearConsole: false,
});

const appStyles = new StyleResource("@/css/styles.css");
// const themeStyles = new StyleResource("@/css/pace-theme.css");
await Promise.all([appStyles.ready]);

const user = await new CurrentUser().initialize([]);

const roleManager = new RoleManager();
await roleManager.load("UserRoles");

const siteApi = new SiteApi();
ContextStore.set("siteApi", siteApi);
ContextStore.set("roleManager", roleManager);
ContextStore.set("currentUser", user);

// Load user's OUID from UserRoles
const userRolesApi = siteApi.list('UserRoles');
const [userRecord] = await userRolesApi.getItemByTitle(user.get('email'));
ContextStore.set('userOUID', userRecord?.OUID || '');

const routes = ["instrucoes", "pessoal", "departamento"];

if (roleManager.hasRole("mentor")) {
	routes.push("mentoria");
}
if (roleManager.hasRole("gestor")) {
	routes.push("gestor");
}

routes.push("catalogo", "dashboard");

if (roleManager.hasRole("mentor")) {
	routes.push("admin");
}

ContextStore.set("routes", routes);

new Router(routes);
