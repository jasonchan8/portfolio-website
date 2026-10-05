import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = path.resolve(process.argv[2] ?? ROOT);
const OUT = path.join(ROOT, '.verify');
const RESUME_TEX = process.env.RESUME_TEX ?? path.join(os.homedir(), 'Desktop/resume/resume.tex');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SITE_URL = 'https://www.jasonchan.codes/';
const FIRST_LOAD_LIMIT = 200 * 1024;
const SHARE_CARD_LIMIT = 100 * 1024;
const FONT_PROBE = 'ü ç ñ ± ° • € → ≥ ·';
const FONT_FAMILY = /^JC Serif\b/;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'narrow', width: 320, height: 640, isMobile: true, hasTouch: true },
];
const FIGURE_WIRES = { 1440: true, 320: false };
const FORBIDDEN = ['github.com/jasonchan8'];
const PHONE = '8572894686';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
  '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dir, url);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function numberTokens(text) {
  const out = [];
  const standaloneNumber = /(?<![A-Za-z])(\d[\d,]*(?:\.\d+)?)(\s?[kK](?![a-zA-Z]))?/g;
  for (const m of text.matchAll(standaloneNumber)) {
    const raw = m[0].trim();
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (m[2]) n *= 1000;
    out.push({ raw, value: String(n), padded: /^0\d$/.test(m[1]) });
  }
  return out;
}

function readResume(file) {
  const tex = fs.readFileSync(file, 'utf8');
  const body = tex.slice(tex.indexOf('\\begin{document}')).replace(/(?<!\\)%.*/g, '');
  const arg = String.raw`\s*\{((?:[^{}]|\{[^{}]*\})*)\}`;
  const plain = (s) => s.split('\\textbar')[0].replace(/\\([ &%$#_])/g, '$1').replace(/\\[a-z]+|[{}]/gi, '').replace(/[\s~]+/g, ' ').trim();
  const required = [body.match(/mailto:([^}]+)/)?.[1]];
  for (const [, org, , title, dates] of body.matchAll(new RegExp(String.raw`\\entry${arg.repeat(4)}`, 'g'))) {
    required.push(plain(org), plain(title), ...(dates.match(/[A-Z][a-z]{2,3} \d{4}/g) ?? []));
  }
  for (const [, name, , date] of body.matchAll(new RegExp(String.raw`\\project${arg.repeat(3)}`, 'g'))) {
    required.push(...plain(name).split(/ \(([^()]+)\)$/), plain(date));
  }
  const facts = body.split('\n').filter((line) => !line.replace(/\D/g, '').includes(PHONE)).join('\n')
    .replace(/\\href\{[^}]*\}/g, '')
    .replace(/\d+(\.\d+)?(pt|in|em|ex|cm|mm)\b/g, '');
  return { numbers: new Set(numberTokens(facts).map((t) => t.value)), required: required.filter(Boolean) };
}

function monthIndices(text, originYear) {
  return [...text.matchAll(/\b([A-Z][a-z]{2,3}) (\d{4})\b/g)]
    .filter((m) => m[1].toLowerCase() in MONTHS)
    .map((m) => (Number(m[2]) - originYear) * 12 + MONTHS[m[1].toLowerCase()]);
}

function checkTermLabels(t) {
  if (!t) return ['terms chart: no .terms .gantt on the page'];
  const fails = [];
  const origin = t.ticks.find((tick) => tick.at === 0)?.year;
  if (!Number.isInteger(origin)) return ['terms chart: no axis label at --at: 0 names the start year'];
  for (const { year, at } of t.ticks) {
    if (at !== (year - origin) * 12) fails.push(`terms chart: the ${year} axis label has --at ${at}, want ${(year - origin) * 12}`);
  }
  for (const row of t.rows) {
    const org = row.label.split(',')[0];
    if (!(row.from >= 0 && row.from + row.len <= t.months)) fails.push(`terms chart: "${row.label}" falls outside the chart's ${t.months} months (--from ${row.from}, --len ${row.len})`);
    if (row.grad) {
      const [at] = monthIndices(row.label, origin);
      if (at !== row.from) fails.push(`terms chart: "${row.label}" has --from ${row.from}, want ${at}`);
      if (row.from + row.len !== t.months) fails.push(`terms chart: "${row.label}" ends at month ${row.from + row.len}, but --months is ${t.months}`);
      continue;
    }
    const n = /, (\d+) months?$/.exec(row.label)?.[1];
    if (Number(n) !== row.len) fails.push(`terms chart: "${row.label}" has --len ${row.len}`);
    const entry = t.entries.find((e) => e.org === org);
    if (!entry) { fails.push(`terms chart: no entry is headed "${org}"`); continue; }
    const [start, end] = monthIndices(entry.when, origin);
    if (start !== row.from) fails.push(`terms chart: ${org} has --from ${row.from}, but its entry starts in month ${start} (${entry.when})`);
    if (!row.open && end - start + 1 !== row.len) fails.push(`terms chart: ${org} has --len ${row.len}, but ${entry.when} spans ${end - start + 1} months`);
    if (Number(/(\d+) months?/.exec(entry.term)?.[1]) !== row.len) fails.push(`terms chart: ${org} has --len ${row.len}, but its entry says "${entry.term}"`);
    if (/to present$/i.test(entry.when) !== row.open) fails.push(`terms chart: ${org} ${row.open ? 'is .open, but its entry has an end date' : 'runs to present, but its row is not .open'}`);
  }
  for (const e of t.entries.filter((x) => /full-time/.test(x.term))) {
    if (!t.rows.some((r) => !r.grad && r.label.split(',')[0] === e.org)) fails.push(`terms chart: no row for the full-time term at ${e.org}`);
  }
  return fails;
}

function checkTermBars(t, where) {
  if (!t) return [];
  const unit = t.width / t.months;
  return t.rows.flatMap((row) => {
    const org = row.label.split(',')[0];
    const fails = [];
    if (!(Math.abs(row.barWidth - row.len * unit) <= 1)) fails.push(`terms chart at ${where}: the ${org} bar is ${row.barWidth.toFixed(1)}px, want ${(row.len * unit).toFixed(1)}px for ${row.len} of ${t.months} months`);
    if (!(Math.abs(row.barLeft - row.from * unit) <= 1)) fails.push(`terms chart at ${where}: the ${org} bar starts at ${row.barLeft.toFixed(1)}px, want ${(row.from * unit).toFixed(1)}px`);
    return fails;
  });
}

function checkHighlights(figure, where, radios, states) {
  const fails = [];
  states[0].forEach((el, i) => {
    if (!states.every((s) => s[i].shown)) return;
    const inRow = radios.map((r) => el.rows.includes(r.row));
    const on = new Set(states.filter((_, k) => inRow[k]).map((s) => s[i].look));
    const off = new Set(states.filter((_, k) => !inRow[k]).map((s) => s[i].look));
    if (on.size > 1 || off.size > 1 || [...on].some((look) => off.has(look))) {
      fails.push(`figure ${figure} at ${where}: ${el.name} does not follow the radios for rows ${el.rows.join(', ')}`);
    }
  });
  return fails;
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 140));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 700));
  });
}

function hiddenText(page) {
  return page.evaluate(() => {
    const hidden = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (!el || el.closest('[aria-hidden="true"], script, style, noscript, template, nav, dialog, [role="dialog"], [inert], [hidden]')) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      let opacity = 1;
      let invisible = false;
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        opacity *= parseFloat(cs.opacity);
        if (cs.visibility === 'hidden') invisible = true;
      }
      if (invisible || opacity < 0.1) hidden.push(node.textContent.trim().slice(0, 60));
    }
    return hidden;
  });
}

function overflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    if (sw > vw + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0) {
          offenders.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} right=${Math.round(r.right)}`);
        }
      }
    }
    return { viewport: vw, scrollWidth: sw, offenders: offenders.slice(0, 6) };
  });
}

function spill(page) {
  return page.evaluate(() => [...document.querySelectorAll('.sheet > *, .sub > *, .map')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1)
    .filter((el, _, wide) => !wide.some((inner) => inner !== el && el.contains(inner)))
    .map((el) => `${[el.tagName.toLowerCase(), ...el.classList].join('.')} "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30)}" has ${el.scrollWidth}px of content in a ${el.clientWidth}px box`));
}

function misplacedNotes(page) {
  return page.evaluate(() => [...document.querySelectorAll('.note:not(.terms)')].flatMap((note) => {
    const prev = note.previousElementSibling;
    const what = `"${note.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
    if (!prev) return [`${what} is the first child of its parent`];
    if (prev.matches('.note')) return [`${what} follows another note`];
    const top = note.getBoundingClientRect().top;
    const drift = Math.abs(top - prev.getBoundingClientRect().top);
    if (drift <= 8) return [];
    let above = prev.previousElementSibling;
    while (above && !above.matches('.note')) above = above.previousElementSibling;
    const slack = above ? Math.abs(top - above.getBoundingClientRect().bottom - parseFloat(getComputedStyle(above).marginBottom)) : Infinity;
    return slack > 8 ? [`${what} sits ${Math.round(drift)}px from the top of the element before it and ${above ? `${Math.round(slack)}px from the bottom margin of the note above it` : 'has no note above it'}`] : [];
  }));
}

function smallFigureText(page) {
  return page.evaluate(() => {
    const small = [];
    for (const fig of document.querySelectorAll('.fig')) {
      const walker = document.createTreeWalker(fig, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        const el = walker.currentNode.parentElement;
        if (!text || !el.getClientRects().length) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 14) small.push(`"${text.slice(0, 30)}" at ${size}px`);
      }
    }
    return small;
  });
}

function readTerms(page) {
  return page.evaluate(() => {
    const chart = document.querySelector('.terms');
    const list = chart?.querySelector('.gantt');
    if (!list) return null;
    const num = (el, prop) => parseFloat(getComputedStyle(el).getPropertyValue(prop));
    const box = list.getBoundingClientRect();
    return {
      months: num(chart, '--months'),
      width: box.width,
      ticks: [...chart.querySelectorAll('.axis span')].map((s) => ({ year: Number(s.textContent), at: num(s, '--at') })),
      rows: [...list.children].map((li) => {
        const bar = li.querySelector('.bar')?.getBoundingClientRect();
        return {
          label: li.querySelector('.who')?.textContent.trim() ?? '',
          from: num(li, '--from'),
          len: num(li, '--len'),
          open: li.classList.contains('open'),
          grad: li.classList.contains('grad'),
          barLeft: bar ? bar.left - box.left : NaN,
          barWidth: bar ? bar.width : NaN,
        };
      }),
      entries: [...document.querySelectorAll('article.entry')].map((a) => ({
        org: a.querySelector('h3')?.textContent.trim(),
        when: a.querySelector('.meta .when')?.textContent.trim() ?? '',
        term: a.querySelector('.meta .term')?.textContent.trim() ?? '',
      })),
    };
  });
}

function figureState(fig) {
  return fig.evaluate((f) => [...f.querySelectorAll('*')]
    .filter((el) => !el.closest('label') && [...el.classList].some((c) => /^r\d+$/.test(c)))
    .map((el) => {
      const cs = getComputedStyle(el);
      const text = el.textContent.trim();
      return {
        rows: [...el.classList].filter((c) => /^r\d+$/.test(c)).map((c) => Number(c.slice(1))),
        name: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}${text ? ` "${text}"` : ''}`,
        shown: el.getClientRects().length > 0,
        look: [cs.color, cs.stroke, cs.strokeWidth, cs.fontWeight, cs.textDecorationLine, cs.opacity,
          cs.outlineStyle, cs.outlineColor, cs.backgroundColor, cs.borderTopColor].join(' '),
      };
    }));
}

function settle(page) {
  return page.evaluate(async () => {
    const started = document.getAnimations().length;
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})));
    await new Promise(requestAnimationFrame);
    return started;
  });
}

async function exerciseFigures(page, where) {
  const fails = [];
  let animations = 0;
  const figures = await page.$$('figure.fig');
  if (!figures.length) return { fails: ['figures: no figure.fig on the page'], animations };
  for (const fig of figures) {
    const id = await fig.evaluate((f) => f.id || 'unnamed');
    const radios = await fig.$$eval('input[type="radio"]', (rs) => rs.map((r) => ({
      value: r.value,
      row: Number([...(r.closest('label')?.classList ?? [])].find((c) => /^r\d+$/.test(c))?.slice(1)),
    })));
    if (radios.length < 2 || radios.some((r) => !r.row)) { fails.push(`figure ${id}: needs two or more radios, each inside a label with a row class`); continue; }
    const rows = await fig.evaluate((f) => parseFloat(getComputedStyle(f.querySelector('.map') ?? f).getPropertyValue('--rows')));
    if (FIGURE_WIRES[where] && rows !== radios.length) fails.push(`figure ${id}: --rows is ${rows}, want ${radios.length}, one per radio`);
    const wires = await fig.$$eval('svg.wire', (ws) => ws.filter((w) => w.getClientRects().length).length);
    if (FIGURE_WIRES[where] && !wires) fails.push(`figure ${id} at ${where}px: no wires render`);
    if (!FIGURE_WIRES[where] && wires) fails.push(`figure ${id} at ${where}px: ${wires} wire set(s) render, want the stacked layout`);
    const labels = await fig.$$('label');
    const states = [];
    for (const [k, label] of labels.entries()) {
      await label.click();
      animations += await settle(page);
      states.push(await figureState(fig));
      await fig.screenshot({ path: path.join(OUT, `fig-${id}-${radios[k].value}-${where}.png`) });
    }
    fails.push(...checkHighlights(id, `${where}px`, radios, states));
    await labels[0].click();
    await fig.$eval('input[type="radio"]:checked', (r) => r.focus());
    await settle(page);
    for (let k = 1; k < radios.length; k++) {
      await page.keyboard.press('ArrowDown');
      await settle(page);
      const picked = await fig.$$eval('input[type="radio"]', (rs) => rs.findIndex((r) => r.checked));
      const state = await figureState(fig);
      if (picked !== k || JSON.stringify(state) !== JSON.stringify(states[k])) {
        fails.push(`figure ${id} at ${where}px: ArrowDown does not pick "${radios[k].value}" the way a click does`);
      }
    }
  }
  return { fails, animations };
}

async function probeFonts(page) {
  await page.evaluate((probe) => {
    const text = probe + [...new Set(document.body.innerText.replace(/\s/g, ''))].join('');
    for (const style of ['normal', 'italic']) {
      const p = document.createElement('p');
      p.className = `font-probe ${style}`;
      p.textContent = text;
      p.style.cssText = `font-family: var(--serif); font-style: ${style}; position: absolute; left: 0; top: 0; visibility: hidden;`;
      document.body.append(p);
    }
  }, FONT_PROBE);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const probes = [];
  for (const [selector, node] of [['h1', 'name'], ['.font-probe.normal', 'roman probe'], ['.font-probe.italic', 'italic probe']]) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { fonts } = nodeId ? await cdp.send('CSS.getPlatformFontsForNode', { nodeId }) : { fonts: [] };
    probes.push({ node, fonts });
  }
  await cdp.detach();
  await page.evaluate(() => document.querySelectorAll('.font-probe').forEach((p) => p.remove()));
  return probes;
}

async function checkShareCard(page, base) {
  const meta = await page.evaluate(() => ({
    image: document.querySelector('meta[property="og:image"]')?.content,
    url: document.querySelector('meta[property="og:url"]')?.content,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  }));
  if (!meta.image) return ['share card: no og:image meta'];
  const fails = [];
  if (meta.url !== SITE_URL) fails.push(`share card: og:url is ${meta.url}, want ${SITE_URL}`);
  if (meta.canonical !== SITE_URL) fails.push(`share card: canonical is ${meta.canonical}, want ${SITE_URL}`);
  if (!meta.image.startsWith(SITE_URL)) fails.push(`share card: og:image is ${meta.image}, want a URL under ${SITE_URL}`);
  const file = new URL(meta.image).pathname;
  const res = await fetch(new URL(file, base));
  if (!res.ok) return [...fails, `share card: ${file} is missing (${res.status})`];
  const png = Buffer.from(await res.arrayBuffer());
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  if (w !== 1200 || h !== 630) fails.push(`share card: ${file} is ${w}x${h}, want 1200x630`);
  if (png.length > SHARE_CARD_LIMIT) fails.push(`share card: ${file} is ${Math.round(png.length / 1024)} KB, over ${SHARE_CARD_LIMIT / 1024} KB`);
  return fails;
}

async function checkCopyButton(page, origin, touch) {
  if (!await page.$('button.copy')) return ['copy button: no button.copy on the page'];
  if (!await page.$eval('button.copy', (b) => b.getClientRects().length > 0)) return ['copy button: still hidden with JavaScript on'];
  const fails = [];
  const context = page.browserContext();
  const email = await page.$eval('#email', (a) => a.textContent.trim());
  const width = () => page.$eval('button.copy', (b) => b.getBoundingClientRect().width);
  const read = () => page.evaluate(() => ({
    status: document.getElementById('copy-status')?.textContent ?? '',
    label: document.querySelector('button.copy').innerText,
    selected: getSelection().toString(),
  }));
  const press = async () => {
    await page.bringToFront();
    if (touch) await page.tap('button.copy'); else await page.click('button.copy');
    await new Promise((r) => setTimeout(r, 200));
  };
  const idle = await width();
  if (!touch) {
    await context.overridePermissions(origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
    await press();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const after = await read();
    if (copied !== email) fails.push(`copy button: the clipboard holds "${copied}", want "${email}"`);
    if (!after.status) fails.push('copy button: the live region says nothing after a copy');
    if (Math.abs(await width() - idle) > 0.5) fails.push(`copy button: "${after.label}" changes the button width`);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
  }
  await context.overridePermissions(origin, []);
  await press();
  const refused = await read();
  if (refused.selected !== email) fails.push(`copy button: after a refusal the selection is "${refused.selected}", want the address`);
  if (!refused.status) fails.push('copy button: the live region says nothing after a refusal');
  if (/copied/i.test(`${refused.label} ${refused.status}`)) fails.push(`copy button: after a refusal it says "${refused.label}" and "${refused.status}"`);
  const hint = /\bpress\b/i.test(refused.status + refused.label);
  if (touch && hint) fails.push(`copy button: suggests a key combination on touch: "${refused.status}"`);
  if (!touch && !hint) fails.push(`copy button: no key combination on a fine pointer: "${refused.status}"`);
  if (Math.abs(await width() - idle) > 0.5) fails.push(`copy button: "${refused.label}" changes the button width`);
  await context.clearPermissionOverrides();
  return fails;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const server = await serve(SITE);
const origin = `http://127.0.0.1:${server.address().port}`;
const base = `${origin}/`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const report = { site: SITE, chrome: await browser.version(), viewports: {}, fail: [], warn: [], skip: [] };
let figureAnimations = 0;

async function open(vp, { scheme = 'light', motion = 'no-preference', js = true } = {}) {
  const page = await browser.newPage();
  const watch = { errors: [], failed: [], requests: 0, bytes: 0 };
  await page.setJavaScriptEnabled(js);
  await page.setCacheEnabled(false);
  await page.setViewport({ width: vp.width, height: vp.height, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  cdp.on('Network.loadingFinished', (e) => { watch.bytes += e.encodedDataLength; });
  page.on('console', (m) => { if (m.type() === 'error') watch.errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => watch.errors.push(String(e.message || e).slice(0, 200)));
  page.on('requestfailed', (r) => watch.failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    watch.requests++;
    if (r.status() >= 400) watch.failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(base, { waitUntil: 'networkidle0', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  return { page, watch };
}

for (const vp of VIEWPORTS) {
  const { page, watch } = await open(vp);
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, `${vp.name}-fold.png`) });
  await scrollThrough(page);
  const ov = await overflow(page);
  const hidden = await hiddenText(page);
  await page.screenshot({ path: path.join(OUT, `${vp.name}-full.png`), fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  report.viewports[vp.name] = { errors: watch.errors, failed: watch.failed, overflow: ov, hiddenAfterScroll: hidden.slice(0, 8), hiddenCount: hidden.length, height, requests: watch.requests, kb: Math.round(watch.bytes / 1024), loadMs: Date.now() - t0 };
  if (watch.errors.length) report.fail.push(`${vp.name}: ${watch.errors.length} console/page error(s): ${watch.errors[0]}`);
  if (watch.failed.length) report.fail.push(`${vp.name}: ${watch.failed.length} failed request(s): ${watch.failed[0]}`);
  if (watch.bytes > FIRST_LOAD_LIMIT) report.fail.push(`${vp.name}: first load is ${Math.round(watch.bytes / 1024)} KB, over ${FIRST_LOAD_LIMIT / 1024} KB`);
  if (ov.scrollWidth > ov.viewport + 1) report.fail.push(`${vp.name}: horizontal overflow ${ov.scrollWidth}px > ${ov.viewport}px (${ov.offenders[0] || '?'})`);
  if (hidden.length) report.fail.push(`${vp.name}: ${hidden.length} text node(s) still invisible after scrolling: "${hidden[0]}"`);

  const terms = await readTerms(page);
  report.fail.push(...checkTermBars(terms, `${vp.width}px`));
  for (const s of await smallFigureText(page)) report.fail.push(`${vp.name}: figure text under 14px: ${s}`);
  for (const s of await spill(page)) report.fail.push(`${vp.name}: ${s}`);

  if (vp.name === 'desktop') {
    report.fail.push(...checkTermLabels(terms));
    for (const s of await misplacedNotes(page)) report.fail.push(`note placement: ${s}`);
    await page.addScriptTag({ content: AXE });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
    });
    report.axe = axe;
    for (const v of axe.filter((v) => v.impact === 'serious' || v.impact === 'critical')) {
      report.fail.push(`axe ${v.impact}: ${v.id} (${v.nodes} node(s), e.g. ${v.sample})`);
    }
    for (const v of axe.filter((v) => v.impact !== 'serious' && v.impact !== 'critical')) {
      report.warn.push(`axe ${v.impact}: ${v.id} (${v.nodes} node(s))`);
    }

    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    report.links = links;
    for (const href of links) {
      if (/^(mailto:|tel:|#|https?:)/.test(href)) continue;
      const res = await fetch(new URL(href, base));
      if (!res.ok) report.fail.push(`broken internal link: ${href} (${res.status})`);
    }
    for (const href of links.filter((h) => h.startsWith('#') && h.length > 1)) {
      const found = await page.evaluate((id) => !!document.getElementById(decodeURIComponent(id)), href.slice(1));
      if (!found) report.fail.push(`broken anchor: ${href}`);
    }
    report.fail.push(...await checkShareCard(page, base));

    const text = await page.evaluate(() => {
      document.querySelectorAll('details').forEach((d) => { d.open = true; });
      document.querySelectorAll('[hidden="until-found"]').forEach((e) => e.removeAttribute('hidden'));
      document.querySelectorAll('[data-nofacts]').forEach((e) => e.remove());
      return document.body.innerText;
    });
    const flat = text.replace(/\s+/g, ' ').toLowerCase();
    const tokens = numberTokens(text);
    report.numbers = [...new Set(tokens.map((t) => t.raw))];
    if (fs.existsSync(RESUME_TEX)) {
      const resume = readResume(RESUME_TEX);
      const unbacked = [...new Set(tokens.filter((t) => !t.padded && !resume.numbers.has(t.value)).map((t) => t.raw))];
      if (unbacked.length) report.fail.push(`numbers on the page that are not in resume.tex: ${unbacked.join(', ')}`);
      for (const s of resume.required) if (!flat.includes(s.toLowerCase())) report.fail.push(`missing text from resume.tex: "${s}"`);
    } else {
      report.skip.push(`numbers and required text against the resume: no file at ${RESUME_TEX} (set RESUME_TEX)`);
    }
    const html = await page.content();
    for (const s of FORBIDDEN) if (html.includes(s)) report.fail.push(`forbidden content present: "${s}"`);
    if (html.replace(/\D/g, '').includes(PHONE)) report.fail.push('forbidden content present: the phone number');
    report.words = text.split(/\s+/).filter(Boolean).length;

    report.fonts = await probeFonts(page);
    for (const probe of report.fonts) {
      const foreign = probe.fonts.filter((f) => !f.isCustomFont || !FONT_FAMILY.test(f.familyName));
      if (!probe.fonts.length || foreign.length) report.fail.push(`font coverage: the ${probe.node} renders in ${(foreign.length ? foreign : [{ familyName: 'no font' }]).map((f) => f.familyName).join(', ')}`);
    }
  }

  if (vp.width in FIGURE_WIRES) {
    const { fails, animations } = await exerciseFigures(page, vp.width);
    report.fail.push(...fails);
    figureAnimations += animations;
  }
  if (vp.name === 'desktop' || vp.name === 'mobile') report.fail.push(...await checkCopyButton(page, origin, !!vp.hasTouch));
  await page.close();
}

for (const vp of VIEWPORTS.filter((v) => v.name === 'desktop' || v.name === 'mobile')) {
  const { page: dark } = await open(vp, { scheme: 'dark' });
  await new Promise((r) => setTimeout(r, 1500));
  await dark.screenshot({ path: path.join(OUT, `${vp.name}-dark-fold.png`) });
  if (vp.name === 'desktop') {
    await scrollThrough(dark);
    await dark.screenshot({ path: path.join(OUT, 'desktop-dark-full.png'), fullPage: true });
    await dark.addScriptTag({ content: AXE });
    const axeDark = await dark.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
    });
    report.axeDark = axeDark;
    for (const v of axeDark.filter((v) => v.impact === 'serious' || v.impact === 'critical')) {
      report.fail.push(`dark scheme axe ${v.impact}: ${v.id} (${v.nodes} node(s), e.g. ${v.sample})`);
    }
  }
  await dark.close();
}

const { page: rm } = await open(VIEWPORTS[0], { motion: 'reduce' });
await new Promise((r) => setTimeout(r, 400));
const rmHidden = await hiddenText(rm);
await rm.screenshot({ path: path.join(OUT, 'reduced-motion-full.png'), fullPage: true });
report.reducedMotionHidden = rmHidden.slice(0, 8);
if (rmHidden.length) report.fail.push(`reduced motion: ${rmHidden.length} text node(s) invisible without scrolling: "${rmHidden[0]}"`);
let rmAnimations = 0;
for (const label of await rm.$$('figure.fig label')) {
  await label.click();
  rmAnimations = Math.max(rmAnimations, await rm.evaluate(async () => {
    const now = document.getAnimations().length;
    await new Promise(requestAnimationFrame);
    return Math.max(now, document.getAnimations().length);
  }));
}
if (rmAnimations) report.fail.push(`reduced motion: picking a figure radio runs ${rmAnimations} animation(s) or transition(s)`);
if (!figureAnimations) report.warn.push('figures: nothing animates under no-preference, so the reduced-motion check proves nothing');
await rm.close();

const { page: nojs } = await open(VIEWPORTS[0], { js: false });
const njHidden = await hiddenText(nojs);
const njWords = await nojs.evaluate(() => document.body.innerText.split(/\s+/).filter(Boolean).length);
report.noJs = { hidden: njHidden.length, words: njWords };
if (njHidden.length) report.warn.push(`no JS: ${njHidden.length} text node(s) invisible: "${njHidden[0]}"`);
if (njWords < (report.words || 0) * 0.8) report.warn.push(`no JS: only ${njWords} of ${report.words} words render`);
if (await nojs.$$eval('button.copy', (bs) => bs.some((b) => b.getClientRects().length))) report.fail.push('no JS: the copy button shows, but it cannot work');
await nojs.close();

await browser.close();
server.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const d = report.viewports.desktop;
console.log(`${report.fail.length ? 'FAIL' : 'PASS'} ${path.basename(SITE)}: ${report.words} words, desktop ${d.height}px tall, ${d.requests} requests, ${d.kb} KB first load`);
for (const f of report.fail) console.log(`  fail  ${f}`);
for (const w of report.warn) console.log(`  warn  ${w}`);
for (const s of report.skip) console.log(`  SKIP  ${s}`);
process.exit(report.fail.length ? 1 : 0);
