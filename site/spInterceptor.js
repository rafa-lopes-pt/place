/**
 * SharePoint REST API Interceptor for SPARC Sandbox
 *
 * Patches jQuery.ajax to intercept SharePoint REST calls and return mock
 * responses from an in-memory store. Enables full offline development
 * without a SharePoint server.
 *
 * Load order: jquery.js -> sharepointContext.js -> spInterceptor.js -> app
 *
 * Public API (global):
 *   SPInterceptor.store     -- in-memory data (user, profile, groups, lists)
 *   SPInterceptor.register  -- add custom endpoint handlers
 *   SPInterceptor.logging   -- toggle console output (default: true)
 */
var SPInterceptor = (function ($) {
  'use strict';

  var PREFIX = '[SPInterceptor]';

  // ==================================================================
  // CONFIGURATION -- edit this section to customize the sandbox identity
  // ==================================================================

  var store = {
    user: {
      Id: 1,
      LoginName: _spPageContextInfo.userLoginName,
      Title: 'John Doe',
      Email: 'john.doe@example.com',
    },

    profile: {
      DisplayName: 'John Doe',
      Email: 'john.doe@example.com',
      Title: 'Software Developer',
      PictureUrl: '',
      PersonalUrl: '',
      DirectReports: { results: [] },
      ExtendedManagers: { results: [] },
      Peers: { results: [] },
      UserProfileProperties: {
        results: [
          { Key: 'Department', Value: 'Engineering', ValueType: 'Edm.String' },
          { Key: 'Office', Value: 'Remote', ValueType: 'Edm.String' },
        ],
      },
    },

    groups: [
      { Id: 1, Title: 'Sandbox Members', Description: 'Default members group', OwnerTitle: 'Admin' },
      { Id: 2, Title: 'Sandbox Owners', Description: 'Default owners group', OwnerTitle: 'Admin' },
    ],

    /** In-memory lists. Pre-populate to seed data for your routes. */
    lists: {},
  };

  // Merge project-specific seed data from sharepointContext.js
  if (typeof _spMockData !== 'undefined') {
    if (_spMockData.user) $.extend(store.user, _spMockData.user);
    if (_spMockData.profile) $.extend(true, store.profile, _spMockData.profile);
    if (_spMockData.groups) store.groups = _spMockData.groups;
    if (_spMockData.lists) {
      Object.keys(_spMockData.lists).forEach(function (title) {
        store.lists[title] = _spMockData.lists[title];
      });
    }
  }

  // ==================================================================
  // INTERNALS
  // ==================================================================

  var logging = true;
  var customHandlers = [];
  var _originalAjax = $.ajax;

  // -- Helpers --

  function _ok(data) {
    return $.Deferred().resolve(data).promise();
  }

  function _fail(status, message) {
    return $.Deferred().reject({ status: status, responseText: message }).promise();
  }

  function _method(s) {
    if (s.type === 'GET') return 'GET';
    return (s.headers && s.headers['X-HTTP-Method']) || s.type || 'GET';
  }

  function _listTitle(url) {
    var m = url.match(/getbytitle\('([^']+)'\)/i);
    return m ? m[1] : null;
  }

  function _itemId(url) {
    var m = url.match(/items\((\d+)\)/);
    return m ? parseInt(m[1], 10) : null;
  }

  function _fieldName(url) {
    var m = url.match(/getbyinternalnameortitle\('([^']+)'\)/i);
    return m ? m[1] : null;
  }

  function _ensureList(title) {
    if (!store.lists[title]) store.lists[title] = { items: [], fields: [], nextId: 1 };
    return store.lists[title];
  }

  function _parseBody(settings) {
    return typeof settings.data === 'string' ? JSON.parse(settings.data) : settings.data || {};
  }

  function _log(method, url, detail) {
    if (logging) console.log(PREFIX, method, url, detail ? '-- ' + detail : '');
  }

  var _mockPeople = [
    {
      Key: 'i:0#.w|domain\\jdoe',
      DisplayText: 'John Doe',
      IsResolved: true,
      EntityType: 'User',
      EntityData: { Email: 'john.doe@example.com', Title: 'Software Developer' },
      Description: 'john.doe@example.com',
      ProviderName: 'Active Directory',
      ProviderDisplayName: 'Active Directory',
      MultipleMatches: [],
    },
    {
      Key: 'i:0#.w|domain\\jsmith',
      DisplayText: 'Jane Smith',
      IsResolved: true,
      EntityType: 'User',
      EntityData: { Email: 'jane.smith@example.com', Title: 'Project Manager' },
      Description: 'jane.smith@example.com',
      ProviderName: 'Active Directory',
      ProviderDisplayName: 'Active Directory',
      MultipleMatches: [],
    },
    {
      Key: 'i:0#.w|domain\\bjohnson',
      DisplayText: 'Bob Johnson',
      IsResolved: true,
      EntityType: 'User',
      EntityData: { Email: 'bob.johnson@example.com', Title: 'Business Analyst' },
      Description: 'bob.johnson@example.com',
      ProviderName: 'Active Directory',
      ProviderDisplayName: 'Active Directory',
      MultipleMatches: [],
    },
    {
      Key: 'i:0#.w|domain\\mgarcia',
      DisplayText: 'Maria Garcia',
      IsResolved: true,
      EntityType: 'User',
      EntityData: { Email: 'maria.garcia@example.com', Title: 'UX Designer' },
      Description: 'maria.garcia@example.com',
      ProviderName: 'Active Directory',
      ProviderDisplayName: 'Active Directory',
      MultipleMatches: [],
    },
    {
      Key: 'i:0#.w|domain\\achen',
      DisplayText: 'Alex Chen',
      IsResolved: true,
      EntityType: 'User',
      EntityData: { Email: 'alex.chen@example.com', Title: 'Data Engineer' },
      Description: 'alex.chen@example.com',
      ProviderName: 'Active Directory',
      ProviderDisplayName: 'Active Directory',
      MultipleMatches: [],
    },
    {
      Key: 'i:0#.w|domain\\swilliams',
      DisplayText: 'Sarah Williams',
      IsResolved: true,
      EntityType: 'User',
      EntityData: { Email: 'sarah.williams@example.com', Title: 'Team Lead' },
      Description: 'sarah.williams@example.com',
      ProviderName: 'Active Directory',
      ProviderDisplayName: 'Active Directory',
      MultipleMatches: [],
    },
  ];

  // -- Custom handler check --

  function _checkCustom(settings) {
    var method = _method(settings);
    var url = settings.url || '';
    for (var i = 0; i < customHandlers.length; i++) {
      var h = customHandlers[i];
      if (h.method !== '*' && h.method !== method) continue;
      var ok =
        typeof h.test === 'string'
          ? url.includes(h.test)
          : h.test instanceof RegExp
            ? h.test.test(url)
            : typeof h.test === 'function'
              ? h.test(url, settings)
              : false;
      if (ok) return h.handler(settings);
    }
    return null;
  }

  // -- Built-in router --

  function _route(settings) {
    var url = settings.url || '';
    var m = _method(settings);

    // Digest refresh
    if (m === 'POST' && url.includes('/_api/contextinfo')) {
      _log('POST', url, 'digest refresh');

      return _ok({
        GetContextWebInformation: {
          FormDigestValue: '0xMOCK_DIGEST_' + Date.now(),
          FormDigestTimeoutSeconds: 1800,
        },
      });
    }

    // People picker search
    if (m === 'POST' && url.includes('clientPeoplePickerSearchUser')) {
      var body = _parseBody(settings);
      var params = body.queryParams;
      var query = (params.QueryString || '').toLowerCase();
      var filtered = _mockPeople.filter(function (p) {
        return p.DisplayText.toLowerCase().indexOf(query) !== -1 ||
               p.EntityData.Email.toLowerCase().indexOf(query) !== -1;
      });
      _log('POST', url, 'people search "' + query + '" -> ' + filtered.length + ' results');
      return _ok({
        d: {
          ClientPeoplePickerSearchUser: JSON.stringify(filtered),
        },
      });
    }

    // Ensure user
    if (m === 'POST' && url.includes('/_api/web/ensureuser')) {
      _log('POST', url, 'ensureUser');
      return _ok({ d: store.user });
    }

    // User groups by ID
    if (m === 'GET' && /getuserbyid\(\d+\)\/groups/.test(url)) {
      _log('GET', url, 'user groups');
      return _ok({ d: { results: store.groups } });
    }

    // User profile (PeopleManager)
    if (m === 'GET' && url.includes('PeopleManager')) {
      _log('GET', url, 'user profile');
      return _ok({ d: store.profile });
    }

    // Site groups
    if (m === 'GET' && url.includes('/_api/web/sitegroups')) {
      _log('GET', url, 'site groups');
      return _ok({ value: store.groups });
    }

    // ---- List-scoped operations ----

    var title = _listTitle(url);

    if (title) {
      var list = _ensureList(title);

      // CAML query (getitems)
      if (m === 'POST' && url.includes('/getitems')) {
        _log('POST', url, title + ' -> ' + list.items.length + ' items');
        var itemsWithEtag = list.items.map(function (item) {
          return $.extend({}, item, { 'odata.etag': '"' + item.Id + '"' });
        });
        return _ok({ value: itemsWithEtag, ListItemCollectionPosition: null });
      }

      // Create item
      if (m === 'POST' && /\/items\s*$|\/items$/.test(url)) {
        var body = _parseBody(settings);
        var item = $.extend({}, body);
        delete item.__metadata;
        item.Id = list.nextId++;
        item.AuthorId = store.user.Id;
        item.Created = new Date().toISOString();
        item.Modified = new Date().toISOString();
        list.items.push(item);
        _log('POST', url, title + ' createItem -> Id ' + item.Id);
        return _ok($.extend({}, item, { 'odata.etag': '"' + item.Id + '"' }));
      }

      // Update item (MERGE)
      if (m === 'MERGE' && /\/items\(\d+\)/.test(url)) {
        var uid = _itemId(url);
        var ifMatch = settings.headers && settings.headers['IF-MATCH'];
        var target = list.items.find(function (i) { return i.Id === uid; });
        // Simulate 412 when IF-MATCH is supplied and does not match the stored etag
        if (target && ifMatch && ifMatch !== '*') {
          var storedEtag = '"' + target.Id + '"';
          if (ifMatch !== storedEtag) {
            _log('MERGE', url, title + ' updateItem ' + uid + ' -- 412 ETag mismatch');
            return _fail(412, 'The request ETag value does not match the current value');
          }
        }
        var ub = _parseBody(settings);
        delete ub.__metadata;
        if (target) $.extend(target, ub, { Modified: new Date().toISOString() });
        _log('MERGE', url, title + ' updateItem ' + uid);
        return _ok(undefined);
      }

      // Delete item
      if (m === 'DELETE' && /\/items\(\d+\)/.test(url)) {
        var did = _itemId(url);
        var delIfMatch = settings.headers && settings.headers['IF-MATCH'];
        var delTarget = list.items.find(function (i) { return i.Id === did; });
        // Simulate 412 when IF-MATCH is supplied and does not match the stored etag
        if (delTarget && delIfMatch && delIfMatch !== '*') {
          var delStoredEtag = '"' + delTarget.Id + '"';
          if (delIfMatch !== delStoredEtag) {
            _log('DELETE', url, title + ' deleteItem ' + did + ' -- 412 ETag mismatch');
            return _fail(412, 'The request ETag value does not match the current value');
          }
        }
        list.items = list.items.filter(function (i) { return i.Id !== did; });
        _log('DELETE', url, title + ' deleteItem ' + did);
        return _ok(undefined);
      }

      // Create field
      if (m === 'POST' && /\/fields$/.test(url)) {
        var fb = _parseBody(settings);
        var existing = list.fields.find(function (f) { return f.InternalName === fb.Title; });
        if (existing) {
          _log('POST', url, title + ' createField DUPLICATE: ' + fb.Title);
          return _fail(409, 'A field with this internal name already exists');
        }
        var field = {
          Title: fb.Title,
          InternalName: fb.Title,
          TypeAsString: fb.FieldTypeKind === 3 ? 'Note' : 'Text',
          FieldTypeKind: fb.FieldTypeKind || 2,
          Hidden: false,
          ReadOnlyField: false,
          Indexed: !!fb.Indexed,
        };
        list.fields.push(field);
        _log('POST', url, title + ' createField: ' + field.Title);
        return _ok(field);
      }

      // Delete field
      if (m === 'DELETE' && url.includes('getbyinternalnameortitle')) {
        var dfn = _fieldName(url);
        list.fields = list.fields.filter(function (f) { return f.InternalName !== dfn; });
        _log('DELETE', url, title + ' deleteField: ' + dfn);
        return _ok(undefined);
      }

      // Set field indexed (MERGE)
      if (m === 'MERGE' && url.includes('getbyinternalnameortitle')) {
        var sfn = _fieldName(url);
        var sfb = _parseBody(settings);
        var ft = list.fields.find(function (f) { return f.InternalName === sfn; });
        if (ft && sfb.Indexed !== undefined) ft.Indexed = sfb.Indexed;
        _log('MERGE', url, title + ' setFieldIndexed: ' + sfn + ' = ' + sfb.Indexed);
        return _ok(undefined);
      }

      // Add field to default view
      if (m === 'POST' && url.includes('addviewfield')) {
        var vfMatch = url.match(/addviewfield\('([^']+)'\)/);
        var vfName = vfMatch ? vfMatch[1] : '?';
        _log('POST', url, title + ' addViewField: ' + vfName);
        return _ok(undefined);
      }

      // Get fields
      if (m === 'GET' && url.includes('/fields')) {
        _log('GET', url, title + ' getFields (' + list.fields.length + ')');
        return _ok({ value: list.fields });
      }

      // Delete list (DELETE on list endpoint, no /items or /fields subpath)
      if (m === 'DELETE') {
        delete store.lists[title];
        _log('DELETE', url, 'deleteList: ' + title);
        return _ok(undefined);
      }
    }

    // Create list (POST /_api/web/lists, no getbytitle)
    if (m === 'POST' && /\/_api\/web\/lists$/.test(url)) {
      var clb = _parseBody(settings);
      if (store.lists[clb.Title]) {
        _log('POST', url, 'createList DUPLICATE: ' + clb.Title);
        return _fail(409, 'A list with this title already exists');
      }
      _ensureList(clb.Title);
      _log('POST', url, 'createList: ' + clb.Title);
      return _ok({ Title: clb.Title, Id: 'mock-' + Date.now() });
    }

    // Get all lists
    if (m === 'GET' && /\/_api\/web\/lists$/.test(url)) {
      var names = Object.keys(store.lists).map(function (t) {
        return { Title: t, Id: 'mock-' + t.toLowerCase().replace(/\s/g, '-') };
      });
      _log('GET', url, 'getLists (' + names.length + ')');
      return _ok({ value: names });
    }

    // Web info (must be last /_api/web handler)
    if (m === 'GET' && /\/_api\/web$/.test(url)) {
      _log('GET', url, 'getWebInfo');
      return _ok({
        Title: _spPageContextInfo.webTitle || 'SPARC Sandbox',
        Url: _spPageContextInfo.webAbsoluteUrl,
      });
    }

    return null;
  }

  // ==================================================================
  // PATCH $.ajax
  // ==================================================================

  $.ajax = function (settings) {
    var result = _checkCustom(settings) || _route(settings);
    if (result) return result;

    console.warn(PREFIX, _method(settings), settings.url, '-- NO HANDLER (falling through)');
    return _originalAjax.call($, settings);
  };

  // ==================================================================
  // PUBLIC API
  // ==================================================================

  console.log(PREFIX, 'Active');

  return {
    store: store,
    register: function (method, test, handler) {
      customHandlers.push({ method: method.toUpperCase(), test: test, handler: handler });
    },
    get logging() {
      return logging;
    },
    set logging(v) {
      logging = !!v;
    },
  };
})(jQuery);
