import { ListApi, generateUUIDv4 } from '../libs/nofbiz/nofbiz.base.js';

export const listApi = new ListApi('Iniciativas');

/**
 * Fetches all initiatives from the Iniciativas list.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  return listApi.getItems({}, { limit: Infinity });
}

/**
 * Fetches a single initiative by UUID.
 * Returns the first match (UUIDs are unique).
 * @param {string} uuid
 * @returns {Promise<Array>}
 */
export async function getByUUID(uuid) {
  return listApi.getItemByUUID(uuid);
}

/**
 * Fetches initiatives owned by the current user.
 * @returns {Promise<Array>}
 */
export async function getOwned() {
  return listApi.getOwnedItems();
}

/**
 * Fetches initiatives filtered by Status.
 * @param {string} status
 * @returns {Promise<Array>}
 */
export async function getByStatus(status) {
  return listApi.getItems({ Status: status });
}

/**
 * Fetches initiatives filtered by Team.
 * @param {string} team
 * @returns {Promise<Array>}
 */
export async function getByTeam(team) {
  return listApi.getItems({ Team: team });
}

/**
 * Creates a new initiative with auto-generated UUID and PDCA code.
 * @param {Record<string, unknown>} fields
 * @returns {Promise<unknown>}
 */
export async function create(fields) {
  const allItems = await listApi.getItems({}, { limit: Infinity });
  const maxCode = allItems.reduce((max, item) => {
    const num = parseInt(item.Code?.replace('PDCA-', '') || '0', 10);
    return num > max ? num : max;
  }, 0);
  const nextCode = `PDCA-${String(maxCode + 1).padStart(3, '0')}`;

  return listApi.createItem({
    ...fields,
    UUID: generateUUIDv4(),
    Code: nextCode,
  });
}

/**
 * Updates an existing initiative.
 * @param {number} id
 * @param {Record<string, unknown>} fields
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function update(id, fields, etag) {
  return listApi.updateItem(id, fields, etag);
}

/**
 * Transitions an initiative to a new status, optionally setting extra fields.
 * @param {number} id
 * @param {string} newStatus
 * @param {string} etag
 * @param {Record<string, unknown>} [extraFields={}]
 * @returns {Promise<unknown>}
 */
export async function transitionStatus(id, newStatus, etag, extraFields = {}) {
  return listApi.updateItem(id, { Status: newStatus, ...extraFields }, etag);
}
