# Prompter

A prompt generator for generative AI. Pick a category, fill in parameters (or tap the suggestion chips), and Prompter combines them into one well-structured prompt. One click copies it and opens your AI tool of choice.

**Live app:** https://mrwengkb.github.io/Prompter/ (once GitHub Pages is enabled, see below)

## Categories

| Category | Parameters |
|---|---|
| 🖼️ Image | main objects/characters, action or posture, foreground, background, format, art style, colour set, lighting, mood, composition/camera, aspect ratio, detail & quality, text in image, things to avoid |
| 🎬 Video | subject, action, setting, shot type, camera movement, visual style, colours, lighting, mood, pacing, audio, duration, aspect ratio, things to avoid |
| ✍️ Writing | what to write, topic, role, audience, goal, key points, tone, length, format, language, constraints, reference material |
| 💻 Code | task, language, framework, description, inputs/outputs, existing code, error message, requirements, response format |

Image prompts can be output in three styles: **Natural** (ChatGPT, Gemini, Firefly…), **Midjourney** (`--ar`, `--no` flags) and **Tags + negative** (Stable Diffusion-style tools). Clicking Midjourney or Leonardo automatically uses its matching style.

## Send to AI tools

- **Auto-fill** (prompt is passed in the URL): ChatGPT, Claude, Copilot, Perplexity, Grok, Le Chat
- **Copy & paste** (tool opens, prompt is on your clipboard): Gemini, DeepSeek, Midjourney, Adobe Firefly, Ideogram, Leonardo, Sora, Runway, Kling, Luma, Pika

## Other features

- **中文 / English toggle** (top right): switches the whole interface, and the generated prompt is written in the same language. The choice is remembered; first visit follows the browser language
- Live preview; the prompt is editable by hand
- Example, Surprise me (random image/video ideas) and Clear buttons
- Share link that reopens the same settings
- Recent prompts history, saved in your browser
- Light/dark mode, mobile friendly, Ctrl/⌘+Enter to copy
- No backend, no tracking: everything runs in the browser

## Run it

Open `index.html` in a browser, or serve the folder with any static server (`python3 -m http.server`).

### Publish with GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)** → Save.

## Add a tool or category

Everything is data-driven in `js/app.js` (Chinese labels live in `js/i18n.js`, Chinese prompt templates in each category's `buildZh()`): add an entry to `TOOLS` (with `url` for prefill or `open` for copy & paste), or a new entry in `CATEGORIES` with `fields`, `tools` and a `build()` function.
