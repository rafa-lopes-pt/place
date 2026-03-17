import { ContextStore } from '../libs/nofbiz/nofbiz.base.js';

export const ROLES = {
  COLABORADOR: 'colaborador',
  RESP_EQUIPA: 'resp_equipa',
  GESTOR: 'gestor',
  MENTOR: 'mentor',
  EXECUTIVO: 'executivo',
};

export const PERMISSION_MAP = {
  inicio: ['*'],
  instrucoes: ['*'],
  pessoal: ['colaborador', 'resp_equipa', 'gestor', 'mentor'],
  departamento: ['colaborador', 'resp_equipa', 'gestor', 'mentor'],
  mentoria: ['mentor'],
  gestor: ['gestor'],
  catalogo: ['*'],
  dashboard: ['*'],
  admin: ['mentor'],
  submeter: ['colaborador', 'resp_equipa', 'gestor', 'mentor'],
  aprovar_projecto: ['mentor'],
  validar_savings_auto: ['gestor'],
  validar_savings_final: ['mentor'],
  solicitar_revisao: ['gestor', 'mentor'],
  rejeitar: ['gestor', 'mentor'],
  cancelar_proprio: ['colaborador', 'resp_equipa', 'gestor', 'mentor'],
  editar: ['colaborador', 'resp_equipa', 'gestor', 'mentor'],
  administracao: ['mentor'],
};

/**
 * Returns the RoleManager instance stored during app initialization.
 * @returns {RoleManager}
 */
export function getRoleManager() {
  return ContextStore.get('roleManager');
}

/**
 * Returns the current user's OUID from ContextStore (set during app init).
 * @returns {string}
 */
export function getUserOUID() {
  return ContextStore.get('userOUID') || '';
}

/**
 * Checks if the current user has a specific role.
 * @param {string} role
 * @returns {boolean}
 */
export function hasProfile(role) {
  return getRoleManager().hasRole(role);
}

/**
 * Checks if the current user has at least one of the given roles.
 * @param {string[]} roles
 * @returns {boolean}
 */
export function hasAnyProfile(roles) {
  return getRoleManager().hasAnyRole(roles);
}

/**
 * Checks if the current user can access a given area based on PERMISSION_MAP.
 * @param {string} area
 * @returns {boolean}
 */
export function canAccess(area) {
  return getRoleManager().canAccess(area, PERMISSION_MAP);
}

/**
 * Returns the current user's roles array.
 * @returns {string[]}
 */
export function getUserRoles() {
  return getRoleManager().roles;
}
