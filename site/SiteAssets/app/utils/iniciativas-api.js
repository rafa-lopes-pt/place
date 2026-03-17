import { SiteApi, generateUUIDv4 } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('Iniciativas');

/**
 * Fetches all initiatives from the Iniciativas list.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  return listApi.getItems({}, { limit: Infinity });
}

/**
 * Fetches a single initiative by UUID.
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
 * Fetches personal initiatives: created by or submitted by the given email.
 * Uses CAML OR query for server-side filtering.
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getPersonal(email) {
  return listApi.getItems({
    $or: [
      { CreatedByEmail: email },
      { SubmittedByEmail: email },
    ],
  }, { limit: Infinity });
}

/**
 * Fetches initiatives by team scope (array of OUIDs).
 * Uses CAML multi-value OR on ImpactedTeamOUID.
 * @param {string[]} ouids
 * @returns {Promise<Array>}
 */
export async function getByTeamScope(ouids) {
  return listApi.getItems({
    ImpactedTeamOUID: { value: ouids, operator: 'Or' },
  }, { limit: Infinity });
}

/**
 * Fetches initiatives by an array of UUIDs.
 * @param {string[]} uuids
 * @returns {Promise<Array>}
 */
export async function getByUUIDs(uuids) {
  if (uuids.length === 0) return [];
  return listApi.getItems({
    UUID: { value: uuids, operator: 'Or' },
  }, { limit: Infinity });
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
