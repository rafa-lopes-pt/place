import { SiteApi } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('SharedInitiatives');

/**
 * Fetches all initiatives shared with a specific user.
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getSharedWithMe(email) {
  return listApi.getItems({ SharedWithEmail: email });
}

/**
 * Shares an initiative with a user.
 * @param {string} initiativeUUID
 * @param {{ email: string, displayName: string }} sharedWith
 * @param {{ email: string, displayName: string }} sharedBy
 * @returns {Promise<unknown>}
 */
export async function shareInitiative(initiativeUUID, sharedWith, sharedBy) {
  return listApi.createItem({
    Title: `Share ${initiativeUUID}`,
    InitiativeUUID: initiativeUUID,
    SharedWithEmail: sharedWith.email,
    SharedWith: sharedWith,
    SharedByEmail: sharedBy.email,
    SharedBy: sharedBy,
  });
}

/**
 * Removes a sharing record by its list item ID.
 * @param {number} id
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function unshareInitiative(id, etag) {
  return listApi.deleteItem(id, etag);
}
