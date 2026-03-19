import { ContextStore } from '../libs/nofbiz/nofbiz.base.js';

export const TEAM_OPTIONS = [
  { label: 'COM-GOV - Commercial', value: 'COM-GOV' },
  { label: 'COM-BKP - Banking Partnerships', value: 'COM-BKP' },
  { label: 'COM-BRP - Broker Partnerships', value: 'COM-BRP' },
  { label: 'COM-DRC - Strategy & Planning DRC', value: 'COM-DRC' },
  { label: 'COM-MOB - Mobility OEM & Top Dealers', value: 'COM-MOB' },
  { label: 'COM-RMI - Relational Marketing & Insurance', value: 'COM-RMI' },
  { label: 'COM-STF - Stock Financing', value: 'COM-STF' },
  { label: 'FIN-GOV - Finance', value: 'FIN-GOV' },
  { label: 'FIN-CTB - Contabilidade e Tesouraria', value: 'FIN-CTB' },
  { label: 'FIN-GRF - Granting & Financing', value: 'FIN-GRF' },
  { label: 'ITD-GOV - IT & Digital', value: 'ITD-GOV' },
  { label: 'ITD-CGP - COE IT Governance', value: 'ITD-CGP' },
  { label: 'ITD-DAT - COE Data', value: 'ITD-DAT' },
  { label: 'ITD-ODD - TIBRO ODD', value: 'ITD-ODD' },
  { label: 'ITD-SRV - IT Service Delivery', value: 'ITD-SRV' },
  { label: 'LEG-JRI - Juridico e Relacoes Inst.', value: 'LEG-JRI' },
  { label: 'LEG-JUR - Juridico', value: 'LEG-JUR' },
  { label: 'OPS-GOV - Operations', value: 'OPS-GOV' },
  { label: 'OPS-BSP - Operations & Business Support', value: 'OPS-BSP' },
  { label: 'OPS-CCR - Customer Care & Rebound', value: 'OPS-CCR' },
  { label: 'OPS-COL - Operational Collections', value: 'OPS-COL' },
  { label: 'RSK-GOV - Risk & Compliance', value: 'RSK-GOV' },
  { label: 'RSK-ANA - Risk Analytics', value: 'RSK-ANA' },
  { label: 'RSK-REG - Risk Governance & Regulatory', value: 'RSK-REG' },
  { label: 'RSK-CCT - Conduct & Control', value: 'RSK-CCT' },
  { label: 'STR-GOV - Strategy & Transformation', value: 'STR-GOV' },
  { label: 'STR-AGI - Transformation & COE Agile', value: 'STR-AGI' },
  { label: 'STR-BRD - Brand Communication & Offer', value: 'STR-BRD' },
  { label: 'STR-COO - Direccao COO & Transformation', value: 'STR-COO' },
  { label: 'STR-MKT - Strategic Marketing & COE CX', value: 'STR-MKT' },
  { label: 'STR-SYN - Group Synergies', value: 'STR-SYN' },
];

export const TEAMS = TEAM_OPTIONS.map((t) => t.value);

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
