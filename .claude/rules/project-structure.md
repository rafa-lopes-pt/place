# Project Structure Rules

File and folder organization conventions. Designed to be replicable across projects.

---

## Utility File Placement

- Global utilities (shared across multiple route groups) go in `app/utils/`
- Route-group utilities go in `app/routes/<group>/utils/`
- The `app/routes/` tree is for routes only; non-route files belong in `utils/` subfolders
- CSS shared across routes goes in `app/css/`, not duplicated per route
- Each route folder should contain only `route.js` and optionally a `route.css` for route-specific overrides

## Directory Structure Reference

```
app/
  css/                    # Shared stylesheets
  media/                  # Static assets (images, logos, backgrounds)
  utils/                  # Global utilities (shared across route groups)
  routes/
    route.js              # Home route
    route.css             # Home-specific styles only
    <group>/
      <name>/
        route.js
        route.css         # ONLY route-specific overrides (if any)
      utils/              # Utilities scoped to this route group
```

## Common Utilities

These patterns recur across SPARC apps. Extract them to `app/utils/` rather than duplicating inline.

### Debounce

Use `__lodash.debounce` (bundled in SPARC base). No need for custom debounce closures.

### Success Screen with Redirect

Shows a confirmation message and redirects after a delay. Used after create/submit flows:

```javascript
// app/utils/success-screen.js
export function createSuccessScreen(message, redirectPath, delayMs = 3000) {
  setTimeout(() => Router.navigateTo(redirectPath), delayMs);
  return new Container([
    new Text(message, { type: 'h2' }),
    new Text(`Redirecting in ${delayMs / 1000} seconds...`, { type: 'p' }),
  ], { class: 'success-screen' });
}
```

### ComboBox Value Extraction

ComboBox values are objects `{ key, text }` from dropdown selection or strings from programmatic assignment. Safely extract:

```javascript
// app/utils/form-helpers.js
export function getComboBoxValue(field) {
  const val = field.value;
  if (val && typeof val === 'object') return val.text;
  return val || '';
}
```

### PeoplePicker Value Extraction

PeoplePicker stores `UserIdentity` as `ComboBoxOptionProps.value`. Extract user data and store to lists directly:

```javascript
// PeoplePicker option.value is UserIdentity
const identity = personField.value?.value;   // UserIdentity
identity.email;                               // 'john@company.com'
identity.displayName;                         // 'John Doe'

// Store to list (auto-serialized via toJSON)
await api.createItem({ AssignedTo: identity });

// Read back from list
const assignee = UserIdentity.fromField(item.AssignedTo);
```

### Detail Page Header

Reusable header with back navigation and status indicator:

```javascript
// app/utils/detail-header.js
export function createDetailHeader(title, statusText, backRoute) {
  return new Container([
    new LinkButton('Back', backRoute, { variant: 'secondary' }),
    new Container([
      new Text(title, { type: 'h1' }),
      new Text(statusText, { type: 'span', class: 'status-badge' }),
    ], { class: 'header-title-row' }),
  ], { class: 'detail-header' });
}
```

These are recommended starting points. Not every app needs all of them -- create only what you use.
