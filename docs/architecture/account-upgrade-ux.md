# Account Upgrade UX

**Status:** Planned  
**Scope:** User journey from anonymous first launch to linked email account  
**Goal:** Let users get value immediately without registration, then gently encourage account linking at the right moments.

---

## Product principle

Tailo should feel useful before it asks for commitment.

The app starts with an anonymous session so the user can:

- grant photo access
- see a timeline
- name their pet
- capture moments
- edit local memories

Only after the user has felt real value should Tailo invite them to link an email account.

This remains a **soft upgrade**, not a hard gate.

---

## Why ask the user to link an account

The main user-facing reason is not “create an account.” It is:

- keep memories safe
- recover access if the app is reinstalled or the device changes
- prepare for future sharing / family / multi-device features

The app should frame the action as protecting memories, not as signing up for a service.

---

## Current technical model

- App launches with `signInAnonymously()`
- Backend resolves or creates a stable Tailo `app_user_id`
- Current Supabase `user.id` is a session/provider identity, not the long-term canonical owner id
- Email linking keeps the **same** `app_user_id`
- Email upgrade uses `updateUser({ email })` + OTP verification

This means account linking is an upgrade of the same Tailo identity, not a separate migration step for the user.

---

## User states and capabilities

The product should be explicit internally about what anonymous and registered users can do.

### Anonymous user

Anonymous users should be able to:

- complete onboarding
- grant photo access
- scan and build a timeline from a recent limited window
- capture new moments
- edit local memories
- sync selected event media and receive cloud AI captions
- use the app normally on the current device

Anonymous users should **not** be promised:

- reliable recovery after reinstall or SecureStore/session loss
- multi-device continuity
- future family sharing
- future account recovery flows

Anonymous-user defaults should also be communicated carefully:

- server-side AI may still be used in the standard cloud flow
- selected event media may leave the device for sync and captioning
- privacy is meaningful, but not the strongest account-backed or premium privacy mode
- recent-library scanning is capped: up to **500 recent images** for anonymous users, while newly added photos can still be scanned going forward

### Registered user (email-linked)

Registered users should be able to:

- do everything an anonymous user can do
- keep the same canonical account after linking email
- have a clearer path for future recovery
- be eligible for future multi-device, family, and sharing features
- unlock deeper historical scanning to build a fuller story of the pet over time

Registered users also get a stronger product promise around:

- continuity of synced memories
- future recovery options
- future account-level controls, including privacy-related upgrades

For the current MVP/Phase 2 shape, linking email does **not** unlock core timeline use. It upgrades continuity and future portability of the user’s memories.

### Capability matrix

| Capability                              | Anonymous user          | Registered user         |
| --------------------------------------- | ----------------------- | ----------------------- |
| Onboarding                              | Yes                     | Yes                     |
| Timeline, capture, edits                | Yes                     | Yes                     |
| Cloud sync + AI captions                | Yes                     | Yes                     |
| Same-device normal use                  | Yes                     | Yes                     |
| Recent photo scan                       | Up to 500 recent images | Yes                     |
| New photo detection after setup         | Yes                     | Yes                     |
| Historical full-story scan              | No                      | Yes                     |
| Reinstall/session-loss recovery promise | No                      | Better future path      |
| Multi-device continuity                 | Not in MVP              | Future                  |
| Family / sharing features               | Future, likely gated    | Future, likely eligible |

### Editing tiers

We should keep a clear boundary between `basic editing` and `advanced editing`.

#### Basic editing

Basic editing is part of the core Tailo experience and should remain available to anonymous users.

Examples:

- edit caption text
- change event type
- favorite / unfavorite
- hide or remove a moment
- choose the primary image for a moment

#### Advanced editing

Advanced editing goes beyond correcting a memory and moves into enhancement, publishing, or deeper cloud-backed management.

Examples:

- crop or filter photos
- visual adjustments to images
- styled share layouts or export compositions
- richer moment curation tools
- synced edit history across devices
- bulk editing or more powerful gallery management
- AI-assisted rewrite variants for captions

#### Product rule

- anonymous users should keep **basic editing**
- advanced editing can be considered for registered, premium, or future tiers

This keeps the free anonymous experience useful and trustworthy, while leaving room for richer upgrade paths later.

### AI and privacy differences

We should be explicit internally that account state and privacy state are related, but not identical.

#### Anonymous user

- can still use server-side AI captioning in the default product flow
- selected event media may be uploaded for sync and AI
- has the weakest continuity guarantees if the app is removed or auth/session state is lost

#### Registered user

- can still use the same server-side AI features
- gets a stronger continuity and recovery story
- is the more natural entry point for future privacy controls, family sharing, and cross-device features

#### Future premium privacy tiers

Account state alone should not imply the strongest privacy mode.

Planned future differences may include:

- registered + standard cloud AI
- registered + paid encrypted-media tier
- registered + premium private mode with reduced or no server-side image AI

See [encrypted-media-ai-plan.md](./encrypted-media-ai-plan.md) and [../FUTURE_FEATURES.md](../FUTURE_FEATURES.md).

### UX implication

Because anonymous users can already get the core product value, the account upgrade must be framed as:

- protecting memories
- making future recovery easier
- unlocking a deeper historical timeline
- preparing for future connected features

It should **not** be framed as unlocking basic use of Tailo.

---

## Recommended journey

### 1. First launch and onboarding

Do **not** ask for email in onboarding.

Onboarding should stay focused on:

- welcome
- photo access
- scan progress
- pet setup
- first useful timeline

Asking for account creation here adds friction before the user has seen value.

### 2. First timeline session

Once the user reaches their timeline and has visible moments, show a **soft reminder** only.

Good placement:

- under the pet header
- near sync status
- inside settings

Good reminder framing at this stage:

- save your memories
- scan more of your pet's history
- build your pet's fuller story

Bad placement:

- full-screen modal on first timeline render
- blocking dialog before they can browse moments

### 3. Continued use

If the user stays anonymous, remind them at calm, meaningful moments.

Recommended triggers:

- after first successful cloud sync
- after the user creates or edits several memories
- after the app hits the anonymous recent-scan cap
- when they open Settings
- before risky moments such as reinstall advice, export, future sharing, or family features

Avoid showing the same prompt repeatedly in a short window.

### 4. Upgrade flow

When the user chooses to upgrade:

1. open `Account settings`
2. enter email
3. send OTP / verification code
4. verify code
5. show success confirmation

After success:

- keep them in the same app session
- keep navigation position stable
- confirm that their memories are now tied to their email

### 5. After linking

Once linked:

- remove the anonymous-user reminder from the home screen
- show linked email inside Settings
- unlock the ability to scan older historical photos beyond the anonymous recent-image cap
- use linked state in future for recovery, family, and multi-device features

### 6. Historical scan upgrade path

This is a useful product distinction between anonymous and linked users.

#### Anonymous user

- Tailo scans up to **500 recent images**
- Tailo can continue detecting newly added photos after that
- Tailo does not continue into a deep back-catalog scan

#### Registered user

- Tailo can scan beyond the recent cap
- Tailo can continue into older historical images
- Tailo can build a fuller long-term story of the pet

This should be presented as a value upgrade, not a punishment. The anonymous experience must still feel complete enough to be worth using.

---

## Reminder strategy

Use a tiered reminder system.

### Tier 1: passive reminder

Small inline link or card on the timeline home:

- “Save your memories”
- “Link email to keep your memories safe”

This should be the default state.

### Tier 2: contextual reminder

Use a slightly stronger reminder when the user is about to do something that depends on account continuity.

Examples:

- before future family sharing
- before future multi-device sign-in
- when warning about reinstall/session-loss risk

### Tier 3: recovery/risk reminder

If the app detects a state where anonymous use has a clear downside, explain it plainly.

Examples:

- “If this app is removed from your phone before you link an email, synced memories may not come back automatically.”

This should still avoid alarmist language.

---

## UX and copy guidance

### Tone

Use calm, protective framing:

- “Save your memories”
- “Keep your timeline safe”
- “Link an email so your memories stay with you”

Avoid:

- “Sign up now”
- “Create account to continue”
- “Register”
- “Unlock your account”

### Design

- inline card or link, not aggressive popup
- small supporting text, not long explanation
- one primary action: `Add email`
- optional secondary action: `Not now`

### Frequency

- never on every app open
- never repeatedly within the same session
- allow dismissal and cooldown

Track locally:

- last prompt shown timestamp
- number of dismissals
- whether linked already

---

## Recommended placements

### Home / timeline

Primary placement for passive reminder.

Why:

- user has already seen value
- reminder is close to their moments
- easy to make it feel like memory protection, not account bureaucracy

### Settings

Permanent home for account state and upgrade flow.

Settings should show:

- anonymous vs linked state
- linked email if present
- email upgrade entry point
- later: localisation, preferences, privacy, help

### Pet profile

Do not make account upgrade a primary pet-profile action.

Pet profile is about the pet. Settings is the right home for account identity.

---

## Suggested information architecture

### Main pages

- `Timeline`
- `Pet profile`
- `Settings`

### Settings sections

- `Account`
  - linked / anonymous state
  - add or change email
- `Language`
  - localisation controls
- `Preferences`
  - app-level settings
- `Privacy & help`
  - what stays local / what syncs

---

## Edge cases to explain well

### Anonymous user on one device

Works normally. No hard gate.

### App reinstall / session loss before linking email

Needs clear but calm copy:

- memories already synced to the anonymous cloud user may not restore automatically

### Email already linked elsewhere

Show a plain error:

- “That email is already linked to another account.”

Do not silently switch users.

### Slow or failed code delivery

Give the user clear retry language and a path back to editing the email.

---

## What should be implemented now vs later

### MVP / near-term

- anonymous-first onboarding
- passive `Save your memories` reminder on timeline
- account entry inside Settings
- email + OTP upgrade flow
- linked success confirmation

### Phase 3 polish

- reminder timing and cooldown tuning
- better settings IA
- clearer reinstall/recovery explanation
- localisation of account-upgrade copy

### Later

- Apple / Google linking
- multi-device sign-in
- recovery flows
- family invitations

---

## Auth provider rollout

Recommended provider order:

1. anonymous session
2. email OTP upgrade
3. Sign in with Apple
4. Sign in with Google
5. phone auth only when a regional launch justifies it

### Why this order

- email OTP matches the current anonymous-to-linked upgrade model
- Apple is important on iOS once third-party login exists
- Google is the most useful broad cross-platform social login
- phone auth adds regional value in some markets, but also adds SMS cost, abuse controls, and operational work

### Product rule

- do not add Facebook in MVP planning
- do not make phone auth the default global upgrade path
- treat phone auth as a market-specific option for later rollout, not a first-wave identity provider

### Regional phone-auth note

Phone auth may become important in markets where phone-number registration is a common expectation. If Tailo expands into markets where this materially improves conversion, phone login can be added as a region-aware option while keeping the default auth model centered on anonymous first, email, Apple, and Google.

---

## Implementation preparation checklist

This is the practical setup work needed before email, Apple, and Google account upgrade can ship cleanly.

### 1. Common preparation

- separate `dev` and `prod` Supabase projects
- separate mobile app environments / bundle identifiers for `dev` and `prod`
- app URL scheme(s) confirmed for native auth redirects
- Supabase Auth providers configured per environment, not only in production
- redirect allow-list reviewed for local development, dev build, and production
- privacy policy and support URLs ready for provider console setup

### 2. Email OTP

Prepare:

- Supabase email auth enabled
- OTP email template configured to send a code rather than only a magic link
- sender / SMTP plan decided for production-quality delivery
- copy for send-code, retry, expired-code, and success states
- cooldown / resend rules aligned with product UX

Implementation notes:

- use `signInWithOtp` to send the code
- use `verifyOtp` to complete verification
- keep the same Supabase `user.id` when upgrading from anonymous to email-linked

### 3. Sign in with Apple

Prepare:

- Apple Developer account access
- App ID with the `Sign in with Apple` capability enabled
- app bundle identifier finalized for each environment
- native iOS build path working (`dev client` / Xcode), since this is not just Expo Go setup
- decision on whether Tailo uses native Apple sign-in only or also web/OAuth flows later
- plan to capture full name on first sign-in and persist it, because Apple only provides it once in native flows

If OAuth/web flow is ever added later, also prepare:

- Apple Team ID
- Services ID
- Sign in with Apple key (`.p8`)
- secret rotation process, because Apple OAuth client secrets must be rotated periodically

### 4. Sign in with Google

Prepare:

- Google Cloud project
- OAuth consent screen / branding configured
- OAuth client IDs created for the app environments in use
- native iOS/Android client setup confirmed if we ship Google sign-in on both mobile platforms
- backend/server client ID prepared if backend token verification or server-side flows need it
- redirect / URL scheme configuration tested in dev builds

### 5. UX preparation before shipping Apple/Google

- keep account upgrade inside `Settings` plus a calm timeline reminder
- explain benefits as memory protection and recovery, not generic registration
- keep Apple and Google as upgrade choices after value is shown
- show linked-provider state clearly in `Settings`
- do not mix account upgrade with pet-profile editing

---

## Success criteria

The flow is working well if:

- onboarding completion does not drop because of account prompts
- users can understand why linking email matters
- users can complete email linking without losing context
- reminders feel helpful, not salesy

---

## Recommended implementation rule

Tailo should never ask for email before the first meaningful timeline value.

The first reminder should appear only after the user has seen memories in the app.
