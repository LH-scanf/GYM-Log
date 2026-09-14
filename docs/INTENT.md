# GymLog — INTENT

> Status: Draft v0.1  
> Project type: Mobile-first PWA / Local-first personal tool  
> Primary user: single-user, self-use  
> Core goal: make gym logging fast enough to use during training, while preserving structured data for long-term progress analysis.

## 1. Why this project exists

Existing fitness apps often optimize for courses, social features, coaching, calorie tracking, or generic workout templates. GymLog is intentionally narrower: it is a personal training log that should feel as quick as typing notes, but produce structured data that can later be searched, edited, charted, exported, and analyzed.

The core problem is not “how to build a fitness platform”. It is:

- record a training session quickly in the gym;
- remember exactly what was done last time;
- compare the same exercise over time;
- see whether training frequency and performance are improving;
- keep the data portable and owned by the user.

## 2. Product principles

### 2.1 Logging first

The most frequent operation is recording a set / segment. It must require as few taps as possible.

Creating or configuring an exercise may be slightly more complex, because that is a low-frequency operation. Once created, an exercise has a fixed recording schema and the workout page is generated from that schema.

### 2.2 Manual time is the source of truth

GymLog is not a foreground timer.

A session stores:

- date;
- arrival/start time entered manually;
- departure/end time entered manually.

The UI may offer a “fill current time” shortcut, but it must not depend on a PWA remaining alive in the background.

### 2.3 Structured raw data is the source of truth

The application stores raw workout records. Derived values such as PRs, estimated 1RM, monthly counts, heatmaps, trends, and streaks are calculated from raw data.

Statistics may be cached for performance, but cached results are disposable and must never become the canonical data source.

### 2.4 Exercise variants are separate exercises when performance is not directly comparable

Examples:

- 正手侧平举 / 反手侧平举;
- 宽距正手高位下拉 / 窄距正手高位下拉;
- 平板卧推 / 上斜卧推.

These should be independent exercises with independent progress curves.

Related exercises may optionally belong to an Exercise Family, for example:

- 高位下拉
  - 宽距正手高位下拉
  - 窄距正手高位下拉
- 反向山羊
  - 反向山羊挺身
  - 反向山羊举手

An Exercise Family is organizational only and is not directly logged.

### 2.5 Flexible records, fixed schema per exercise

Different exercises require different fields.

Examples:

- 卧推: weight + reps;
- 仰卧起坐: reps + optional extra load;
- 辅助引体向上: assistance weight + reps;
- 爬坡: incline + speed + duration;
- 快走: duration + optional distance/speed.

The exercise defines which fields are required, optional, or disabled. The training page follows that schema.

### 2.6 Local-first and portable

V1 should not require an account or server.

Data is stored locally in the PWA and can be exported/imported as versioned JSON. CSV export may be added for analysis convenience, but JSON is the canonical interchange/backup format.

Historic handwritten/plain-text logs do not need an in-app parser in V1. They can be converted externally into the stable GymLog JSON format and then imported.

## 3. Primary user experience

### Home / Training history

The home page is a chronological training history grouped by week.

Example:

- 本周
  - 9月14日 · 18:12–19:31 · 1h19min
  - 9月12日 · 18:06–19:15 · 1h09min
- 上周
  - 9月11日 · 18:17–19:46 · 1h29min
  - 9月9日 · 20:07–-- · 未填写结束时间

Each session card opens the full record and allows editing.

A prominent “新建训练” action starts a new session.

### New workout

1. Select date.
2. Enter start time manually.
3. Add one or more exercises.
4. Record sets/segments using each exercise’s schema.
5. Enter end time manually when leaving.
6. Save.

The session may be saved without an end time and completed later.

### Recording a strength exercise

Example — 卧推:

- 40 kg × 8 reps
- 40 kg × 10 reps
- 45 kg × 5 reps

Adding the next row should copy the previous row by default so the user only edits changed values.

### Recording bodyweight + optional load

Example — 反向山羊挺身:

- 自重 × 20
- 自重 × 20
- +5 kg × 10

The stored load represents extra external load, not body weight.

### Recording cardio

Example — 爬坡:

- incline 12
- speed 5 km/h
- duration 40 min

## 4. Statistics intent

Statistics should answer three questions:

1. Am I training consistently?
2. Am I getting stronger / performing better?
3. What exactly changed over time?

The statistics experience should include:

- annual/monthly workout counts;
- annual/monthly total workout duration;
- a GitHub-style training heatmap/calendar;
- per-exercise progress pages;
- trend lines derived from raw data;
- recent progress / PR changes.

For ordinary external-load strength exercises, useful views include:

- highest training weight;
- estimated 1RM trend;
- best reps at a selected fixed weight;
- session-by-session raw history.

For assistance exercises, lower assistance is normally better and must be interpreted accordingly.

For reps-only exercises, focus on highest reps and trend.

For cardio, focus on duration and relevant configured fields such as speed, incline, and distance.

## 5. Scope boundaries for V1

V1 is intentionally not:

- a social fitness platform;
- a workout video/course app;
- a nutrition/calorie tracker;
- an AI coaching system;
- an Apple Health replacement;
- a cloud-account product;
- a generic health data warehouse.

These may be explored later only if they clearly improve the core logging workflow.

## 6. Success criteria

GymLog V1 is successful if:

- a workout can be recorded comfortably on a phone in the gym;
- adding the next set is faster than writing the same information in a generic notes app;
- old sessions can be edited safely;
- exercise variants remain statistically separate;
- bodyweight, external load, and assistance load are represented correctly;
- the user can answer “what did I do last time?” in a few seconds;
- the user can see training consistency and exercise progress visually;
- all data can be backed up and restored through JSON without a server.

## 7. Product direction

Initial direction:

- Mobile-first PWA;
- local-first storage;
- clean, restrained interface;
- training history as the home page;
- statistics as a separate top-level page;
- exercise management as a separate top-level page;
- settings/import/export as a separate top-level page.

Desktop support can be considered later for review, analysis, and management, but mobile logging is the primary experience.
