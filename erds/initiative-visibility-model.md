# Initiative Visibility & Access Model

## Summary

This document defines the data model and query logic for initiative visibility in the PLACE application. The current implementation uses 5 flat team names with `getAll()` + client-side filtering on every route. This design replaces that with:

- **OUID-based team hierarchy** (33 departments from `equipas.csv`) for scoped team visibility
- **Identity-based queries** for personal views that survive team changes
- **SharedInitiatives junction list** for explicit initiative sharing between users
- **Two distinct views**: "Pessoal" (personal) and "Departamento" (team-scoped via hierarchy)

The Departamento route (`site/SiteAssets/app/routes/departamento/route.js`) is the team-scoped view where users see all initiatives belonging to their organizational unit and all descendant units.

---

## Current State (before changes)

### Data model
- **Iniciativas list** fields: `Owner` (UserIdentity), `OwnerEmail` (Text), `CreatedByEmail` (Text), `CreatedByName` (Text), `Team` (one of 5 flat strings: Dir. Comercial, Operacoes, Digital, Risco, Financeiro)
- **UserRoles list** fields: `Title` (email), `DisplayName`, `Team` (flat string), `Roles` (JSON array), `MentorTeams`, `ValidatesTeams`, `IsActive`
- No hierarchy awareness, no sharing mechanism

### Query pattern
- Every route calls `getAll()` (fetches entire Iniciativas list) then filters client-side
- Pessoal route filters by `CreatedByEmail === currentEmail || OwnerEmail === currentEmail`
- Departamento route currently duplicates the Pessoal pattern (same code, same `getAll()` + client filter)

### Key files
| File | Purpose |
|------|---------|
| `app/utils/iniciativas-api.js` | Iniciativas CRUD (getAll, getByUUID, create, update, transitionStatus) |
| `app/utils/roles.js` | ROLES, TEAMS (flat array), PERMISSION_MAP, RoleManager accessors |
| `app/utils/routing-rules.js` | MENTOR_MAP, GESTOR_MAP (flat team-to-person mappings) |
| `app/utils/new-initiative.js` | Create/edit initiative modal (sets Owner, Team, etc.) |
| `app/utils/side-panel-detail.js` | Initiative detail panel (reads Owner, Team for display) |
| `app/utils/status-helpers.js` | STATUS enum, status labels, chip classes, transitions |
| `app/utils/filters.js` | Reusable filter bar (status + saving type + search) |
| `app/routes/pessoal/route.js` | Personal view (owned items + open items table) |
| `app/routes/departamento/route.js` | Team view (currently a copy of pessoal, to be reworked) |
| `sharepointContext.js` | Mock data for offline dev (Iniciativas, UserRoles seed data) |

---

## Decisions Made

| Question | Decision |
|----------|----------|
| `CreatedBy` vs `Owner` | `CreatedBy` replaces `Owner` (same concept, renamed) |
| `ImpactedTeamOUID` cardinality | Single-value (one team per initiative) |
| Hierarchy storage | SharePoint list ("Equipas", 33 rows) |
| User-to-OUID mapping | New `OUID` field on UserRoles list |
| `SubmittedBy` semantics | Set when a draft is formally submitted to the system; null while in Rascunho status |

---

## Proposed Data Model

### Iniciativas List (field changes)

| Field | Type | Indexed | Change | Purpose |
|-------|------|---------|--------|---------|
| `CreatedBy` | Note (UserIdentity) | no | Replaces `Owner` | Initiative author (rich data for display) |
| `CreatedByEmail` | Text | yes | Replaces `OwnerEmail` | CAML-queryable email for personal view |
| `SubmittedBy` | Note (UserIdentity) | no | New | Set when draft is submitted |
| `SubmittedByEmail` | Text | yes | New | CAML-queryable email for personal view |
| `ImpactedTeamOUID` | Text | yes | Replaces `Team` | OUID code (e.g. `COM-BKP`) |
| `Mentor` | Note (UserIdentity) | no | Already exists | No change |

**Removed fields**: `Owner`, `OwnerEmail`, `Team`

**Why parallel email fields?** UserIdentity serializes to JSON (e.g. `{"email":"user@company.com","displayName":"John"}`). CAML `Eq` requires exact string match, which is fragile against JSON. Plain text indexed email fields enable efficient server-side `Eq` queries. This follows the existing pattern -- the current code already has `CreatedByEmail`/`OwnerEmail` alongside `Owner` (UserIdentity).

### SharedInitiatives List (new)

| Field | Type | Indexed | Purpose |
|-------|------|---------|---------|
| `Title` | Text | yes | SP default |
| `InitiativeUUID` | Text | yes | FK to Iniciativas.UUID |
| `SharedWithEmail` | Text | yes | Email of recipient (CAML queries) |
| `SharedWith` | Note | no | UserIdentity of recipient (display) |
| `SharedByEmail` | Text | no | Who shared it |
| `SharedBy` | Note | no | UserIdentity of sharer |

### Equipas List (new -- 33 rows, from `equipas.csv`)

| Field | Type | Indexed | Purpose |
|-------|------|---------|---------|
| `Title` | Text | yes | OUID code (e.g. `COM-BKP`) |
| `DeptName` | Text | no | Display name (e.g. "BANKING PARTNERSHIPS") |
| `ParentOUID` | Text | no | Parent department code |
| `Depth` | Text | no | Tree depth (0 = CEO office) |
| `DeptHead` | Text | no | Employee ID of department head |
| `DeptHeadName` | Text | no | Display name of department head |
| `AllDescendants` | Note | no | JSON array of all descendant OUIDs |

### UserRoles List (one new field)

| Field | Type | Change |
|-------|------|--------|
| `OUID` | Text | New -- user's organizational unit code (e.g. `COM-BKP`) |

---

## Hierarchy Structure (from `equipas.csv`)

The hierarchy is a tree with depth 0-4. Lower depth = higher in org chart.

```
CEO-GOV (depth 0) -- CEO Office
  COM-GOV (1) -- Commercial
    COM-BKP (2) -- Banking Partnerships
      COM-BRP (3) -- Broker Partnerships
        COM-STF (4) -- Stock Financing
      COM-DRC (3) -- Strategy & Planning DRC
      COM-MOB (3) -- Mobility OEM & Top Dealers
      COM-RMI (3) -- Relational Marketing & Insurance
  FIN-GOV (1) -- Finance
    FIN-CTB (2) -- Contabilidade e Tesouraria
    FIN-GRF (2) -- Granting & Financing
  ITD-GOV (1) -- IT & Digital
    ITD-CGP (2) -- COE IT Governance and Performance Excellence
    ITD-DAT (2) -- COE Data
    ITD-ODD (2) -- TIBRO ODD
    ITD-SRV (2) -- IT Service Delivery
  LEG-JRI (1) -- Juridico e Relacoes Institucionais
    LEG-JUR (2) -- Juridico
  OPS-GOV (1) -- Operations
    OPS-BSP (2) -- Operations & Business Support
    OPS-CCR (2) -- Customer Care & Rebound
    OPS-COL (2) -- Operational Collections
  RSK-GOV (1) -- Risk & Compliance
    RSK-ANA (2) -- Risk Analytics
    RSK-REG (2) -- Risk Governance & Regulatory
      RSK-CCT (3) -- Conduct & Control
  STR-GOV (1) -- Strategy & Transformation
    STR-AGI (2) -- Transformation & COE Agile
    STR-COO (2) -- Direccao COO & Transformation
    STR-MKT (2) -- Strategic Marketing & COE CX & Innovation
      STR-BRD (3) -- D.Brand Communication & Offer
    STR-SYN (2) -- Group Synergies
```

**Key property**: Each department row in `equipas.csv` has a pre-computed `AllDescendants` JSON array. This avoids recursive tree traversal at query time.

**Example**: `COM-BKP` (depth 2) has `AllDescendants: ["COM-BRP", "COM-DRC", "COM-MOB", "COM-RMI", "COM-STF"]`. A user in COM-BKP sees initiatives from all 6 teams (own + 5 descendants).

**Edge case**: `CEO-GOV` has 32 descendants (all other teams). The CAML OR clause will be large but SPARC handles multi-value OR natively.

---

## Query Logic

### Pessoal Route (Personal View)

**Goal**: Show all initiatives belonging to the user, regardless of team changes.

```
Step 1: CAML query Iniciativas WHERE CreatedByEmail = me OR SubmittedByEmail = me
Step 2: CAML query SharedInitiatives WHERE SharedWithEmail = me
Step 3: If shared results exist, CAML query Iniciativas WHERE UUID IN [shared UUIDs]
Step 4: Merge step 1 + step 3, deduplicate by UUID
```

CAML pseudo-code:
```js
// Step 1 -- my initiatives (created or submitted by me)
const personal = await iniciativasApi.getItems({
  $or: [
    { CreatedByEmail: currentEmail },
    { SubmittedByEmail: currentEmail }
  ]
}, { limit: Infinity });

// Step 2 -- shared with me
const sharedRecords = await sharedApi.getItems({ SharedWithEmail: currentEmail });

// Step 3 -- fetch the actual initiatives that were shared (if any)
let sharedItems = [];
if (sharedRecords.length > 0) {
  const uuids = sharedRecords.map(r => r.InitiativeUUID);
  sharedItems = await iniciativasApi.getItems({
    UUID: { value: uuids, operator: 'Or' }
  });
}

// Step 4 -- merge and deduplicate
const seenUUIDs = new Set(personal.map(i => i.UUID));
const merged = [...personal];
for (const item of sharedItems) {
  if (!seenUUIDs.has(item.UUID)) {
    merged.push(item);
    seenUUIDs.add(item.UUID);
  }
}
```

**Why this works across team changes**: The query is identity-based (email), not team-based. If a user moves from COM-BKP to FIN-GOV, their personal initiatives remain visible because the CreatedByEmail/SubmittedByEmail fields on those items don't change.

### Departamento Route (Team-Scoped View)

**Goal**: Show all initiatives from the user's team and all descendant teams in the hierarchy.

```
Step 1: Get user's OUID from UserRoles (loaded at app init via RoleManager)
Step 2: CAML query Equipas WHERE Title = myOUID -> parse AllDescendants
Step 3: Build scope = [myOUID, ...allDescendants]
Step 4: CAML query Iniciativas WHERE ImpactedTeamOUID IN scope
```

CAML pseudo-code:
```js
// Step 1 -- user's OUID (from RoleManager, already loaded)
const userOUID = getRoleManager().ouid;

// Step 2 -- hierarchy lookup (single query, 1 result)
const [dept] = await equipasApi.getItems({ Title: userOUID });
const descendants = dept.AllDescendants || []; // auto-parsed from JSON by SPARC

// Step 3+4 -- scoped initiative query
const scope = [userOUID, ...descendants];
const teamItems = await iniciativasApi.getItems({
  ImpactedTeamOUID: { value: scope, operator: 'Or' }
}, { limit: Infinity });
```

**Visibility rule**: A user in team C sees initiatives from C and all teams below C in the tree. They do NOT see initiatives from teams above them (parent, grandparent, etc.). This is a downward-only visibility model.

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/utils/iniciativas-api.js` | Rename Owner->CreatedBy fields; add `getPersonal(email)`, `getByTeamScope(ouids)` methods; add `getItemsByUUIDs(uuids)` helper |
| `app/utils/roles.js` | Add `ouid` accessor to RoleManager helpers; replace flat `TEAMS` array with OUID-based resolution |
| `app/utils/routing-rules.js` | Adapt MENTOR_MAP/GESTOR_MAP to use OUIDs |
| `app/utils/new-initiative.js` | Set `CreatedBy`/`CreatedByEmail`/`ImpactedTeamOUID` on create; set `SubmittedBy`/`SubmittedByEmail` on submit |
| `app/utils/side-panel-detail.js` | Update field references (Owner->CreatedBy, Team->ImpactedTeamOUID display) |
| `app/routes/pessoal/route.js` | Replace `getAll()` + client filter with `getPersonal()` + shared query |
| `app/routes/departamento/route.js` | Replace `getAll()` + client filter with hierarchy-scoped `getByTeamScope()` |
| `sharepointContext.js` | Add Equipas + SharedInitiatives mock lists; update Iniciativas mock fields; add OUID to UserRoles |

## New Files

| File | Purpose |
|------|---------|
| `app/utils/equipas-api.js` | Equipas list API: hierarchy lookup, descendant resolution |
| `app/utils/shared-api.js` | SharedInitiatives list API: share/unshare, get shared with me |

---

## Open Items (to revisit)

- **Sharing UX**: The "Partilhar" button exists as a stub in `side-panel-detail.js`. Needs design for who can share, with whom (PeoplePicker? whole team?), and whether shared access can be revoked.
- **Confidential initiatives**: The `IsConfidential` field exists. Interaction with team visibility TBD (should confidential items be hidden from the Departamento view even for same-team users?).
- **ImpactedTeamOUID selection**: When creating an initiative, the user currently picks from 5 flat teams via ComboBox. This needs to become an OUID picker (33 departments, possibly filtered by the user's own scope).

---

## Verification Plan

1. **Mock data**: Populate Equipas list (33 rows from CSV), SharedInitiatives with sample entries, update Iniciativas fields
2. **Pessoal -- identity query**: Login as different mock users, confirm they see only created/submitted + shared initiatives
3. **Departamento -- hierarchy scope**: Login as COM-BKP user (depth 2), confirm visibility of COM-BKP + COM-BRP + COM-DRC + COM-MOB + COM-RMI + COM-STF
4. **Departamento -- top-level**: Login as CEO-GOV user, confirm all 32 descendant teams visible
5. **Team change resilience**: Change a mock user's OUID, confirm Pessoal unchanged but Departamento scope shifts
6. **Sharing**: Add SharedInitiatives record, confirm it appears in recipient's Pessoal view
