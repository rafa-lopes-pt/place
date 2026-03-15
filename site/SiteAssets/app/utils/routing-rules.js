/**
 * Savings routing logic for PDCA validation workflow.
 *
 * Routing rules (from delivery pack):
 * - Gestor RD (Responsavel de Departamento): Soft savings < 10k, cost saving < 10k, no savings
 * - Gestor RF (Responsavel Financeiro): Soft savings >= 10k, Hard Savings (any value), savings >= 10k
 * - Executivo (COMEX): Hard saving or savings >= 10k when there is no RF for the team
 */

/** Maps each team to its assigned Mentor (UserIdentity-compatible). */
export const MENTOR_MAP = {
  'Dir. Comercial': { email: 'diogo.legatheaux@cetelem.pt', displayName: 'Diogo Legatheaux' },
  'Operacoes': { email: 'joana.boto@cetelem.pt', displayName: 'Joana Boto' },
  'Digital': { email: 'diogo.legatheaux@cetelem.pt', displayName: 'Diogo Legatheaux' },
  'Risco': { email: 'patricia.peixoto@cetelem.pt', displayName: 'Patricia Peixoto' },
  'Financeiro': { email: 'joana.boto@cetelem.pt', displayName: 'Joana Boto' },
};

/** Maps each team to its Gestor RD (Responsavel de Departamento). */
export const GESTOR_MAP = {
  'Dir. Comercial': { email: 'patricia.vitorino@cetelem.pt', displayName: 'Patricia Vitorino' },
  'Operacoes': { email: 'pedro.lopes@cetelem.pt', displayName: 'Pedro Lopes' },
  'Digital': { email: 'ana.correia@cetelem.pt', displayName: 'Ana Correia' },
  'Risco': { email: 'luisa.costa@cetelem.pt', displayName: 'Luisa Costa' },
  'Financeiro': { email: 'luisa.costa@cetelem.pt', displayName: 'Luisa Costa' },
};

/** COMEX / Executivo fallback for high-value or unroutable validations. */
const COMEX_FALLBACK = { email: 'andy.crighton@cetelem.pt', displayName: 'Andy Crighton' };

/**
 * Returns the UserIdentity-compatible object for the team's assigned Mentor.
 * @param {string} team
 * @returns {{ email: string, displayName: string } | null}
 */
export function getAssignedMentor(team) {
  return MENTOR_MAP[team] || null;
}

/**
 * Determines which Gestor should validate the savings based on routing rules.
 *
 * - No savings or Soft < 10k -> Gestor RD (team's department gestor)
 * - Hard Saving (any value) or Soft >= 10k -> Gestor RF (financial gestor)
 * - Fallback to COMEX if no gestor is mapped for the team
 *
 * @param {string} savingType - 'Sem saving', 'Soft Saving', or 'Hard Saving'
 * @param {string|number} savingEstimate - estimated saving value
 * @param {string} team - initiative team name
 * @returns {{ email: string, displayName: string } | null}
 */
export function getAssignedGestor(savingType, savingEstimate, team) {
  const value = parseFloat(String(savingEstimate).replace(/[^\d.]/g, '')) || 0;

  // No savings declared -> Gestor RD
  if (savingType === 'Sem saving') {
    return GESTOR_MAP[team] || null;
  }

  // Soft Saving under 10k -> Gestor RD
  if (savingType === 'Soft Saving' && value < 10000) {
    return GESTOR_MAP[team] || null;
  }

  // Hard Saving (any value) or Soft >= 10k -> Gestor RF
  // RF is the financial-side gestor. In current org, team gestors handle both roles.
  // If the team has a mapped gestor, use it; otherwise fall back to COMEX.
  if (savingType === 'Hard Saving' || value >= 10000) {
    const teamGestor = GESTOR_MAP[team];
    if (teamGestor) return teamGestor;
    return COMEX_FALLBACK;
  }

  return GESTOR_MAP[team] || null;
}
