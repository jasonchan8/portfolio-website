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
  <ul class="bullets">
    <li>A bullet from resume.tex.</li>
  </ul>
</article>
```

- Copy the entry's bullets from `resume.tex` word for word, in the resume's order. Convert only the LaTeX. Write `\%` as `%`, `--` as "to", and a straight apostrophe as ’. Drop `\textbar{}`.
- Put the meta note directly after `.head`. On screens 62rem and wider, a CSS subgrid places notes in the margin. The meta note spans the rows of the head and the first bullets list. Put any other note, such as the reference-letter quote in the Teledyne FLIR entry, directly after the element it supports. The note sits in the margin on that element's row. After the first bullets list, the meta note already fills that row, so the note stacks directly under the meta note. Two notes in a row leave a gap in the reading column.
- At 1440px, `npm run verify` fails when a note is the first child of its parent or follows another note. It also fails when a note sits more than 8px from both the top of the element before it and the bottom margin of the note above it.
- Take every fact from the resume. `npm run verify` fails when the page shows a number that `resume.tex` does not contain. The full-time total is the one exception, because it adds up numbers that `resume.tex` does contain.
- `npm run verify` also takes each employer, title, and date from the `\entry` lines in `resume.tex`, and each project and date from the `\project` lines. A new resume entry fails verify until the page has it.
- For a full-time term, also add a row to the full-time total.

## Update the full-time total

The masthead leads with the number of months of full-time work, then lists each employer's months, most recent first. Each row has this shape:

```html
<li><span>Visa</span> <span>3<span class="vh"> months</span></span></li>
```

The hidden " months" makes a screen reader say "Visa 3 months". The row of the current term also ends in `<small>now</small>`.

The numbers come from `resume.tex`. The date field of each internship's `\entry` ends in "N mo full-time", and the total is the sum of those N. Because the sum appears nowhere in `resume.tex`, `npm run verify` adds it to the numbers that the page may show. It also reads the same date fields and fails when:

- The total is not the sum.
- The list's employers, months, or order differ from `resume.tex`.
- "now" marks an employer whose dates do not end in "Present", or misses the one whose dates do.
- An entry's `.meta .term` gives a different number of months from its resume entry.

### When the DraftKings term ends

Three places say that the term is current. Change them in one commit:

1. The masthead. The standfirst, `<meta name="description">`, and `og:description` say "intern at DraftKings".
2. The DraftKings entry. Its `.when` reads "Aug 2026 to present", and its `.term` gives the length. Its second bullet is in the present tense. Change the bullets in `resume.tex` first, then copy them again.
3. The full-time total. Remove `<small>now</small>` from the DraftKings row. If the term's final length is not 5 months, change the row and the total too.

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
