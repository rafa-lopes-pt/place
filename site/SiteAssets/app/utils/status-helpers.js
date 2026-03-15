export const STATUS = {
  RASCUNHO: 'Rascunho',
  SUBMETIDO: 'Submetido',
  VALIDADO_MENTOR: 'Validado Mentor',
  EM_EXECUCAO: 'Em Execucao',
  POR_VALIDAR: 'Por Validar',
  VALIDADO_GESTOR: 'Validado Gestor',
  IMPLEMENTADO: 'Implementado',
  EM_REVISAO: 'Em Revisao',
  REJEITADO: 'Rejeitado',
  CANCELADO: 'Cancelado',
};

/** Linear progression for the standard PDCA lifecycle. */
export const STATUS_FLOW = [
  STATUS.RASCUNHO,
  STATUS.SUBMETIDO,
  STATUS.VALIDADO_MENTOR,
  STATUS.EM_EXECUCAO,
  STATUS.POR_VALIDAR,
  STATUS.VALIDADO_GESTOR,
  STATUS.IMPLEMENTADO,
];

/** Display-friendly labels for the UI (Portuguese). */
export const STATUS_LABELS = {
  [STATUS.RASCUNHO]: 'Rascunho',
  [STATUS.SUBMETIDO]: 'Em Validacao Projecto',
  [STATUS.VALIDADO_MENTOR]: 'Validado Mentor',
  [STATUS.EM_EXECUCAO]: 'Em Execucao',
  [STATUS.POR_VALIDAR]: 'Em Validacao Savings',
  [STATUS.VALIDADO_GESTOR]: 'Validado Gestor',
  [STATUS.IMPLEMENTADO]: 'Implementado',
  [STATUS.EM_REVISAO]: 'Em Revisao',
  [STATUS.REJEITADO]: 'Rejeitado',
  [STATUS.CANCELADO]: 'Cancelado',
};

/**
 * Valid status transitions. Each key maps to the list of statuses it can move to.
 * Cancellation by owner is handled separately (any non-terminal -> Cancelado).
 */
const TRANSITIONS = {
  [STATUS.RASCUNHO]: [STATUS.SUBMETIDO],
  [STATUS.SUBMETIDO]: [STATUS.VALIDADO_MENTOR, STATUS.EM_REVISAO, STATUS.REJEITADO],
  [STATUS.VALIDADO_MENTOR]: [STATUS.EM_EXECUCAO],
  [STATUS.EM_EXECUCAO]: [STATUS.POR_VALIDAR, STATUS.CANCELADO],
  [STATUS.POR_VALIDAR]: [STATUS.VALIDADO_GESTOR, STATUS.EM_REVISAO, STATUS.REJEITADO],
  [STATUS.VALIDADO_GESTOR]: [STATUS.IMPLEMENTADO],
  [STATUS.EM_REVISAO]: [STATUS.SUBMETIDO],
};

/** Terminal statuses that cannot transition further. */
const TERMINAL = [STATUS.IMPLEMENTADO, STATUS.REJEITADO, STATUS.CANCELADO];

/**
 * Checks if a transition from currentStatus to targetStatus is valid.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {boolean}
 */
export function canTransitionTo(currentStatus, targetStatus) {
  // Owner cancellation: any non-terminal status can move to Cancelado
  if (targetStatus === STATUS.CANCELADO && !TERMINAL.includes(currentStatus)) {
    return true;
  }

  const allowed = TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

/**
 * Returns the display-friendly label for a status value.
 * Falls back to the raw status string if no label is defined.
 * @param {string} status
 * @returns {string}
 */
export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

/**
 * Returns the CSS class for a status chip.
 * @param {string} status
 * @returns {string}
 */
export function chipClass(status) {
  if (status === STATUS.IMPLEMENTADO) return 'pace-chip--done';
  if (status === STATUS.CANCELADO || status === STATUS.RASCUNHO) return 'pace-chip--inactive';
  if (status === STATUS.EM_REVISAO || status === STATUS.REJEITADO) return 'pace-chip--revision';
  if (status === STATUS.SUBMETIDO || status === STATUS.POR_VALIDAR) return 'pace-chip--pending';
  return 'pace-chip--active';
}
