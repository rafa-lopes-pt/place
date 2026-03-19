import { SiteApi } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('Equipas');

/**
 * Fetches a department by OUID code.
 * @param {string} ouid
 * @returns {Promise<Object|null>}
 */
export async function getDepartment(ouid) {
  const [dept] = await listApi.getItemByTitle(ouid);
  return dept || null;
}

/**
 * Returns the full scope (own OUID + all descendants) for hierarchy-based queries.
 * @param {string} ouid
 * @returns {Promise<string[]>}
 */
export async function getTeamScope(ouid) {
  const dept = await getDepartment(ouid);
  if (!dept) return [ouid];
  const descendants = dept.AllDescendants || [];
  return [ouid, ...descendants];
}

/**
 * Fetches all departments.
 * @returns {Promise<Array>}
 */
export async function getAllDepartments() {
  return listApi.getItems(undefined, { limit: Infinity });
}

/**
 * Resolves the governance-level (depth 1) OUID for any OUID.
 * Used for mentor/gestor routing.
 * @param {string} ouid
 * @returns {string}
 */
export function getGovernanceOUID(ouid) {
  const prefix = ouid.split('-')[0];
  const govMap = {
    COM: 'COM-GOV',
    OPS: 'OPS-GOV',
    ITD: 'ITD-GOV',
    FIN: 'FIN-GOV',
    RSK: 'RSK-GOV',
    STR: 'STR-GOV',
    LEG: 'LEG-JRI',
    CEO: 'CEO-GOV',
  };
  return govMap[prefix] || ouid;
}
