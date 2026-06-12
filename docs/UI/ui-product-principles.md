# Tailo Product Principles

## Mission

Tailo helps pet owners rediscover, preserve, and relive their pet's story through memories hidden inside their photo library.

Tailo is a private, memory-first pet story app. It is not a pet tracker, veterinary record manager, social network, productivity app, or dashboard.

## Product Positioning

Tailo should feel like:

- Apple Photos Memories
- Apple Journal
- A premium printed photo book
- A personal family album

Tailo should not feel like:

- A pet health tracker
- A social media platform
- A SaaS dashboard
- A generic React Native starter app
- A database of pet events

## Core Product Principles

### 1. Show value before commitment

Anonymous mode is the primary path.

Users should see their own pet memories before creating an account. Account creation exists for backup, sync, multi-device access, and premium features.

The user should feel:

> I want to save this.

not:

> I have to sign up.

### 2. Photos are the interface

Pet photos carry the emotion, memory, and color. UI chrome should stay quiet.

The product hierarchy is:

1. Photos
2. Story
3. Metadata
4. Settings

### 3. Story over database

Use emotional, human product language.

Preferred user-facing terms:

- Story
- Memory
- Life with Link
- Highlights
- Recap
- Moments

Avoid user-facing terms where possible:

- Timeline Event
- Record
- Activity
- Tracker
- Log
- Database

Internal names such as `TimelineEvent` can remain until a deeper model refactor is justified.

### 4. Fast path to first memory

The most important product moment is when a user sees a meaningful memory generated from their own photo library.

Optimize the first-run experience to reach that moment quickly.

### 5. Private by default

Privacy should be visible but lightweight.

Do not create extra onboarding screens just to explain privacy. Put the privacy promise directly where it helps the user make a decision.

## Primary Journey

Install

→ Start with Photos

→ Native Photo Permission

→ Discovery

→ Pet Confirmation

→ First Memory

→ Story Feed

→ Emotional Attachment

→ Create Account

## Account Philosophy

Anonymous-first is a product advantage.

Account prompts should appear only after the user has seen value, usually as a contextual card:

> Keep Link's story safe forever.

Account creation should be framed around backup and sync, not access.

## Pet Philosophy

Pets are characters.

The pet profile should feel like a character page, not a settings page or database record.

Users should feel:

> This is Link.

not:

> This is a pet record.

## Success Metric

The most important success metric is whether the user reaches and emotionally responds to their first generated memory.

Secondary metrics:

- Time to first memory
- Number of memories viewed in first session
- Number of users who name/confirm a pet
- Number of users who return after first generated story
- Number of users who create an account after seeing value
