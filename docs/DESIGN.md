# Design guide

The approved designs live on a Claude design canvas (private to the project owner):
https://claude.ai/artifact/AhcFnceaPJuqW9QRknD8Dh

A copy of every screen is in `design/screens/` as HTML. Open a file in a browser to see
it, or read it to get exact spacing, sizes and copy. They are references, not code to
reuse: they depend on the canvas runtime and use inline styles. Build real components.

## Look and feel

Modern, calm and confident. Deep navy for the brand, cobalt for actions, one warm coral
accent. Rounded cards, pill-shaped buttons, generous spacing, no gradients or shadows.

## Tokens

Use these names in Tailwind (`theme.extend.colors`) and never raw hex in components.

| Token | Value | Use |
|---|---|---|
| `brand-navy` | `#0B1F3A` | Brand areas, staff top nav, dark summary cards |
| `primary` | `#2456D6` | Buttons, links, selected items, "in service" |
| `primary-dark` | `#173E9E` | Hover, text on `primary-tint` |
| `primary-tint` | `#E8EFFD` | Selected chips and cards, "booked" |
| `accent` | `#FF8A5B` | Avatars, owner badge, one highlight per screen |
| `now-line` | `#FF6B3D` | The current-time line on the schedule |
| `bg` | `#F6F8FC` | Page background |
| `surface` | `#FFFFFF` | Cards |
| `border` | `#E1E7F0` | Card borders, dividers |
| `border-strong` | `#CDD6E3` | Inputs, secondary buttons |
| `text` | `#0F1A2B` | Main text |
| `text-muted` | `#5B6678` | Labels, secondary text |
| `nav-muted` | `#C7D4EA` | Secondary text on navy |
| `success-tint` / `success-text` | `#E3F2EA` / `#1F6B45` | Deposit paid, checked in early, on track |
| `warning-tint` / `warning-text` / `warning-border` | `#FFF1D6` / `#7A4A00` / `#F5D08A` | Waiting, needs attention |
| `danger-text` / `danger-border` | `#A12828` / `#D64545` | No-show, destructive actions |
| `disabled-bg` / `disabled-text` | `#EEF1F6` / `#8A93A3` | Taken slots, busy stylists |

**Type:** Plus Jakarta Sans (Google Fonts), weights 400–800. Headings 800 with slight
negative letter-spacing. Body 14–16px. Never below 11px.

**Shape:** cards 16–20px radius; buttons and chips fully rounded (pills); inputs 14–16px radius.

**Touch targets:** at least 44px. Primary buttons 52–60px tall on phones.

## Booking statuses

Every screen shows status the same way. "Checked in early" and "waiting" are derived
from `CHECKED_IN` plus the clock (see `docs/PRD.md`).

| Status shown | Stored status | Style |
|---|---|---|
| Booked | `BOOKED` | `primary-tint` background, `primary-dark` text |
| Checked in, early | `CHECKED_IN`, before appointment time | `success-tint`, `success-text` |
| Waiting N min | `CHECKED_IN`, after appointment time | `warning-tint`, `warning-text`, `warning-border` |
| In service | `IN_SERVICE` | `primary` background, white text |
| Done | `DONE` | `disabled-bg`, `text-muted` |
| No-show | `NO_SHOW` | white, dashed `danger-border`, `danger-text` |
| Prep time | (not a booking) | Light diagonal stripes on `bg` |
| Running over | `IN_SERVICE`, past 15 min before booked end | `primary` block plus an amber "Running over" label; next booking gets a `warning-border` |
| Requested marker | `stylistRequested = true` | Small pill "Requested" (`surface` background, `primary-dark` text) on the block and in the panel |

## Screens

| Design file | Route (proposed) | Who | Milestone |
|---|---|---|---|
| `Welcome.dc.html` | `/` | Customer | M3 |
| `Main.dc.html` | `/book` (step 1: service) | Customer | M3 |
| `Time.dc.html` | `/book/time` (step 2) | Customer | M3 |
| `Review.dc.html` | `/book/review` (step 3) | Customer | M3 |
| `Confirmed.dc.html` | `/book/confirmed/[ref]` | Customer | M3 |
| `StaffSignIn.dc.html` | `/staff/sign-in` | All staff | M4 |
| `ReceptionSchedule.dc.html` | `/staff/reception` | Receptionist | M5 |
| `ReceptionCheckIn.dc.html` | `/staff/reception` (search open) | Receptionist | M5 |
| `CheckedInOnTime.dc.html` | Booking panel after check-in | Receptionist | M5 |
| `CheckInPrompt.dc.html` | 15-minute prompt on the schedule | Receptionist | M5 |
| `ReceptionNew.dc.html` | `/staff/reception/new` | Receptionist | M5 |
| `StylistToday.dc.html` | `/staff/stylist` | Stylist | M6 |
| `StylistDay.dc.html` | `/staff/stylist/tomorrow` | Stylist | M6 |
| `ManagerToday.dc.html` | `/staff/manager` | Branch manager | M7 |
| `OwnerOverview.dc.html` | `/staff/owner` | Owner | M7 |
| `OwnerStaff.dc.html` | `/staff/owner/staff` | Owner | M7 |
| `OwnerSettings.dc.html` | `/staff/owner/settings` | Owner | M7 |

The sample data in the designs (names, times, amounts) matches the seed data in M1-2,
so the built screens can be compared side by side with the designs.

## States the designs don't show

Build these with the same tokens and ask the supervisor if unsure: loading skeletons,
empty schedules, errors (network, payment failed, slot just taken), the
"Finish service" state of the stylist button, the "Running over" warning and the
"Requested" marker (styles in the status table above).
