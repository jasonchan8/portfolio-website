# jasonchan.codes

Jason Chan's portfolio. It is one static page, `index.html`, that GitHub Pages serves at https://www.jasonchan.codes/. There is no build step, and the only script on the page copies the email address.

## Files

- `index.html` holds the markup, the stylesheet, and the copy-button script.
- `fonts/` holds three subsets of Adobe's Source Serif 4, renamed JC Serif, and their license, `fonts/OFL.txt`.
- `og.png` is the 1200x630 card that link previews show.
- `resume/Jason_Chan_Resume.pdf` and `reference/JasonChan-Reference.pdf` are linked from the page. Keep their URLs.
- `scripts/verify.mjs` checks the page in headless Chrome, and `scripts/subset-fonts.py` cuts the fonts.
- `_config.yml` keeps `README.md`, `package.json`, and `scripts/` out of the published site.

## Add an entry

Every entry has this shape. Copy an existing `<article>` and edit it:

```html
<article class="sub entry" id="org">
  <div class="head"><h3>Org</h3><p class="role">Title, Team</p></div>
  <p class="note meta"><span class="when">Mon YYYY to Mon YYYY</span> <span class="term">N months, full-time</span> <span>City, ST</span> <span>Stack</span></p>
  <p class="lede">A line or two that stand alone.</p>
  <p><b>Label.</b> The claim.</p>
  <p class="note"><span class="k">Kind</span> The evidence.</p>
</article>
```

- Put each note directly after the paragraph it supports. On screens 62rem and wider, a CSS subgrid places a note in the margin on the row of the paragraph before it. A note anywhere else lands beside the wrong paragraph, and two notes in a row leave a gap in the reading column. At 1440px, `npm run verify` fails when a note is the first child of its parent, follows another note, or sits more than 8px from the top of the element before it.
- Take every fact from the resume. `npm run verify` fails when the page shows a number that `resume.tex` does not contain.
- `npm run verify` also takes each employer, title, and date from the `\entry` lines in `resume.tex`, and each project and date from the `\project` lines. A new resume entry fails verify until the page has it.
- For a full-time term, also add a row to the terms chart.

## Draw a term on the chart

The chart in the masthead draws each full-time term to scale. Each row is one `<li>` with two numbers:

```html
<li class="end" style="--from: 16; --len: 3"><span class="who">Visa, 3 months</span><span class="bar"></span></li>
```

- `--from` counts the months from January 2025 to the month the term starts: `(year - 2025) * 12 + (month - 1)`. May 2026 is 12 + 4 = 16.
- `--len` is the length of the term in months. The label reads "Org, N months", and N equals `--len`.
- `.terms` sets `--months: 29`, the span from January 2025 through May 2027. The B.S. row sits at `--from: 28`. A term outside that span needs a new start or end for the chart. Then update `--months`, every `--from`, and the `--at` positions of the axis labels.
- A term that runs to the present gets `class="open"`. Its bar fades out instead of ending on a date.

`npm run verify` checks this arithmetic. It fails when:

- A label disagrees with `--len`.
- `--from` disagrees with the entry's start date, or a closed term's `--len` disagrees with its start and end dates.
- `.open` disagrees with "to present".
- A row falls outside `--months`, or the B.S. row does not end at `--months`.
- An axis label's `--at` is not `(year - start) * 12`, where `start` is the year of the label at `--at: 0`.
- A bar's width is off by more than 1px.

## Edit a figure

The battery and validator figures have one radio per row. CSS highlights the readings of the checked row, so the figures need no script.

- A figure holds at most three rows. The stylesheet has rules for the row classes `r1`, `r2`, and `r3` only.
- `--rows` on the figure's `.map` must equal its number of radios. `npm run verify` fails when they differ.
- Each wire is an SVG path in a `0 0 100 100` viewBox. For row k of n rows, the path's y-coordinate is `(2k - 1) / (2n) * 100`. Three rows sit at 16.67, 50, and 83.33, and two rows sit at 25 and 75. A path to an output that spans every row, such as the battery's shared 0, ends at 50.

## When the DraftKings term ends

Three places say that the term is current. Change them in one commit:

1. The masthead. The standfirst, `<meta name="description">`, and `og:description` say "intern at DraftKings".
2. The DraftKings entry. Its `.when` reads "Aug 2026 to present", its `.term` gives the length, and its lede and its Build paragraph are in the present tense.
3. The chart row. Remove `class="open"`, and set `--len` and the label to the final number of months.

Then run `npm run verify`. `og.png` names no employer, so it stays as it is.

## Check the page

```sh
npm install
npm run verify
```

The script serves the repository root and loads the page in Chrome at 1440, 768, 390, and 320px, and in dark mode at 1440 and 390px. It prints one PASS or FAIL line, then one line per failure and warning, and exits with code 1 on failure. Screenshots and `report.json` go to `.verify/`.

- To check another directory, pass it as an argument: `node scripts/verify.mjs path/to/site`.
- `CHROME` sets the browser. The default is Google Chrome in `/Applications`.
- `RESUME_TEX` sets the resume source. The default is `~/Desktop/resume/resume.tex`. If that file is missing, the script prints SKIP for the checks against the resume.

## How the fonts were cut

Google Fonts serves Source Serif 4 without small caps or old-style figures, so the page hosts its own subsets of Adobe's release. The subsets are named JC Serif, because the font's license reserves the name "Source" and forbids it on a modified version such as a subset. `scripts/subset-fonts.py` records the source archive, its version (4.005R), and its sha256. It downloads the archive, checks the hash, and writes three faces:

- `serif-text.woff2` is the roman at weights 340 to 650 and optical size 20.
- `serif-italic.woff2` is the italic at weight 400 and optical size 20.
- `serif-display.woff2` is the roman at weight 400 and optical size 60. It holds only letters and a few punctuation marks, for the name.

The text faces cover Basic Latin, Latin-1, and the punctuation and symbols listed in the script, such as curly quotes, dashes, the bullet, primes, and ± ° × ÷ € → ≥ ≤ ™ © ®. They keep the features the page uses, including kern, liga, smcp, c2sc, onum, lnum, tnum, pnum, and case. To cut them again:

```sh
python3 -m venv /tmp/fonts-venv
/tmp/fonts-venv/bin/pip install fonttools==4.66.1 brotli==1.2.0
/tmp/fonts-venv/bin/python scripts/subset-fonts.py
```

The script also prints the `@font-face` rule for "JC Serif Fallback". The rule sizes Georgia to the subsets' width and line metrics, so text barely moves when the webfonts arrive. Paste it into `index.html` after you cut the fonts again or change much of the text.
