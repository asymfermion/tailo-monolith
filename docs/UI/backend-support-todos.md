# UI Backend Support TODOs

The redesigned UI is implemented against existing local-first data where possible. The items below need fuller backend or local pipeline support before they should be treated as product-complete.

## Story feed

- Add a dedicated relationship/start-date field for copy such as "2 years together". The current feed shows real memory counts and omits unsupported duration copy.
- Add event-level story titles if product wants richer titles than the existing event type labels.
- Add calendar grouping labels such as "This Week" and monthly sections if the feed should match the sketch exactly.
- Replace the share placeholder with export-based sharing for a memory image/caption bundle.

## Pet profile

- Replace mocked overview stats for together duration, adventures, and favorites with real local/cloud aggregates.
- Add persisted highlight summaries, for example favorite locations, recurring activities, first/last memory, and profile-quality indicators.
- Add a proper life timeline model with dated milestones instead of deriving only "story started" and "latest memory" from local profile/timeline data.
- Add a relationship/adoption date field if the profile should show "years together" separately from pet birthday.
- Add breed, color, weight, microchip, personality tags, favorite things, and editable timeline-event storage before implementing the full Details / More Info sketch literally.

## Discovery

- Add classified discovery categories such as adventures, beach photos, and sleep moments. The onboarding discovery panel currently uses real pipeline counts for pet moments, grouped memories, and selected photos.
- Add a designed multi-pet confirmation flow before the feed if Tailo should support the sketch's "we found 2 pets" card. Current Phase 0/1 scope remains single-pet.

## Navigation

- Decide whether the sketch's fourth "Memories" tab is a future route. Current docs specify Story, Pet, and Settings, so the mobile shell keeps three tabs.

## Memory detail

- Implement the Phase 5 redesign separately: full-bleed hero, gallery, and story treatment for individual memories.
