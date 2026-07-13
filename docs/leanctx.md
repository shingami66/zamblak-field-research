# LeanCTX Protocol: Zamblak Agents

## 1. Purpose
The LeanCTX protocol exists to keep each agent task small, source-controlled, and strictly focused on the explicit task at hand. This prevents agents from over-reading the repository, overbuilding features beyond the MVP scope, or indiscriminately copying raw design assets.

## 2. Source-of-Truth Hierarchy
- **Product/Business Rules**: Authorized specs and approved documentation.
- **Database Truth**: Migration files and database documentation.
- **Security/RLS Truth**: Migration files and security documentation.
- **UI Visual Reference**: Google Stitch V3 approved screen handoffs *only*.
- **Stitch HTML/CSS**: *Never* the source of truth.

## 3. Context Packet Rule
Every future agent prompt must be restricted to a focused context packet containing only:
- The explicit task goal
- Current repository state
- Non-negotiable technical and design decisions
- A whitelist of allowed files
- A blacklist of forbidden files and actions
- Required validation commands
- Expected PASS/HOLD output format

## 4. Read-Minimum Rule
Agents must read the smallest set of files necessary to accomplish the task.
- No full-repository scanning unless explicitly required and authorized by the task.
- No bulk reading of all Stitch exports.

## 5. Stitch Handling Rule
Stitch exports are to be treated strictly as external visual references.
- Approved screens must be explicitly listed by the task definition.
- Duplicate or rejected screens within the export must be ignored.
- Under no circumstances should Stitch-generated HTML/CSS be copied into the `src` directory.

## 6. MVP Guardrails
The following product rules are non-negotiable:
- **Arabic-first RTL**: The primary interface direction is Right-to-Left Arabic.
- **Senior-friendly, Tablet-first UI**: Interfaces must prioritize large touch targets and readability for senior field workers on tablets.
- **Central Respondent Registry**: This registry is the core of the application.
- **Mobile Search**: Searching by mobile number is the primary user action.
- **Normalized Mobile Format**: All mobile numbers must use the `9665xxxxxxxx` format.
- **Same-Domain Warning**: Completing a survey in the same domain within 3 months triggers a warning only, not a hard block.
- **Payable Forms**: Only accepted forms are payable.
- **Role Visibility - Owner**: The `owner` role has full visibility, including financial data.
- **Role Visibility - Support Helper**: The `support_helper` role sees no financial data, no locked cards, and no blurred amounts.
- **Role Limitations**: The only authorized roles are `owner` and `support_helper`.
- **Scope Creep Prevention**: No maps, sync, team tracking, task management, or advanced analytics features are permitted in the MVP. Operational Excel export is approved product scope under `docs/product-requirements.md`, but its implementation and enforcement remain unproven. Financial export is owner-only; PDF reports and advanced reporting dashboards remain deferred.

## 7. Task Sizing Rule
Agents must prefer small, incremental tasks over broad sweeping changes:
- One document
- One route
- One component group
- One screen
- One validation step
*Avoid broad “implement the whole UI” tasks.*

## 8. Model Selection Rule
- Use stronger reasoning models for tasks involving Database, RLS, Security, Authentication, and core Architecture.
- Cheaper/faster models may be used for documentation inventory, committing, pushing, and simple UI stylistic cleanups.
- *Never* reduce model strength when tenant isolation, financial logic, or Row Level Security (RLS) is involved.

## 9. PASS/HOLD Rule
Upon completing a task, agents must return a `PASS/HOLD` report detailing:
- Files changed
- Sources read
- Validations executed
- Potential risks
- Explicit confirmation that all forbidden actions were avoided

## 10. Next Recommended Flow
Tasks should generally proceed in this sequence:
1. LeanCTX protocol establishment
2. Stitch handoff inventory
3. Frontend foundation plan
4. Implementation delivered in small screen/component batches
