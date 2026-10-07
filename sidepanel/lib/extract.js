// extract.js — HTML → intermediate "blocks" → Markdown / DOCX-XML renderers
'use strict';

// ── HTML → blocks ──────────────────────────────────────────────────────────
// block: { type: 'h1'..'h6' | 'p' | 'li' | 'quote' | 'code' | 'hr', text, href? }
function htmlToBlocks(htmlString, baseUrl) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  doc.querySelectorAll('script,style,noscript,svg,iframe,nav,header,footer').forEach(el => el.remove());

  const root = doc.querySelector('article') || doc.body;
  const blocks = [];

  function inlineText(node) {
    let out = '';
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent.replace(/\s+/g, ' ');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'br') { out += '\n'; return; }
        if (tag === 'strong' || tag === 'b') { out += `**${inlineText(child).trim()}**`; return; }
        if (tag === 'em' || tag === 'i') { out += `*${inlineText(child).trim()}*`; return; }
        if (tag === 'code') { out += `\`${child.textContent.trim()}\``; return; }
        if (tag === 'a') {
          const href = child.getAttribute('href');
          const label = inlineText(child).trim() || href || '';
          out += href ? `[${label}](${resolveUrl(href, baseUrl)})` : label;
          return;
        }
        out += inlineText(child);
      }
    });
    return out;
  }

  function walk(node) {
    node.childNodes.forEach(child => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        const text = inlineText(child).trim();
        if (text) blocks.push({ type: tag, text });
        return;
      }
      if (tag === 'p') {
        const text = inlineText(child).trim();
        if (text) blocks.push({ type: 'p', text });
        return;
      }
      if (tag === 'blockquote') {
        const text = inlineText(child).trim();
        if (text) blocks.push({ type: 'quote', text });
        return;
      }
      if (tag === 'pre') {
        const text = child.textContent.trim();
        if (text) blocks.push({ type: 'code', text });
        return;
      }
      if (tag === 'li') {
        const text = inlineText(child).trim();
        if (text) blocks.push({ type: 'li', text });
        return;
      }
      if (tag === 'hr') {
        blocks.push({ type: 'hr', text: '' });
        return;
      }
      if (tag === 'ul' || tag === 'ol' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'span' || tag === 'table' || tag === 'tbody' || tag === 'tr' || tag === 'td') {
        walk(child);
        return;
      }
      // fallback: descend anyway to not lose nested text
      walk(child);
    });
  }

  walk(root);

  if (blocks.length === 0) {
    const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ type: 'p', text: text.slice(0, 5000) });
  }

  return blocks;
}

function resolveUrl(href, baseUrl) {
  try { return new URL(href, baseUrl).href; } catch { return href; }
}

// ── blocks → Markdown ────────────────────────────────────────────────────
function blocksToMarkdown(blocks, title) {
  const lines = [];
  if (title) lines.push(`# ${title}`, '');
  for (const b of blocks) {
    switch (b.type) {
      case 'h1': lines.push(`# ${b.text}`, ''); break;
      case 'h2': lines.push(`## ${b.text}`, ''); break;
      case 'h3': lines.push(`### ${b.text}`, ''); break;
      case 'h4': lines.push(`#### ${b.text}`, ''); break;
      case 'h5': lines.push(`##### ${b.text}`, ''); break;
      case 'h6': lines.push(`###### ${b.text}`, ''); break;
      case 'quote': lines.push(`> ${b.text}`, ''); break;
      case 'code': lines.push('```', b.text, '```', ''); break;
      case 'li': lines.push(`- ${b.text}`); break;
      case 'hr': lines.push('---', ''); break;
      default: lines.push(b.text, '');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ── blocks → DOCX (word/document.xml body) ──────────────────────────────
function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function runsFromMarkdownish(text) {
  // Supports **bold** and *italic* markers produced by inlineText()
  const runs = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|([^*]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) runs.push({ text: m[1], bold: true });
    else if (m[2]) runs.push({ text: m[2], italic: true });
    else if (m[3]) runs.push({ text: m[3] });
  }
  return runs.length ? runs : [{ text }];
}

function runXml(run) {
  const props = [];
  if (run.bold) props.push('<w:b/>');
  if (run.italic) props.push('<w:i/>');
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(run.text)}</w:t></w:r>`;
}

function paragraphXml(text, style) {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  const runs = runsFromMarkdownish(text).map(runXml).join('');
  return `<w:p>${pPr}${runs}</w:p>`;
}

function blocksToDocxBody(blocks, title) {
  const paras = [];
  if (title) paras.push(paragraphXml(title, 'Title'));
  for (const b of blocks) {
    switch (b.type) {
      case 'h1': paras.push(paragraphXml(b.text, 'Heading1')); break;
      case 'h2': paras.push(paragraphXml(b.text, 'Heading2')); break;
      case 'h3': paras.push(paragraphXml(b.text, 'Heading3')); break;
      case 'h4': case 'h5': case 'h6': paras.push(paragraphXml(b.text, 'Heading3')); break;
      case 'quote': paras.push(paragraphXml(b.text, 'Quote')); break;
      case 'code': paras.push(paragraphXml(b.text)); break;
      case 'li': paras.push(paragraphXml(`•  ${b.text}`)); break;
      case 'hr': paras.push('<w:p/>'); break;
      default: paras.push(paragraphXml(b.text));
    }
  }
  return paras.join('');
}

function extractTitle(htmlString) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  return (doc.querySelector('title')?.textContent || '').trim();
}

window.PagePinExtract = { htmlToBlocks, blocksToMarkdown, blocksToDocxBody, extractTitle };
