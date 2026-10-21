# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Political Fingerprint" — a single-file, no-build web app (`index.html`) where a user answers Likert-scale propositions and gets a six-axis hexagonal "fingerprint", an archetype name, and shareable outputs (X post text, PNG card, JSON backup). There is no package manager, build step, linter, or test suite; open `index.html` in a browser to run it.

The file has no `<!doctype>`/`<html>`/`<head>` wrapper — it begins at `<title>` because it is authored as a Claude Artifact page (the host adds the skeleton). Keep that shape. It also probes `window.claude.use("downloads")` for file saving and falls back to an anchor-download shim when opened outside the artifact viewer.

## Layout of index.html

1. `<style>` — design tokens on `:root`, redefined for dark mode under both `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]`. Add new colors as tokens in all three places. Fonts: Bricolage Grotesque (headings), Newsreader (body), JetBrains Mono (UI labels), from Google Fonts only.
2. Markup — three `<main>` views (`view-intro`, `view-test`, `view-profile`) toggled by `show(name)`; only one is visible at a time.
3. One IIFE `<script>` (`"use strict"`, ES5-style `function` callbacks, `$()` = `getElementById`).

## Data model (top of the script)

- `AXES` — six axes (`econ`, `bord`, `speech`, `inst`, `tech`, `cult`), each with two `poles` and `words` (adj/noun pairs) used to build archetype names. Pole[0] is the hexagon center, pole[1] the outer edge.
- `PACKS` — question sets, each with `id`, `name`, `added` date, `covers`, and `items`. **Packs are append-only**: new questions ship as a new pack appended to the array; never rewrite or renumber existing item `id`s, since saved answers are keyed by them (unknown ids are silently dropped on load/import). The "Edition" number shown in the UI is `PACKS.length`.
- Item `dir: +1` means agreeing pushes toward pole[1]; `-1` toward pole[0]. Item `ax` must be an `AXES` key.
- Answers are `-2..2` (`CHOICES`) or the string `"pass"` ("No view").

## State and scoring

- Persisted to `localStorage` under `political-fingerprint/v1` (`load`/`save`/`blank`). `load()` backfills missing keys from `blank()`, so adding a state field only needs a default there.
- `scores()` maps each axis to 0–100 (50 = center) from `answer * dir` averaged over answered items on that axis.
- Check-ins / drift: `beginRun` snapshots `state.runFrom = scores()`; `finishRun` compares, increments `checkins`, and stores the old scores in `state.prev` (drawn as a ghost polygon on the profile) only if this isn't the first run and some axis moved.
- `renderNote` surfaces packs with unanswered items ("new since you last checked in" vs. "not answered yet").
- Backup JSON format is `{format:"political-fingerprint/v1", exported, handle, checkins, answers}`; import validates values and strips the handle to `[A-Za-z0-9_]`.

## Rendering

- Fingerprints are drawn on `<canvas>` via `drawPrint(canvas, vals, opt)`, reading colors from CSS tokens; canvases are redrawn on theme change (`matchMedia` listener near the end). `drawCard()` renders the downloadable PNG profile card.
- Ballot keyboard shortcuts: `1`–`5` answer, `0` pass, `←` back.
