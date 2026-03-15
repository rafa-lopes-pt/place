# Async UX Patterns

Canonical patterns for handling async operations (form submissions, data loading, navigation guards) in SPARC applications.

---

## Minimum Requirements (Non-Negotiable)

Every user-initiated async operation (button click, form submit, data load) MUST follow all three rules. Omitting any one of them is a bug.

1. **`try/catch` around every ListApi call** -- uncaught errors trigger BreakingErrorDialog (full-screen, blocks interaction). Catch them and show a Toast instead.
2. **`isLoading = true` on the triggering button** -- prevents double-submission and gives visual feedback. Reset in `finally`.
3. **Loading feedback via Toast or Loader** -- `Toast.loading()` for non-blocking operations, `Loader` component for blocking operations where the user should wait before proceeding (e.g., form submission before redirect).

These apply to ALL async user actions, not just form submissions -- including delete confirmations, status changes, data refreshes, and any click handler that awaits a Promise.

### Blocking vs Non-Blocking Operations

- **Non-blocking** (user can continue interacting): Use `Toast.loading()` or `Toast.promise()`. Example: saving a draft, refreshing a data table.
- **Blocking** (user must wait for completion): Use the `Loader` component to overlay the relevant page section. Example: creating an item where success triggers a redirect -- show Loader on the form area, redirect only on success, remove Loader on error.

---

## Form Submission Flow

Every form submission follows this sequence:

1. Validate all fields via `schema.isValid` (triggers CSS states on all fields)
2. If invalid: `schema.focusOnFirstInvalid()` + `Toast.error('...')` + return
3. Set submit button `isLoading = true` (auto-disables the button)
4. Show loading toast via `Toast.loading()` or `Toast.promise()`
5. Await the ListApi call(s)
6. Show result toast (`Toast.success` / `Toast.error`)
7. Reset button `isLoading = false` in a `finally` block

```js
const handleSubmit = async () => {
  if (!schema.isValid) {
    schema.focusOnFirstInvalid();
    Toast.error('Please fix the highlighted fields');
    return;
  }

  submitButton.isLoading = true;
  const loading = Toast.loading('Saving...');
  try {
    await listApi.createItem(schema.parse());
    loading.success('Saved successfully');
  } catch (error) {
    loading.error('Failed to save');
  } finally {
    submitButton.isLoading = false;
  }
};
```

## Form Submission with Async Validators

When a form has async validators (e.g., server-side uniqueness checks), use `validateAllAsync()` instead of `schema.isValid`:

```js
const handleSubmit = async () => {
  submitButton.isLoading = true;
  const valid = await schema.validateAllAsync();
  if (!valid) {
    schema.focusOnFirstInvalid();
    Toast.error('Please fix the highlighted fields');
    submitButton.isLoading = false;
    return;
  }

  const loading = Toast.loading('Saving...');
  try {
    await listApi.createItem(schema.parse());
    loading.success('Saved successfully');
  } catch (error) {
    loading.error('Failed to save');
  } finally {
    submitButton.isLoading = false;
  }
};
```

Key differences from the sync flow:
- `isLoading = true` BEFORE validation (async validation may be slow)
- `await schema.validateAllAsync()` replaces `schema.isValid`
- All field validators (sync and async) run in parallel via `Promise.all`
- Fields without validators pass automatically (null !== false)
- The sync `schema.isValid` pattern continues to work for forms that only use sync validators

Use `schema.isValidating` or `field.isValidating` to show loading indicators during async validation.

---

## Toast Selection

- **`Toast.promise(promise, messages)`** -- when a single promise drives the entire operation (fetch, save). Shows loading/success/error automatically.
- **`Toast.loading(message)`** -- when you need to control the lifecycle manually (multiple sequential API calls, conditional success/error messages). Returns a `ToastLoadingController` with `.success()`, `.error()`, `.dismiss()`.
- **`Toast.success/error/info/warning`** -- for one-shot notifications that don't correspond to an in-flight operation.

## Loading State

- **Submit buttons**: Set `isLoading = true` on the Button. The framework adds `disabled` to the HTML element (preventing clicks) and applies the `form-control--loading` CSS class for visual feedback.
- **Page sections**: Use the `Loader` component to cover a region while data loads.
- **Always reset**: Set `isLoading = false` in a `finally` block to guarantee the button is re-enabled even on errors.

## Navigation Prevention

Use `Router.setNavigationGuard()` to block navigation away from forms with unsaved changes.

```js
// Set guard when form becomes dirty
Router.setNavigationGuard(() => {
  if (!schema.isDirty) return true; // no changes -- allow
  return 'You have unsaved changes. Leave this page?';
});

// Clear guard after successful save
Router.clearNavigationGuard();
```

### Guard behavior

- Returns `true` -- navigation proceeds
- Returns `false` -- navigation silently blocked
- Returns a `string` -- Router shows a confirmation Dialog with "Stay" and "Leave" buttons
- `beforeunload` is auto-managed: set when guard is active and returns non-true, cleared when guard is removed
- `Router.unauthorized()` bypasses the guard (terminal transition)

## Error Handling in Form Submissions

ListApi operations throw on failure. Catch errors to show a Toast instead of triggering the BreakingErrorDialog:

```js
try {
  await listApi.updateItem(id, fields, etag);
} catch (error) {
  Toast.error('Update failed. Please try again.');
}
```

Never let ListApi errors propagate uncaught from a user-initiated action (button click, form submit). Uncaught flow-breaking errors reach the ErrorBoundary and display the BreakingErrorDialog. Non-breaking errors (like `ConcurrencyConflict`) auto-show `Toast.error` via ErrorBoundary, but explicit catch is preferred when recovery logic is needed.

## Concurrency Conflict Handling

Write operations (`updateItem`, `deleteItem`) require the item's `odata.etag` from a prior query. If the item was modified since the etag was obtained, SharePoint returns HTTP 412 and SPARC throws `SystemError('ConcurrencyConflict', ..., { breaksFlow: false })`.

**Uncaught path:** ConcurrencyConflict is non-breaking, so ErrorBoundary auto-shows `Toast.error` -- no BreakingErrorDialog.

**Explicit catch (preferred for forms):** When you need to re-fetch and let the user retry:

```js
const handleSubmit = async () => {
  if (!schema.isValid) {
    schema.focusOnFirstInvalid();
    Toast.error('Please fix the highlighted fields');
    return;
  }

  submitButton.isLoading = true;
  const loading = Toast.loading('Saving...');
  try {
    await listApi.updateItem(currentItem.ID, schema.parse(), currentItem['odata.etag']);
    loading.success('Saved successfully');
  } catch (error) {
    if (error.name === 'ConcurrencyConflict') {
      loading.error('This record was modified by another user.');
      // Re-fetch to get the latest version and etag
      const [refreshed] = await listApi.getItemByUUID(currentItem.UUID);
      currentItem = refreshed;
      // Optionally update form fields with refreshed data
    } else {
      loading.error('Failed to save');
    }
  } finally {
    submitButton.isLoading = false;
  }
};
```

## Double-Submission Prevention

The framework handles this automatically: Button renders `disabled` in its HTML when `isLoading` is true. Always set `isLoading = true` before the first `await` and reset in `finally`:

```js
button.isLoading = true;
try {
  await someAsyncWork();
} finally {
  button.isLoading = false;
}
```

No additional guards (click counters, debounce) are needed. The browser natively blocks click events on disabled elements.

## Button vs LinkButton for Navigation

`LinkButton` is for declarative navigation (menus, back buttons, links). `Button` + `Router.navigateTo` is correct inside async handlers where navigation is conditional on success. The async patterns in this document correctly use `Button` for post-save navigation because the navigation depends on the try/catch outcome.

## Delete Confirmation Pattern

Delete operations should use a Dialog for confirmation with the same async safety requirements (try/catch, isLoading, Toast feedback). See the "Delete Confirmation" pattern in `.claude/sparc-guide.md` Section 10 for the complete implementation.

## Common Mistakes

Side-by-side comparison of anti-patterns found in real apps vs the correct implementation.

### Bare async handler (no safety)

```js
// WRONG -- no try/catch, no isLoading, no feedback
const handleSave = async () => {
  await listApi.createItem(schema.parse());
  Router.navigateTo('projects');
};
```

```js
// CORRECT -- all three requirements met
const handleSave = async () => {
  if (!schema.isValid) {
    schema.focusOnFirstInvalid();
    Toast.error('Please fix the highlighted fields');
    return;
  }

  submitButton.isLoading = true;
  const loading = Toast.loading('Saving...');
  try {
    await listApi.createItem(schema.parse());
    loading.success('Saved successfully');
    Router.navigateTo('projects');
  } catch (error) {
    loading.error('Failed to save');
  } finally {
    submitButton.isLoading = false;
  }
};
```

### Missing validation before submit

```js
// WRONG -- submits without checking validity
submitButton.isLoading = true;
await listApi.createItem({ Title: titleField.value });
```

```js
// CORRECT -- validate first, abort early if invalid
if (!schema.isValid) {
  schema.focusOnFirstInvalid();
  Toast.error('Please fix the highlighted fields');
  return;
}
submitButton.isLoading = true;
// ... proceed with try/catch
```

### Manual input sync on auto-syncing components

```js
// WRONG -- TextInput already auto-syncs with its FormField
const searchField = new FormField({ value: '' });
const searchInput = new TextInput(searchField, { placeholder: 'Search...' });
searchInput.setEventHandler('input', (e) => {
  searchField.value = e.target.value;  // redundant, causes double-triggering
});
```

```js
// CORRECT -- rely on TextInput's built-in debounced sync (default 300ms)
const searchField = new FormField({ value: '' });
const searchInput = new TextInput(searchField, { placeholder: 'Search...' });
// Use debounceMs: 0 if you need immediate sync instead of the 300ms default
```

### Inline debounce instead of shared utility

```js
// WRONG -- debounce logic copy-pasted in every route
let timer;
const debounce = (fn, ms) => (...args) => {
  clearTimeout(timer);
  timer = setTimeout(() => fn(...args), ms);
};
```

```js
// CORRECT -- use __lodash.debounce (bundled) or extract to app/utils/
const debouncedSearch = __lodash.debounce((query) => {
  filterResults(query);
}, 300);
```

## Navigation Guards in Practice

Every route with editable forms should set a navigation guard to prevent data loss.

### Setting the guard

Set the guard once, after the form renders. The guard function is re-evaluated on every navigation attempt:

```js
export default defineRoute((config) => {
  config.setRouteTitle('Edit Project');

  const schema = new FormSchema({
    title: new FormField({ value: existingProject.Title }),
    status: new FormField({ value: existingProject.Status }),
  });

  // Guard checks dirty state on every navigation attempt
  Router.setNavigationGuard(() => {
    if (!schema.isDirty) return true;  // no changes -- allow
    return 'You have unsaved changes. Leave this page?';
  });

  const handleSave = async () => {
    // ... validation, isLoading, try/catch ...
    try {
      await listApi.updateItem(id, schema.parse(), etag);
      Router.clearNavigationGuard();  // clear BEFORE navigating away
      Router.navigateTo('projects');
    } catch (error) {
      // ... error handling ...
    }
  };

  return [/* form components */];
});
```

### Key points

- Set guard ONCE per route, not inside event handlers
- The guard function is called fresh on each navigation -- it captures current state via closure
- Clear the guard BEFORE programmatic navigation after a successful save
- `Router.unauthorized()` bypasses guards (terminal redirect to unauthorized page)
- Do NOT manually manage `beforeunload` -- the Router handles it automatically
