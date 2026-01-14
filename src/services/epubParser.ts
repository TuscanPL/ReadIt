import JSZip from 'jszip';

export interface EpubMetadata {
  title?: string;
  author?: string;
  language?: string;
}

export interface TocEntry {
  title: string;
  href: string;        // Original href from TOC
  wordIndex: number;   // Starting word index in our content
  level: number;       // Nesting level (1 = top level)
}

export interface EpubContent {
  metadata: EpubMetadata;
  text: string;
  toc: TocEntry[];
}

export async function parseEpub(file: File): Promise<EpubContent> {
  const zip = await JSZip.loadAsync(file);

  // Find container.xml to get the OPF file path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('Invalid EPUB: Missing container.xml');
  }

  const opfPath = getOpfPath(containerXml);
  if (!opfPath) {
    throw new Error('Invalid EPUB: Cannot find OPF file path');
  }

  // Get the directory of the OPF file for resolving relative paths
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

  // Parse the OPF file
  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error('Invalid EPUB: Cannot read OPF file');
  }

  const metadata = parseMetadata(opfContent);
  const spine = parseSpine(opfContent);
  const manifest = parseManifest(opfContent);

  // Try to get TOC
  const rawToc = await parseToc(zip, opfContent, opfDir, manifest);

  // Read content files in spine order, tracking word positions per file
  const textParts: string[] = [];
  const fileWordPositions = new Map<string, number>(); // href -> starting word index
  let currentWordIndex = 0;

  for (const itemId of spine) {
    const item = manifest.get(itemId);
    if (!item) continue;

    const itemPath = opfDir + item.href;
    const content = await zip.file(itemPath)?.async('text');
    if (content) {
      const text = extractTextFromHtml(content);
      if (text.trim()) {
        // Store the word position for this file
        fileWordPositions.set(item.href, currentWordIndex);

        // Also store with full path for matching
        fileWordPositions.set(itemPath, currentWordIndex);

        textParts.push(text);
        currentWordIndex += text.split(/\s+/).filter(w => w.length > 0).length;
      }
    }
  }

  // Map TOC entries to word indices
  const toc = mapTocToWordIndices(rawToc, fileWordPositions, opfDir);

  return {
    metadata,
    text: textParts.join('\n\n'),
    toc,
  };
}

function getOpfPath(containerXml: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = doc.querySelector('rootfile');
  return rootfile?.getAttribute('full-path') || null;
}

function parseMetadata(opfContent: string): EpubMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfContent, 'application/xml');

  const metadata: EpubMetadata = {};

  // Try different namespace prefixes
  const titleEl = doc.querySelector('title, dc\\:title, [property="dcterms:title"]');
  const authorEl = doc.querySelector('creator, dc\\:creator, [property="dcterms:creator"]');
  const languageEl = doc.querySelector('language, dc\\:language, [property="dcterms:language"]');

  if (titleEl) metadata.title = titleEl.textContent || undefined;
  if (authorEl) metadata.author = authorEl.textContent || undefined;
  if (languageEl) metadata.language = languageEl.textContent || undefined;

  return metadata;
}

function parseSpine(opfContent: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfContent, 'application/xml');

  const spine: string[] = [];
  const itemrefs = doc.querySelectorAll('spine itemref');

  itemrefs.forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    if (idref) {
      spine.push(idref);
    }
  });

  return spine;
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

function parseManifest(opfContent: string): Map<string, ManifestItem> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfContent, 'application/xml');

  const manifest = new Map<string, ManifestItem>();
  const items = doc.querySelectorAll('manifest item');

  items.forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');

    if (id && href) {
      manifest.set(id, {
        id,
        href: decodeURIComponent(href),
        mediaType: mediaType || '',
      });
    }
  });

  return manifest;
}

function extractTextFromHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'application/xhtml+xml');

  // Remove script and style elements
  doc.querySelectorAll('script, style').forEach((el) => el.remove());

  // Get the body content, or the whole document if no body
  const body = doc.body || doc.documentElement;

  // Extract text while preserving some structure
  return extractTextFromElement(body);
}

function extractTextFromElement(element: Element): string {
  const blocks: string[] = [];

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();

      // Skip certain elements
      if (['script', 'style', 'nav', 'aside'].includes(tagName)) {
        continue;
      }

      const childText = extractTextFromElement(el);
      if (childText) {
        // Add extra spacing for block elements
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'section', 'article'].includes(tagName)) {
          blocks.push('\n' + childText + '\n');
        } else if (['br'].includes(tagName)) {
          blocks.push('\n');
        } else {
          blocks.push(childText);
        }
      }
    }
  }

  return blocks.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Raw TOC entry before word index mapping
interface RawTocEntry {
  title: string;
  href: string;
  level: number;
}

// Parse TOC - try NCX first (EPUB 2), then NAV (EPUB 3)
async function parseToc(
  zip: JSZip,
  opfContent: string,
  opfDir: string,
  manifest: Map<string, ManifestItem>
): Promise<RawTocEntry[]> {
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'application/xml');

  // Try EPUB 3 NAV document first (look for item with properties="nav")
  for (const [, item] of manifest) {
    const manifestItem = opfDoc.querySelector(`manifest item[id="${item.id}"]`);
    const properties = manifestItem?.getAttribute('properties') || '';
    if (properties.includes('nav')) {
      const navPath = opfDir + item.href;
      const navContent = await zip.file(navPath)?.async('text');
      if (navContent) {
        const toc = parseNavToc(navContent);
        if (toc.length > 0) return toc;
      }
    }
  }

  // Try EPUB 2 NCX
  const spine = opfDoc.querySelector('spine');
  const ncxId = spine?.getAttribute('toc');
  if (ncxId) {
    const ncxItem = manifest.get(ncxId);
    if (ncxItem) {
      const ncxPath = opfDir + ncxItem.href;
      const ncxContent = await zip.file(ncxPath)?.async('text');
      if (ncxContent) {
        const toc = parseNcxToc(ncxContent);
        if (toc.length > 0) return toc;
      }
    }
  }

  // Fallback: look for toc.ncx in common locations
  const commonNcxPaths = ['toc.ncx', opfDir + 'toc.ncx', 'OEBPS/toc.ncx'];
  for (const ncxPath of commonNcxPaths) {
    const ncxContent = await zip.file(ncxPath)?.async('text');
    if (ncxContent) {
      const toc = parseNcxToc(ncxContent);
      if (toc.length > 0) return toc;
    }
  }

  return [];
}

// Parse EPUB 2 NCX format
function parseNcxToc(ncxContent: string): RawTocEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(ncxContent, 'application/xml');
  const entries: RawTocEntry[] = [];

  function parseNavPoint(navPoint: Element, level: number) {
    const textEl = navPoint.querySelector(':scope > navLabel > text');
    const contentEl = navPoint.querySelector(':scope > content');

    const title = textEl?.textContent?.trim() || '';
    const href = contentEl?.getAttribute('src') || '';

    if (title && href) {
      entries.push({ title, href: decodeURIComponent(href), level });
    }

    // Parse nested navPoints
    const childNavPoints = navPoint.querySelectorAll(':scope > navPoint');
    childNavPoints.forEach(child => parseNavPoint(child, level + 1));
  }

  const navMap = doc.querySelector('navMap');
  if (navMap) {
    const topLevelNavPoints = navMap.querySelectorAll(':scope > navPoint');
    topLevelNavPoints.forEach(navPoint => parseNavPoint(navPoint, 1));
  }

  return entries;
}

// Parse EPUB 3 NAV format
function parseNavToc(navContent: string): RawTocEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(navContent, 'application/xhtml+xml');
  const entries: RawTocEntry[] = [];

  // Find the nav element with epub:type="toc" or just the first nav with a list
  const tocNav = doc.querySelector('nav[epub\\:type="toc"], nav[*|type="toc"]') ||
                 doc.querySelector('nav');

  if (!tocNav) return entries;

  function parseListItem(li: Element, level: number) {
    const anchor = li.querySelector(':scope > a');
    if (anchor) {
      const title = anchor.textContent?.trim() || '';
      const href = anchor.getAttribute('href') || '';

      if (title && href) {
        entries.push({ title, href: decodeURIComponent(href), level });
      }
    }

    // Parse nested lists
    const nestedList = li.querySelector(':scope > ol, :scope > ul');
    if (nestedList) {
      const nestedItems = nestedList.querySelectorAll(':scope > li');
      nestedItems.forEach(item => parseListItem(item, level + 1));
    }
  }

  const topList = tocNav.querySelector('ol, ul');
  if (topList) {
    const topItems = topList.querySelectorAll(':scope > li');
    topItems.forEach(item => parseListItem(item, 1));
  }

  return entries;
}

// Map TOC hrefs to word indices
function mapTocToWordIndices(
  rawToc: RawTocEntry[],
  fileWordPositions: Map<string, number>,
  opfDir: string
): TocEntry[] {
  return rawToc.map(entry => {
    // Remove fragment identifier for file matching
    const hrefWithoutFragment = entry.href.split('#')[0] ?? '';

    // Try different path variations
    let wordIndex = fileWordPositions.get(hrefWithoutFragment);

    if (wordIndex === undefined && hrefWithoutFragment) {
      wordIndex = fileWordPositions.get(opfDir + hrefWithoutFragment);
    }

    // Try without leading path components
    if (wordIndex === undefined && hrefWithoutFragment) {
      const fileName = hrefWithoutFragment.split('/').pop() ?? '';
      for (const [key, value] of fileWordPositions) {
        if (key.endsWith('/' + fileName) || key === fileName) {
          wordIndex = value;
          break;
        }
      }
    }

    return {
      title: entry.title,
      href: entry.href,
      wordIndex: wordIndex ?? 0,
      level: entry.level,
    };
  }).filter(entry => entry.title.length > 0);
}
