/**
 * Mock SharePoint context for local development.
 * Provides the minimum _spPageContextInfo fields required by the SPARC framework.
 */
var _spPageContextInfo = {
  webAbsoluteUrl: `${location.origin}/site`,
  webTitle: 'SPARC Application',
  formDigestValue: '0x1234MOCK_DIGEST_VALUE_FOR_SANDBOX',
  formDigestTimeoutSeconds: 1800,
  userLoginName: 'i:0#.w|SANDBOX\\john.doe',
};

/**
 * Mock data for SPInterceptor.
 * Define seed data here -- spInterceptor reads this on initialization.
 * This file is project-specific and NOT overwritten by sparc-update-dist.
 */
var _spMockData = {
  // Override default mock user identity (partial -- only specified fields are merged)
  // user: {
  //   Title: 'John Doe',
  //   Email: 'john.doe@company.com',
  // },

  // Override default mock user profile (partial -- deep merge)
  // profile: {
  //   Title: 'Software Developer',
  // },

  // Override default mock groups (full replacement)
  // groups: [
  //   { Id: 1, Title: 'App Members', Description: 'Members group', OwnerTitle: 'Admin' },
  //   { Id: 2, Title: 'App Owners', Description: 'Owners group', OwnerTitle: 'Admin' },
  // ],

  // Pre-populate SharePoint lists with seed data
  // lists: {
  //   'Tasks': {
  //     items: [
  //       { Id: 1, Title: 'Example task', Status: 'Active', AuthorId: 1 },
  //     ],
  //     fields: [],
  //     nextId: 2,
  //   },
  // },
};
