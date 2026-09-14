# GymLog — SPEC

> Status: Draft v0.1  
> Depends on: `INTENT.md`  
> Purpose: define V1 product behavior, data semantics, core entities, and acceptance boundaries before implementation planning.

---

## 1. System overview

GymLog is a single-user, local-first workout logging PWA.

The application consists of four primary product areas:

- **训练** — weekly grouped workout history and new-session entry;
- **统计** — workout consistency and exercise progress;
- **动作** — exercise/family management and schema definition;
- **设置** — import/export and application settings.

V1 does not require authentication, cloud sync, or a backend service.

---

## 2. Domain model

Core relationship:

```text
ExerciseFamily (optional organizational parent)
        ↓
Exercise (loggable concrete exercise)
        ↓
ExerciseBlock (an occurrence of an exercise inside one workout)
        ↓
ExerciseRecord (one set / cardio segment / record row)

WorkoutSession
        ↓
ExerciseBlock[]
```

### 2.1 ExerciseFamily

An Exercise Family groups related variants but cannot itself be logged.

Examples:

```text
高位下拉
├── 宽距正手高位下拉
├── 窄距正手高位下拉
└── 窄距反手高位下拉
```

```text
反向山羊
├── 反向山羊挺身
└── 反向山羊举手
```

Family membership is optional. A standalone exercise such as `绳索面拉` does not need a synthetic one-child family.

Proposed fields:

```ts
ExerciseFamily {
  id: string
  name: string
  description?: string
  archived: boolean
  createdAt: string
  updatedAt: string
}
```

Rules:

- a family is not selectable as a workout exercise;
- renaming a family changes the name everywhere it is displayed;
- archiving a family must not delete member exercises or historical records;
- hard deletion is allowed only when it has no dependent references, otherwise archive.

---

## 3. Exercise

An Exercise is a concrete loggable movement.

Examples:

- 卧推;
- 宽距正手高位下拉;
- 正手侧平举;
- 反向山羊挺身;
- 反向山羊举手;
- 辅助引体向上;
- 爬坡.

Proposed fields:

```ts
Exercise {
  id: string
  name: string
  familyId?: string

  recordSchema: RecordSchema
  loadMode: LoadMode

  archived: boolean
  createdAt: string
  updatedAt: string
}
```

### 3.1 Name semantics

Exercise history stores `exerciseId`, not a duplicated historical name snapshot.

Therefore, renaming an exercise updates its displayed name across all historical sessions.

This behavior is intentional. The product should encourage users to name exercises carefully at creation time to reduce future renames.

### 3.2 Variant rule

Create a distinct Exercise when a variation materially changes performance comparability.

Create separate exercises for:

- 正手 vs 反手 when it meaningfully changes the movement;
- 宽距 vs 窄距;
- 平板 vs 上斜;
- 杠铃 vs 哑铃;
- standard version vs a mechanically distinct variant.

Do **not** create separate exercises for one-off execution notes such as “today shoulder felt uncomfortable”. Those belong in notes.

Left/right side is not an exercise variant. Side is record-level data when enabled.

---

## 4. RecordSchema

Every exercise defines its allowed recording fields when the exercise is created or edited.

Each structured field has one of three requirements:

```ts
type FieldRequirement =
  | 'DISABLED'
  | 'OPTIONAL'
  | 'REQUIRED'
```

Proposed schema:

```ts
RecordSchema {
  reps: FieldRequirement
  load: FieldRequirement
  duration: FieldRequirement
  distance: FieldRequirement
  speed: FieldRequirement
  incline: FieldRequirement
  side: FieldRequirement
}
```

`note` is always optional and does not need to be enabled through RecordSchema.

### 4.1 Fixed V1 units

V1 uses fixed units:

```text
load      kg
speed     km/h
duration  min
distance  km
incline   numeric treadmill incline value
reps      integer count
```

No lb/mile unit switching is required in V1.

Numeric values must support decimals where appropriate:

- 7.5 kg;
- 4.5 km/h;
- 3.25 km;
- 30.5 min if needed.

`reps` must be a non-negative integer.

### 4.2 Schema examples

#### 卧推

```text
reps      REQUIRED
load      REQUIRED
others    DISABLED
loadMode  EXTERNAL
```

#### 仰卧起坐

```text
reps      REQUIRED
load      OPTIONAL
others    DISABLED
loadMode  BODYWEIGHT_PLUS
```

#### 反向山羊挺身

```text
family    反向山羊
reps      REQUIRED
load      OPTIONAL
loadMode  BODYWEIGHT_PLUS
```

#### 辅助引体向上

```text
reps      REQUIRED
load      REQUIRED
loadMode  ASSISTANCE
```

#### 爬坡

```text
duration  REQUIRED
speed     OPTIONAL
incline   OPTIONAL
loadMode  NONE
```

#### 快走

```text
duration  REQUIRED
distance  OPTIONAL
speed     OPTIONAL
loadMode  NONE
```

---

## 5. LoadMode

LoadMode defines the semantic meaning of the `load` field.

```ts
type LoadMode =
  | 'NONE'
  | 'EXTERNAL'
  | 'BODYWEIGHT_PLUS'
  | 'ASSISTANCE'
```

### NONE

The exercise does not use load as a meaningful metric.

Examples:

- basic cardio;
- a reps-only movement configured without external load.

### EXTERNAL

The entered weight is the primary external training resistance.

Examples:

- 卧推;
- 哑铃推肩;
- 高位下拉;
- 坐姿划船;
- 绳索面拉.

Typical interpretation: higher load at comparable reps may represent progress.

### BODYWEIGHT_PLUS

The movement is bodyweight-based and `load` stores only extra external load.

Examples:

- 仰卧起坐;
- 山羊挺身;
- 双杠臂屈伸;
- 悬垂举腿 if later weighted.

Semantics:

```text
load = null  => bodyweight only
load = 5     => bodyweight + 5 kg
```

The user’s body mass is not added to the stored load in V1.

### ASSISTANCE

The load represents assistance rather than resistance.

Example:

- assisted pull-up machine.

Typical interpretation: lower assistance at comparable reps represents progress.

Statistics must not treat increasing assistance as a strength PR.

---

## 6. WorkoutSession

A WorkoutSession represents one gym visit / training session.

Proposed fields:

```ts
WorkoutSession {
  id: string
  date: string               // local YYYY-MM-DD
  startTime?: string         // local HH:mm
  endTime?: string           // local HH:mm
  note?: string

  createdAt: string
  updatedAt: string
}
```

Rules:

- date is required;
- start time is manually entered;
- end time is manually entered;
- the UI may offer “fill current time” shortcuts;
- no background timer is the source of truth;
- a session may be saved without `endTime`;
- duration is derived from start/end time when both exist;
- user must be able to edit date/start/end times later;
- deleting a session requires explicit confirmation.

### 6.1 Overnight sessions

V1 should support an end time earlier than start time by interpreting it as crossing midnight **only if explicitly allowed by validation/UI**. If implementation complexity is undesirable, V1 may instead reject this case and document the limitation. This should be resolved during implementation planning.

---

## 7. ExerciseBlock

A session contains ordered ExerciseBlocks.

Proposed fields:

```ts
ExerciseBlock {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  note?: string
}
```

Rules:

- the same Exercise may appear more than once in one WorkoutSession;
- blocks preserve user order;
- blocks can be reordered;
- deleting a block deletes its contained ExerciseRecords after confirmation/undo policy is defined;
- block-level note is optional.

Do not model session exercises as `Map<exerciseId, ...>` because duplicate occurrences must be allowed.

---

## 8. ExerciseRecord

ExerciseRecord is the generic row used for both strength sets and cardio segments.

Proposed fields:

```ts
ExerciseRecord {
  id: string
  exerciseBlockId: string
  order: number

  reps?: number
  load?: number
  duration?: number
  distance?: number
  speed?: number
  incline?: number
  side?: 'LEFT' | 'RIGHT' | 'BOTH'

  note?: string
}
```

Rules:

- values are validated against the current Exercise RecordSchema when creating/editing a record;
- required fields must be present;
- disabled fields must not be created by the normal UI;
- optional fields may be null/absent;
- historical records remain valid if the Exercise schema changes later;
- the application must not silently rewrite old raw records when schema changes;
- record order is stable and editable.

### 8.1 Side semantics

Side is record-level metadata, not an exercise variant.

Examples:

```text
单臂绳索侧平举
LEFT  5kg × 10
RIGHT 5kg × 9
```

正手/反手 remains separate Exercise variants if they materially change the movement.

---

## 9. Exercise lifecycle and data integrity

### 9.1 Rename

Renaming an Exercise updates the displayed name for all history because history references Exercise by ID.

### 9.2 Archive

Exercises with history should normally be archived, not deleted.

Archived exercises:

- remain visible in historical sessions;
- remain available to statistics;
- are hidden from normal “add exercise” lists by default;
- can be restored.

### 9.3 Hard delete

Hard delete is allowed only when an Exercise has no historical references.

The same general rule applies to ExerciseFamily.

### 9.4 Schema changes

Changing RecordSchema affects future entry/edit validation but must not invalidate or mutate old raw records.

Example:

An exercise originally configured as reps-only can later enable optional load. Old reps-only history remains valid.

---

## 10. Home / workout history specification

Home is the `训练` top-level page.

### 10.1 Layout intent

Sessions are grouped by week in descending time order.

Example:

```text
本周
  9月14日  18:12–19:31  1h19min
  卧推 · 上斜卧推 · 举腿 · 爬坡

  9月12日  18:06–19:15  1h09min
  高位下拉 · 坐姿划船 · 面拉

上周
  9月11日  18:17–19:46  1h29min
  卧推 · 上斜卧推 · 双力臂 · 举腿 · 快走

  9月9日   20:07–--
  未填写结束时间
```

Requirements:

- newest week first;
- newest session first inside each week;
- cards are fully clickable;
- clicking opens session details;
- session detail allows editing;
- incomplete time must be represented explicitly, not fabricated;
- a prominent `新建训练` action is always easy to reach.

Optional later enhancement:

- display a configurable “training week number” in addition to calendar week grouping.

---

## 11. New workout flow

### 11.1 Create session

Fields:

```text
日期       required, default today
开始时间   manual input, optional/current-time shortcut
```

After creation, user enters the workout editor.

### 11.2 Add exercise

Open an exercise picker.

Picker should support:

- search by exercise name;
- recently used exercises;
- all active exercises;
- optional family grouping;
- archived exercises hidden by default.

Selecting an exercise immediately creates an ExerciseBlock and generates its input UI from RecordSchema.

### 11.3 Record entry

Strength-style example:

```text
卧推

[40] kg × [8] 次
[40] kg × [10] 次
[45] kg × [5] 次

[ + 添加一组 ]
```

Adding a new record should copy the previous record’s values by default when that improves speed, especially for load/reps.

Bodyweight-plus example:

```text
反向山羊挺身

自重 × 20
自重 × 20
+5kg × 10

[ + 添加一组 ]
```

Cardio example:

```text
爬坡

坡度     [12]
速度     [5] km/h
时间     [40] min

[ + 添加一段 ]
```

### 11.4 Record editing

The workout editor must support:

- add row/record;
- delete row/record;
- edit any value;
- add exercise;
- delete exercise block;
- reorder exercise blocks;
- edit session date/start/end time;
- save with missing end time.

### 11.5 Last performance shortcut

Each ExerciseBlock should provide quick access to the most recent prior performance for that exact Exercise.

Example:

```text
卧推                         上次 >
```

Opening it should show the previous session date and raw records without leaving the current workout flow if possible.

This is a high-priority usability feature.

---

## 12. Session detail page

A saved session detail page displays:

- date;
- start time;
- end time;
- derived duration;
- ordered exercise blocks;
- all raw records;
- notes if present.

Actions:

- Edit;
- Delete session.

Editing uses the same underlying controls as the workout editor where practical.

---

## 13. Statistics architecture

Statistics are derived from raw data and calculated at runtime.

Derived results may be memoized/cached, but cache must be safely discardable.

### 13.1 Performance expectation

A personal dataset is expected to remain relatively small even over many years.

Indexes should allow queries by:

- session date;
- session ID;
- exercise ID;
- exercise block ID.

The implementation should avoid rescanning the entire dataset on every component render. Compute on demand and memoize per query/input revision where useful.

---

## 14. Statistics — overall page

The statistics home page answers “am I training consistently?”.

V1 should include:

```text
今年训练次数
今年训练时长
本月训练次数
本月训练时长
```

### 14.1 Training heatmap

Provide a GitHub-style calendar/heatmap for the selected year.

Minimum V1 semantics:

```text
no session  = empty cell
session     = active cell
```

Optional enhanced intensity semantics:

- by total duration that day;
- multiple visual intensity levels.

Clicking/tapping an active date should open or preview that day’s session(s).

### 14.2 Recent progress

A compact section may surface meaningful recent changes such as:

```text
卧推
40kg -> 45kg max training weight

辅助引体向上
55kg -> 50kg assistance
```

The exact detection algorithm can be refined later; this feature should not block the base V1 statistics page.

---

## 15. Statistics — exercise detail

Each Exercise has its own statistics page based on LoadMode and RecordSchema.

### 15.1 EXTERNAL load + reps

Recommended metrics:

- highest training weight;
- best reps at a selected fixed weight;
- estimated 1RM;
- number of sessions containing the exercise;
- total recorded sets/records;
- raw session history.

Recommended trend views:

```text
力量水平 / estimated 1RM
最高训练重量
固定重量次数
```

The chart must preserve time order and be derived from actual records.

### 15.2 BODYWEIGHT_PLUS

Recommended metrics:

- best extra load;
- best reps at bodyweight;
- best reps at selected extra load;
- session count;
- history.

`load = null` is displayed as `自重`.

### 15.3 ASSISTANCE

Recommended metrics:

- lowest assistance weight;
- best reps at a selected assistance level;
- trend of assistance weight over time;
- session count;
- history.

UI must communicate that lower assistance can indicate improvement.

### 15.4 Reps-only

Recommended metrics:

- highest reps in one record;
- trend of best reps per session;
- session count;
- history.

### 15.5 Cardio

Metrics are based on enabled fields.

Possible metrics:

- cumulative duration;
- longest single duration;
- duration trend;
- speed trend if enabled;
- incline trend if enabled;
- distance trend if enabled;
- session count.

V1 should not attempt to force one universal chart onto all exercise types.

---

## 16. Estimated 1RM

Estimated 1RM is derived, not stored.

The exact formula must be centralized in one statistics module so it can be changed without data migration.

The V1 formula choice (for example Epley or another standard estimate) should be finalized during implementation planning and documented in code/tests.

Estimated 1RM should only be calculated for suitable external-load records and should not be applied blindly to:

- assistance load;
- cardio;
- arbitrary non-strength schemas.

---

## 17. Exercise management UI

The `动作` page manages ExerciseFamily and Exercise records.

### 17.1 Create exercise

Fields:

```text
名称                required
动作族              optional

次数                DISABLED / OPTIONAL / REQUIRED
重量                DISABLED / OPTIONAL / REQUIRED
时间                DISABLED / OPTIONAL / REQUIRED
距离                DISABLED / OPTIONAL / REQUIRED
速度                DISABLED / OPTIONAL / REQUIRED
坡度                DISABLED / OPTIONAL / REQUIRED
左右侧              DISABLED / OPTIONAL / REQUIRED

重量语义            NONE / EXTERNAL / BODYWEIGHT_PLUS / ASSISTANCE
```

Validation rules:

- if load is DISABLED, loadMode should normally be NONE;
- if load is enabled, loadMode must be meaningful and non-NONE;
- at least one record field should be enabled;
- exercise name must not be empty;
- duplicate-name handling should warn rather than silently create ambiguous duplicates.

### 17.2 Edit exercise

Allow:

- rename;
- family reassignment;
- schema change;
- load mode change with warning if history exists;
- archive/unarchive.

Changes must not mutate old ExerciseRecord values.

---

## 18. Import/export

JSON is the canonical backup/interchange format.

### 18.1 Export

Export should include:

- schema version;
- export timestamp;
- ExerciseFamily;
- Exercise;
- WorkoutSession;
- ExerciseBlock;
- ExerciseRecord;
- relevant settings required to reconstruct the database.

Suggested envelope:

```json
{
  "format": "gymlog-backup",
  "version": 1,
  "exportedAt": "2026-09-14T...",
  "data": {
    "exerciseFamilies": [],
    "exercises": [],
    "workoutSessions": [],
    "exerciseBlocks": [],
    "exerciseRecords": [],
    "settings": {}
  }
}
```

### 18.2 Import

Import must:

1. validate file type/format/version;
2. validate referential integrity;
3. show a summary before destructive replacement/merge;
4. avoid partial database corruption on failure;
5. define an explicit V1 strategy: replace-all is preferred initially because this is a single-user self-use product.

Merge/import conflict handling can be deferred unless clearly needed.

### 18.3 Historic note conversion

V1 does not require free-form text parsing.

Historic notes can be converted externally into the canonical JSON structure and imported.

---

## 19. Storage

Preferred V1 architecture:

```text
PWA
 ↓
IndexedDB
 ↓
Domain repositories / data access layer
 ↓
Statistics queries
```

Requirements:

- all core functions work offline after the PWA is installed/loaded;
- storage access is isolated behind a data layer;
- UI components must not directly scatter IndexedDB logic everywhere;
- schema versioning/migrations must exist from the first released version;
- indexes should support common session/exercise queries.

Potential IndexedDB indexes:

```text
WorkoutSession.date
ExerciseBlock.sessionId
ExerciseBlock.exerciseId
ExerciseRecord.exerciseBlockId
```

---

## 20. Navigation

Recommended V1 bottom navigation:

```text
训练 | 统计 | 动作 | 设置
```

Mobile-first behavior is the reference UX.

Desktop/responsive layouts may widen content but should preserve the same information architecture.

---

## 21. Non-goals for V1

Do not include unless scope is explicitly revised:

- social feed;
- friends/followers;
- training videos;
- coaching plans;
- nutrition logging;
- calorie tracking;
- Apple Health integration;
- wearable integration;
- automatic gym check-in;
- cloud account system;
- multi-user support;
- AI-generated workout programs;
- free-form natural-language workout import.

---

## 22. V1 acceptance criteria

V1 is functionally acceptable when all of the following are true:

1. User can create/edit/archive ExerciseFamily and Exercise entities.
2. Exercise creation supports required/optional/disabled record fields.
3. Load semantics support NONE, EXTERNAL, BODYWEIGHT_PLUS, and ASSISTANCE.
4. User can create a WorkoutSession with date and manually entered times.
5. Session can be saved without an end time.
6. User can add multiple ExerciseBlocks in order.
7. The same Exercise can appear twice in one session.
8. User can add/edit/delete/reorder records.
9. New strength records can efficiently reuse/copy previous row values.
10. User can inspect the previous performance of an exercise while logging.
11. Home groups sessions by week and opens editable session details.
12. Historical exercise display follows current Exercise name after rename.
13. Referenced exercises are archived rather than destructively deleted.
14. Statistics show current-year/current-month session counts and durations.
15. Statistics include an annual training heatmap/calendar.
16. Exercise details provide appropriate statistics according to schema/load mode.
17. Derived statistics are computed from raw records rather than stored as authoritative data.
18. User can export a complete versioned JSON backup.
19. User can import a valid backup without partial corruption.
20. Core logging/history/statistics work offline.

---

## 23. Open decisions to resolve before implementation plan is finalized

These are intentionally left as planning decisions rather than product-intent questions:

- exact frontend stack and component library;
- exact IndexedDB wrapper/library;
- cache/memoization strategy for statistics;
- exact estimated-1RM formula;
- exact annual heatmap visual intensity rule;
- whether overnight sessions are supported in V1;
- replace-all import transaction details;
- migration/versioning implementation;
- test pyramid and release gates;
- exact PWA installation/update behavior;
- whether “training week number” is configurable in V1 or deferred.

These should be resolved in implementation planning documents without changing the core product semantics above.
