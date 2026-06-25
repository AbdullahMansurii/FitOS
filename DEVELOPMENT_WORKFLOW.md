# FitOS Development Workflow

This workflow should be followed before adding any new features, changing architecture, switching AI models, or continuing development after a break.

---

# STEP 1 — Maintain Core Documentation

Keep these files updated:

```text
PROJECT_CONTEXT.md
ARCHITECTURE.md
CHANGELOG.md
MODEL_HANDOVER.md
docs/ARCHITECTURE_DECISIONS.md
```

Purpose:

* PROJECT_CONTEXT.md → Product vision and rules
* ARCHITECTURE.md → Technical architecture
* CHANGELOG.md → Feature and version history
* MODEL_HANDOVER.md → Onboarding guide for AI models
* docs/ARCHITECTURE_DECISIONS.md → Important product and engineering decisions

---

# STEP 2 — New Model Onboarding

Whenever switching to:

* Claude
* GPT
* Gemini
* Grok
* Any future AI model

Always start with:

"You are joining an existing project.

Read:

1. PROJECT_CONTEXT.md
2. ARCHITECTURE.md
3. CHANGELOG.md
4. MODEL_HANDOVER.md
5. docs/ARCHITECTURE_DECISIONS.md

Do not write code.

Provide:

1. Your understanding of FitOS.
2. Current architecture summary.
3. Current development stage.
4. Product vision summary.
5. Potential risks.
6. What you believe should be built next.
7. Questions you have before making changes.

If anything is unclear, ask questions instead of making assumptions."

Wait for the model's response before proceeding.

---

# STEP 3 — Feature Analysis Phase

Before implementing any new feature:

Use:

"Analyze this feature before implementation.

Do not write code.

Evaluate:

1. Product impact
2. Architecture impact
3. Database impact
4. AI impact
5. User experience impact
6. Future scalability impact

Identify:

* Risks
* Edge cases
* Simpler alternatives
* Technical debt concerns

Suggest the best implementation approach.

Wait for approval before coding."

Review the analysis first.

Only proceed if the approach is acceptable.

---

# STEP 4 — Architecture Review

For major features:

Ask:

"Review how this feature fits into the existing FitOS architecture.

Provide:

1. Required database changes
2. Required API changes
3. Required UI changes
4. Required AI changes
5. Potential future problems
6. Alternative implementations

Recommend the cleanest long-term solution.

Do not write code."

---

# STEP 5 — Implementation

Only after:

* Feature analysis completed
* Architecture review completed
* Decisions approved

Then ask the model to implement.

---

# STEP 6 — Code Review

After implementation:

Use:

"Act as a Senior Software Engineer.

Review all changes.

Check:

1. Code quality
2. TypeScript quality
3. React best practices
4. Architecture consistency
5. Security
6. Performance
7. Maintainability

Identify:

* Bugs
* Technical debt
* Refactoring opportunities

Do not modify code.
Only review."

Fix important issues before continuing.

---

# STEP 7 — Update Documentation

After every meaningful change:

Update:

### CHANGELOG.md

Add:

* New features
* Fixes
* Improvements

### docs/ARCHITECTURE_DECISIONS.md

Add:

* Important decisions
* Reasons behind decisions

This preserves project history.

---

# STEP 8 — Periodic Full Audit

Every major version:

Example:

* v1.1
* v1.2
* v1.3

Run:

"You are acting as a Senior Software Architect, Senior Product Manager, and Senior Full Stack Engineer.

Analyze the entire FitOS codebase.

Perform a complete audit covering:

1. Architecture Review

* Folder structure
* Component organization
* Separation of concerns
* Scalability
* Maintainability

2. Code Quality Review

* Repeated code
* Over-engineering
* Under-engineering
* TypeScript quality
* Error handling
* Edge cases

3. React Review

* State management
* Unnecessary re-renders
* Component complexity
* Hooks usage

4. Database Review

* Schema design
* Relationships
* Query efficiency
* Future scalability

5. AI Integration Review

* Prompt management
* Context retrieval
* Memory architecture
* Future AI scalability

6. Security Review

* Sensitive data exposure
* API key handling
* Environment variables

7. Performance Review

* Bundle size
* Loading performance
* API efficiency
* Rendering performance

8. Technical Debt Review

Identify:

* Critical issues
* Medium priority issues
* Low priority issues

9. Product Review

Evaluate whether the implementation still aligns with:

* FitOS vision
* AI-first philosophy
* Fitness Operating System concept

10. Refactoring Opportunities

List:

* Quick wins
* Medium improvements
* Major improvements

Output:

* Critical issues
* Recommended fixes
* Future risks
* Overall project score out of 10
* Suggested next priorities

Do not modify code.
Only perform a detailed audit."

---

# STEP 9 — Product Principles (Never Break These)

FitOS Principles:

1. AI-first, not AI-only
2. Manual confirmation + automated assistance
3. Historical context over isolated data
4. Consistency over complexity
5. Data before intelligence
6. Provider-agnostic AI architecture
7. Single-user optimized, future-user compatible

Any implementation that violates these principles should be challenged before merging.

---

# STEP 10 — Development Priority Order

Always prioritize:

1. Reliability
2. Data Quality
3. User Experience
4. Architecture
5. New Features

Never sacrifice architecture or usability for feature quantity.

---

# Current FitOS Vision

FitOS is a Fitness Operating System with an AI Coach.

Its purpose is to:

* Track nutrition
* Track workouts
* Track weight and body metrics
* Maintain long-term fitness memory
* Provide personalized coaching
* Help answer:

"What happened?"
"Why did it happen?"
"What should I do next?"

The goal is not to become another fitness tracker.

The goal is to become a long-term fitness intelligence system.
