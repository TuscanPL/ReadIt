import JSZip from 'jszip';

export interface EpubMetadata {
  title?: string;
  author?: string;
  language?: string;
}

export interface EpubContent {
  metadata: EpubMetadata;
  text: string;
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

  // Read content files in spine order
  const textParts: string[] = [];

  for (const itemId of spine) {
    const item = manifest.get(itemId);
    if (!item) continue;

    const itemPath = opfDir + item.href;
    const content = await zip.file(itemPath)?.async('text');
    if (content) {
      const text = extractTextFromHtml(content);
      if (text.trim()) {
        textParts.push(text);
      }
    }
  }

  return {
    metadata,
    text: textParts.join('\n\n'),
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
