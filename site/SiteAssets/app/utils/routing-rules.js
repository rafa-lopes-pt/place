import { getGovernanceOUID } from './equipas-api.js';

/**
 * Savings routing logic for PDCA validation workflow.
 *
 * Routing rules (from delivery pack):
 * - Gestor RD: Soft savings < 10k, cost saving < 10k, no savings
 * - Gestor RF: Soft savings >= 10k, Hard Savings (any value), savings >= 10k
 * - Executivo (COMEX): Hard saving or savings >= 10k when there is no RF for the team
 */

/** Maps each governance OUID to its assigned Mentor. */
export const MENTOR_MAP = {
  'COM-GOV': { email: 'diogo.legatheaux@cetelem.pt', displayName: 'Diogo Legatheaux' },
  'ITD-GOV': { email: 'diogo.legatheaux@cetelem.pt', displayName: 'Diogo Legatheaux' },
  'STR-GOV': { email: 'diogo.legatheaux@cetelem.pt', displayName: 'Diogo Legatheaux' },
  'OPS-GOV': { email: 'joana.boto@cetelem.pt', displayName: 'Joana Boto' },
  'FIN-GOV': { email: 'joana.boto@cetelem.pt', displayName: 'Joana Boto' },
  'LEG-JRI': { email: 'joana.boto@cetelem.pt', displayName: 'Joana Boto' },
  'RSK-GOV': { email: 'patricia.peixoto@cetelem.pt', displayName: 'Patricia Peixoto' },
};

/** Maps each governance OUID to its Gestor RD. */
export const GESTOR_MAP = {
  'COM-GOV': { email: 'patricia.vitorino@cetelem.pt', displayName: 'Patricia Vitorino' },
  'OPS-GOV': { email: 'pedro.lopes@cetelem.pt', displayName: 'Pedro Lopes' },
  'ITD-GOV': { email: 'ana.correia@cetelem.pt', displayName: 'Ana Correia' },
  'RSK-GOV': { email: 'luisa.costa@cetelem.pt', displayName: 'Luisa Costa' },
  'FIN-GOV': { email: 'luisa.costa@cetelem.pt', displayName: 'Luisa Costa' },
};

/** COMEX / Executivo fallback for high-value or unroutable validations. */
const COMEX_FALLBACK = { email: 'andy.crighton@cetelem.pt', displayName: 'Andy Crighton' };

/**
 * Returns the Mentor for a given ImpactedTeamOUID.
 * Resolves any OUID to its governance level first.
 * @param {string} impactedTeamOUID
 * @returns {{ email: string, displayName: string } | null}
 */
export function getAssignedMentor(impactedTeamOUID) {
  if (!impactedTeamOUID) return null;
  const govOUID = getGovernanceOUID(impactedTeamOUID);
  return MENTOR_MAP[govOUID] || null;
}

/**
 * Determines which Gestor should validate based on routing rules.
 * @param {string} savingType
 * @param {string|number} savingEstimate
 * @param {string} impactedTeamOUID
 * @returns {{ email: string, displayName: string } | null}
 */
export function getAssignedGestor(savingType, savingEstimate, impactedTeamOUID) {
  if (!impactedTeamOUID) return null;
  const govOUID = getGovernanceOUID(impactedTeamOUID);
  const value = parseFloat(String(savingEstimate).replace(/[^\d.]/g, '')) || 0;

  if (savingType === 'Sem saving') {
    return GESTOR_MAP[govOUID] || null;
  }

  if (savingType === 'Soft Saving' && value < 10000) {
    return GESTOR_MAP[govOUID] || null;
  }

  if (savingType === 'Hard Saving' || value >= 10000) {
    const teamGestor = GESTOR_MAP[govOUID];
    if (teamGestor) return teamGestor;
    return COMEX_FALLBACK;
  }

  return GESTOR_MAP[govOUID] || null;
}
