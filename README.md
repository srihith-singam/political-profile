# Political Fingerprint

A small web app that maps your politics as a six-sided "fingerprint". You answer a ballot of propositions on a five-point scale. The app then plots where you land on six axes and gives you an archetype name, like "The Fortified Reformer".

| Axis         | Center of the hexagon | Outer edge     |
|--------------|-----------------------|----------------|
| Economy      | Market                | Redistribution |
| Borders      | Open                  | Restricted     |
| Speech       | Guardrails            | Unfiltered     |
| Institutions | Steward               | Insurgent      |
| Technology   | Accelerate            | Restrain       |
| Culture      | Traditional           | Progressive    |

## Features

- **Ballot.** Answer each proposition from "Strongly disagree" to "Strongly agree", or pick "No view". Keyboard: `1`–`5` to answer, `0` to pass, `←` to go back.
- **Profile.** See your fingerprint, scores and archetype, and review or change any answer.
- **Check-ins.** New question packs are added over time. When you come back to answer them, your previous fingerprint is drawn behind the new one so you can see how your views moved.
- **Sharing.** Copy a ready-made post for X, or download your profile as a PNG card.
- **Backup.** Export your answers as JSON and import them on another device or browser.

Your answers are stored only in your browser (`localStorage`) and are never sent anywhere.

## Running it

There is no build step and nothing to install. Open `index.html` in a browser. It works straight from disk; serving the folder from any static web server also works.

## Project structure

| File             | What it holds                                             |
|------------------|-----------------------------------------------------------|
| `index.html`     | Page markup and the script tags                           |
| `styles.css`     | Styles; colors are tokens with light and dark themes      |
| `data.js`        | The six axes and the question packs                       |
| `store.js`       | Saved state, scoring and archetype naming                 |
| `dom.js`         | Small DOM helpers and the toast message                   |
| `fingerprint.js` | Drawing the hexagon on a canvas                           |
| `views.js`       | Intro, ballot and profile screens                         |
| `share.js`       | File saving, the X post text and the PNG card             |
| `main.js`        | Button wiring and startup                                 |

The scripts are plain (non-module) scripts that share one global scope, so the order of the `<script>` tags in `index.html` matters.

## Adding questions

Questions ship in packs in `data.js`, and packs are append-only. To add questions, add a new pack to the end of `PACKS`. Never edit or reuse an existing question `id`, because saved answers are keyed by it. Each question needs an axis (`ax`) and a direction: `dir: +1` if agreeing pushes toward the outer edge, `-1` if it pushes toward the center.
