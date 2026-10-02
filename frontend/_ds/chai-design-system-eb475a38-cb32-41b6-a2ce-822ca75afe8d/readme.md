# CHAI Design System

A design system for the **Clinton Health Access Initiative (CHAI)**, derived from the official *CHAI Identity Guide* (July 2023), *CHAI Style Guide* (Feb 2023), the *CHAI Template A* PowerPoint theme, and the official logo files.

CHAI is a global health organization committed to saving lives and reducing the burden of disease in low- and middle-income countries, while strengthening the capabilities of governments and the private sector to create and sustain high-quality health systems that can succeed without its assistance. It operates in 35+ countries, with 85% of employees based in those program countries.

## Source materials
- `uploads/CHAI Identity Guide.pdf` — logo, colors, fonts, photography, icons, maps.
- `uploads/CHAI Style Guide.pdf` — language, grammar, voice, boilerplate.
- `uploads/CHAI Language Reference.docx` — additional copy reference.
- `uploads/CHAI Template A.pptx` — Office theme (palette + Trebuchet MS font scheme); the brand photo and logo PNGs were extracted from here into `assets/`.
- `uploads/CHAI Word Template.docx` — document template.
- `uploads/CHAI logo blue.svg` / `CHAI logo white.svg` — primary logos (copied into `assets/`).

No website or app source code / Figma was provided. Examples here are reconstructions from the brand foundations, not from production code.

---

## CONTENT FUNDAMENTALS

CHAI follows **American English** per *The Chicago Manual of Style*.

- **Voice:** "We speak with one voice." Consistent, standardized, approved language. Boilerplate exists and substantial departures need Global Communications approval.
- **Person:** Third person in most external documents (press releases, proposals, reports). First-person "we" is acceptable in web copy and fact sheets.
- **Active voice** always: *"CHAI negotiated multiple agreements,"* not *"agreements were negotiated by CHAI."*
- **Tone:** Bold, positive, dignified, professional. Mission-driven and factual — never sensational. Subjects of programs are treated with respect.
- **Casing:** Sentence case for most text. Formal titles are lowercase unless they precede a name or appear in a headline. Only proper nouns are capitalized; disease names, procedures, and anatomical parts are *not* (e.g. "malaria," "tuberculosis").
- **"Global," not "HQ":** Boston-based teams are "Global Finance," never "HQ Finance."
- **Numbers:** Spell out zero–nine; numerals for 10+. Always numerals for ages, currency, ratios, percentages. Always spell out "percent" (not %), and "thousand/million/billion." Currency as `US$5 million`.
- **Acronyms:** Use sparingly externally. Spell out on first reference with the acronym in parentheses; no periods (USA, not U.S.A.).
- **Punctuation:** Serial (Oxford) comma always. Double quotation marks; punctuation inside them. Single space after periods.
- **URLs:** rendered lowercase without `http://` — e.g. `www.clintonhealthaccess.org`.
- **Emoji:** Not used. This is a formal global-health organization; communications are text- and photo-driven.
- **Photo captions:** Present tense, two sentences. First: who/what/where/when. Second: the bigger picture or a relevant fact. Always credited (`Photographer Name, Location`).

**Boilerplate (approved):** "The Clinton Health Access Initiative, Inc. (CHAI) is a global health organization committed to saving lives and reducing the burden of disease in low- and middle-income countries, while strengthening the capabilities of governments and the private sector in those countries to create and sustain high-quality health systems that can succeed without our assistance."

**Mission:** "Our mission is to save lives and reduce the burden of disease in low- and middle-income countries around the world."

---

## VISUAL FOUNDATIONS

**Overall vibe:** Clean, bold, positive, trustworthy, and restrained. A medical/institutional clarity centered on Dark Blue, lifted by a turquoise-teal-green accent family. Lots of white space; photography and data carry the emotion. Not decorative, not trendy — credible and human.

**Color** (see `tokens/colors.css`):
- **Dark Blue `#003E78`** is the primary color — used first whenever a non-black/dark-grey color is needed; it's the logo color. Headings and key UI live here.
- **Turquoise `#117996`** is the primary accent — used after Dark Blue: links, active indicators, accent buttons, top bars.
- **Light Blue `#D5E7EF`** is the first-choice callout/section background, paired with Dark Blue text.
- Accent palette: Teal `#6EDBCD`, Green `#1ED47F`, Gold `#F4B71B`, Light Gold `#FDF1D1`, Dark Red `#7C1220` — for highlights, chart series, and category coding.
- Neutrals: Black, Dark Grey `#333`, Grey `#767676`, Light Grey `#F2F2F2`, White.
- **Approved high-contrast pairings:** Light Blue bg + Dark Blue text; Turquoise bg + White text; Gold bg + Black text. Always aim for AA contrast.

**Type** (see `tokens/typography.css`):
- Official font is **Trebuchet MS** — the only approved font for documents and presentations, included with Windows/Office. Used directly here (web-safe). For external graphic-design work, **Fira Sans** (Google Fonts) is the sanctioned alternate and is loaded as the display fallback.
- Clean sans-serif hierarchy via size + weight + color. Bold (700) for headings and emphasis; regular (400) for body. Italic available. Headings frequently set in Dark Blue.

**Spacing & shape** (see `tokens/spacing.css`): 4px-based spacing scale. **Restrained corner radii** (3–10px; pills only for badges) — CHAI is institutional, not playful. Shadows are soft and blue-tinted (`rgba(0,62,120,…)`), low elevation.

**Backgrounds:** Predominantly white or Light Grey. Hero/section moments use solid **Dark Blue** or **Light Blue** fills. Full-bleed **photography** with a Dark Blue protection gradient is the signature hero treatment. No purple gradients, no textures, no busy patterns. Maps are used to show global program reach.

**Imagery:** Real, on-site program photography only — **never stock**. Warm, natural, documentary; positive and dignified depictions of beneficiaries and health workers; consent always obtained. Captions credited.

**Borders & cards:** Cards are white with a 1px neutral border and a soft shadow; an optional 4px turquoise top accent. The signature **callout box** is Light Blue with a Dark Blue left bar and Dark Blue text.

**Motion:** Subtle and functional — short fades and 120–200ms ease transitions on hover/focus. No bounces, no decorative looping animation. The CHAI logo must never be animated by third parties.

**Hover/press states:** Primary buttons darken on hover (Dark Blue → `#002b53`); accent darkens (Turquoise → `#0d6177`); outlined/ghost buttons pick up a Light Blue wash. Inputs show a turquoise border + soft turquoise focus ring. No shrink/scale on press.

**Logo:** Stars-arc wordmark. Maintain clear space (height of the "Clinton Health Access" text on all sides). Minimum 144px wide digital / 1in print. Never modify, recolor, rotate, stretch, or add effects. On busy backgrounds, place in a box first. Use the white logo on Dark Blue.

---

## ICONOGRAPHY

CHAI does not ship a proprietary icon font. Per the Identity Guide, icons are procured from **The Noun Project** (downloaded as SVG so they can be sized and recolored) and Microsoft Office's built-in icon set. The brand approach: simple, single-color line/glyph icons used to "concisely illustrate concepts with recognizable graphics," recolored to Dark Blue or Turquoise.

- **Recommended substitute for prototyping:** **Lucide** (https://lucide.dev) via CDN — a clean, consistent open-source line set that matches the Noun Project's thin-stroke style. Recolor strokes to `--chai-dark-blue` or `--chai-turquoise`. *(Flagged substitution: the original Noun Project icons are licensed per-download and not bundled here.)*
- **Emoji:** never used.
- **Unicode glyphs:** avoid as UI icons; use real SVG icons.
- The only brand "icon" assets included are the **logo files** in `assets/` (SVG + PNG, blue + white). Maps (not icons) are the preferred device for showing program reach.

---

## INDEX

**Root**
- `styles.css` — entry point; `@import`s all tokens. Consumers link this one file.
- `readme.md` — this guide.
- `SKILL.md` — Agent Skill wrapper.

**Tokens** (`tokens/`)
- `colors.css`, `typography.css`, `spacing.css`, `fonts.css`

**Assets** (`assets/`)
- `chai-logo-blue.svg` / `.png`, `chai-logo-white.svg` / `.png`, `photo-pharmacy.jpeg`

**Components** (`components/`) — namespace `window.CHAIDesignSystem_eb475a`
- `core/` — `Button`, `Card`, `Badge`
- `feedback/` — `Callout` (signature), `Stat`

**Guidelines** (`guidelines/`) — foundation specimen cards (Colors, Type, Spacing, Brand).

**UI Kits** (`ui_kits/`)
- `slides/` — CHAI presentation template slides (title, section, stats, quote, content) built on the PPTX theme.
