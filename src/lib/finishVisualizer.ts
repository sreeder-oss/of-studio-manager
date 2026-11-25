import {
  getStoredBackupKey,
  getStoredDeepSeekKey,
  getStoredVisualizerKey,
  getStoredVisualizerModel,
  VISUALIZER_MODELS,
} from '@/lib/aiModels';

export type FinishSystem =
  | 'Biolime'
  | 'Venetian Marmorino'
  | 'Limewash'
  | 'Tadelakt'
  | 'Microcement'
  | 'Roman Clay'
  | 'Travertino';

export type SurfaceTarget =
  | 'Feature Wall'
  | 'Range Hood'
  | 'Fireplace'
  | 'Shower / Wet Area'
  | 'Ceiling';

export type TrowelMovement = 'Subtle' | 'Medium' | 'Dramatic';
export type SurfaceSheen = 'Dead Flat Matte' | 'Satin' | 'Burnished';
export type TextureDepth = 'Smooth' | 'Light Trowel' | 'Rustic';

export const FINISH_SYSTEMS: Array<{
  id: FinishSystem;
  desc: string;
}> = [
  { id: 'Biolime', desc: 'Breathable eco-mineral lime plaster with soft organic movement' },
  { id: 'Venetian Marmorino', desc: 'Classic crushed-marble plaster with layered depth & soft sheen' },
  { id: 'Limewash', desc: 'Chalky mineral brush-applied wash with natural clouding' },
  { id: 'Tadelakt', desc: 'Seamless burnished waterproof Moroccan lime plaster' },
  { id: 'Microcement', desc: 'Modern architectural thin-set seamless concrete finish' },
  { id: 'Roman Clay', desc: 'Velvety, hand-troweled mineral clay with subtle suede-like depth' },
  { id: 'Travertino', desc: 'Textured porous stone-like lime plaster with mineral pitting' },
];

export const SURFACE_TARGETS: SurfaceTarget[] = [
  'Feature Wall',
  'Range Hood',
  'Fireplace',
  'Shower / Wet Area',
  'Ceiling',
];

export const TROWEL_MOVEMENTS: TrowelMovement[] = ['Subtle', 'Medium', 'Dramatic'];
export const SURFACE_SHEENS: SurfaceSheen[] = ['Dead Flat Matte', 'Satin', 'Burnished'];
export const TEXTURE_DEPTHS: TextureDepth[] = ['Smooth', 'Light Trowel', 'Rustic'];

export interface OfsSamplePreset {
  id: string;
  label: string;
  subtitle: string;
  imagePath: string;
  defaultSystem: FinishSystem;
  defaultSheen: SurfaceSheen;
  defaultMovement: TrowelMovement;
  defaultTexture: TextureDepth;
}

/** Real Organic Finishes LLC work & sample boards from Shawn's field archive. */
export const OF_SAMPLE_PRESETS: OfsSamplePreset[] = [
  {
    id: 'limestone-fireplace',
    label: 'Limestone Plaster',
    subtitle: 'OF Fireplace',
    imagePath: '/samples/fireplace-limestone.jpg',
    defaultSystem: 'Travertino',
    defaultSheen: 'Dead Flat Matte',
    defaultMovement: 'Medium',
    defaultTexture: 'Light Trowel',
  },
  {
    id: 'charcoal-venetian',
    label: 'Charcoal Venetian',
    subtitle: 'OF Range Hood',
    imagePath: '/samples/hood-charcoal.jpg',
    defaultSystem: 'Venetian Marmorino',
    defaultSheen: 'Satin',
    defaultMovement: 'Dramatic',
    defaultTexture: 'Smooth',
  },
  {
    id: 'slaked-limewash',
    label: 'Slaked Limewash',
    subtitle: 'OF Sample Board',
    imagePath: '/samples/sample-limewash.jpg',
    defaultSystem: 'Limewash',
    defaultSheen: 'Dead Flat Matte',
    defaultMovement: 'Dramatic',
    defaultTexture: 'Light Trowel',
  },
  {
    id: 'aged-copper',
    label: 'Metallic Copper-Bronze',
    subtitle: 'OF Sample Board',
    imagePath: '/samples/sample-copper.jpg',
    defaultSystem: 'Venetian Marmorino',
    defaultSheen: 'Burnished',
    defaultMovement: 'Medium',
    defaultTexture: 'Light Trowel',
  },
];

export interface CompilePromptInput {
  surfaceTarget: SurfaceTarget;
  finishSystem: FinishSystem;
  movement: TrowelMovement;
  sheen: SurfaceSheen;
  texture: TextureDepth;
  hasInspirationImage: boolean;
  refinementNote?: string;
}

const SURFACE_PRESERVATION: Record<SurfaceTarget, string> = {
  'Feature Wall':
    'Apply the finish ONLY to the main architectural wall surface(s). Keep all baseboards, window/door trim, outlets, artwork, lighting fixtures, furniture, and natural shadows completely untouched.',
  'Range Hood':
    'Apply the finish ONLY to the kitchen range hood surround. Keep all wood cabinetry, tile backsplash, stovetop, range knobs, cookware, countertops, and room lighting completely untouched.',
  Fireplace:
    'Apply the finish ONLY to the fireplace surround / chimney breast. Keep the wood mantel, firebox, hearth, adjacent walls, outlets, and natural room lighting completely untouched.',
  'Shower / Wet Area':
    'Apply the finish ONLY to the shower enclosure walls. Keep all plumbing fixtures, glass doors, drains, niches/accessories, and bathroom lighting completely untouched.',
  Ceiling:
    'Apply the finish ONLY to the ceiling plane. Keep all crown molding, recessed lights, chandeliers, beams, walls, and room furnishings completely untouched.',
};

export function compileFinishPrompt(input: CompilePromptInput): string {
  const parts = [
    `Edit Photo 1 (the real jobsite space) to show an authentic, hand-troweled ${input.finishSystem} mineral plaster finish applied to the ${input.surfaceTarget}.`,
    SURFACE_PRESERVATION[input.surfaceTarget],
    `Craftsmanship variables: Trowel movement = ${input.movement}; Surface sheen = ${input.sheen}; Texture depth = ${input.texture}.`,
    input.hasInspirationImage
      ? `Use Photo 2 (the Client Inspiration / Sample Board reference) strictly for the mineral color warmth, tonal mottling, and plaster character — adapt it realistically to Photo 1's exact perspective and ambient daylight/lighting.`
      : `Use a refined, natural architectural mineral tone suited to the room's existing lighting.`,
    `Photorealism rules: Render genuine mineral plaster micro-texture, subtle natural trowel passes, and realistic light falloff. Do NOT make it look like flat latex paint, CGI, or plastic 3D rendering. Preserve the exact camera angle, lens geometry, and room proportions of Photo 1.`,
  ];

  if (input.refinementNote && input.refinementNote.trim()) {
    parts.push(`Specific refinement instruction: ${input.refinementNote.trim()}`);
  }

  return parts.join('\n\n');
}

export function getVisualizerOpenRouterKey(): string {
  const dedicated = getStoredVisualizerKey();
  if (dedicated) return dedicated;
  const primary = getStoredDeepSeekKey();
  if (primary.startsWith('sk-or-')) return primary;
  const backup = getStoredBackupKey();
  if (backup.startsWith('sk-or-')) return backup;
  return '';
}

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';
export const VISUALIZER_IMAGE_MODELS = VISUALIZER_MODELS.map((m) => m.id);

function getOrderedVisualizerModels() {
  const preferredId = getStoredVisualizerModel();
  const preferred = VISUALIZER_MODELS.find((m) => m.id === preferredId);
  const rest = VISUALIZER_MODELS.filter((m) => m.id !== preferredId);
  return preferred ? [preferred, ...rest] : VISUALIZER_MODELS;
}

export async function generateFinishVisualization(params: {
  roomImageDataUrl: string;
  inspirationImageDataUrl?: string | null;
  prompt: string;
  signal?: AbortSignal;
}): Promise<{ imageDataUrl: string; modelUsed: string }> {
  const apiKey = getVisualizerOpenRouterKey();
  if (!apiKey) {
    throw new Error(
      'OpenRouter API key required for image generation. Paste your sk-or- key in Settings → Finish Visualizer.',
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://of-manager.lovable.app',
    'X-Title': 'OF Studio Manager — Finish Visualizer',
  };

  let lastError = 'Image generation failed — please try again.';

  for (const modelCfg of getOrderedVisualizerModels()) {
    const model = modelCfg.id;

    if (modelCfg.endpoint === 'images') {
      const inputReferences: Array<{ type: 'image_url'; image_url: { url: string } }> = [
        { type: 'image_url', image_url: { url: params.roomImageDataUrl } },
      ];
      if (params.inspirationImageDataUrl) {
        inputReferences.push({
          type: 'image_url',
          image_url: { url: params.inspirationImageDataUrl },
        });
      }

      const resp = await fetch(OPENROUTER_IMAGES_URL, {
        method: 'POST',
        signal: params.signal,
        headers,
        body: JSON.stringify({
          model,
          prompt: params.prompt,
          response_format: 'b64_json',
          input_references: inputReferences,
        }),
      });

      if (!resp.ok) {
        let errDetail = `HTTP ${resp.status}`;
        try {
          const j = (await resp.json()) as { error?: { message?: string } | string };
          if (typeof j?.error === 'string') errDetail = j.error;
          else if (j?.error?.message) errDetail = j.error.message;
        } catch {
          /* ignore */
        }
        lastError = `${model}: ${errDetail}`;
        if (resp.status === 401 || resp.status === 402 || resp.status === 403) {
          throw new Error(`OpenRouter rejected the request (${errDetail}). Check your key/credits in Settings.`);
        }
        continue;
      }

      const imgJson = (await resp.json()) as {
        data?: Array<{ b64_json?: string; url?: string; media_type?: string }>;
      };
      const first = imgJson?.data?.[0];
      if (first?.b64_json) {
        const mime = first.media_type || 'image/png';
        return { imageDataUrl: `data:${mime};base64,${first.b64_json}`, modelUsed: model };
      }
      if (first?.url) {
        const dataUrl = await urlToDataUrl(first.url);
        return { imageDataUrl: dataUrl, modelUsed: model };
      }

      lastError = `${model} returned no image data.`;
      continue;
    }

    const contentParts: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [
      { type: 'text', text: params.prompt },
      { type: 'image_url', image_url: { url: params.roomImageDataUrl } },
    ];

    if (params.inspirationImageDataUrl) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: params.inspirationImageDataUrl },
      });
    }

    const resp = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      signal: params.signal,
      headers,
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: contentParts }],
      }),
    });

    if (!resp.ok) {
      let errDetail = `HTTP ${resp.status}`;
      try {
        const j = (await resp.json()) as { error?: { message?: string } | string };
        if (typeof j?.error === 'string') errDetail = j.error;
        else if (j?.error?.message) errDetail = j.error.message;
      } catch {
        /* ignore */
      }
      lastError = `${model}: ${errDetail}`;
      if (resp.status === 401 || resp.status === 402 || resp.status === 403) {
        throw new Error(`OpenRouter rejected the request (${errDetail}). Check your key/credits in Settings.`);
      }
      continue;
    }

    const data = (await resp.json()) as {
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
          content?:
            | string
            | Array<{ type?: string; image_url?: { url?: string }; text?: string }>;
        };
      }>;
    };

    const msg = data?.choices?.[0]?.message;
    const fromImages = msg?.images?.[0]?.image_url?.url;
    if (fromImages && fromImages.startsWith('data:image/')) {
      return { imageDataUrl: fromImages, modelUsed: model };
    }

    if (Array.isArray(msg?.content)) {
      const imgPart = msg.content.find((p) => p?.image_url?.url?.startsWith('data:image/'));
      if (imgPart?.image_url?.url) {
        return { imageDataUrl: imgPart.image_url.url, modelUsed: model };
      }
    }

    if (typeof msg?.content === 'string') {
      const match = msg.content.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/);
      if (match) {
        return { imageDataUrl: match[0], modelUsed: model };
      }
    }

    lastError = `${model} returned text without an edited image.`;
  }

  throw new Error(lastError);
}

/** Resizes an uploaded/camera File to a clean JPEG data URL (max 1400px edge). */
export async function resizeImageFileToDataUrl(file: File, maxEdge = 1400): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  return resizeDataUrl(rawUrl, maxEdge);
}

export async function urlToResizedDataUrl(url: string, maxEdge = 1200): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Could not load image (${resp.status})`);
  const blob = await resp.blob();
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to convert image'));
    reader.readAsDataURL(blob);
  });
  return resizeDataUrl(rawUrl, maxEdge);
}

async function resizeDataUrl(dataUrl: string, maxEdge: number): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid image format'));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, b64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export async function buildConceptCardPng(params: {
  beforeUrl: string;
  afterUrl: string;
  title: string;
  recipeLine: string;
}): Promise<Blob> {
  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image for concept card'));
      img.src = src;
    });

  const [beforeImg, afterImg] = await Promise.all([
    loadImg(params.beforeUrl),
    loadImg(params.afterUrl),
  ]);

  const cardW = 1400;
  const pad = 44;
  const gap = 24;
  const headerH = 92;
  const footerH = 68;
  const panelW = (cardW - pad * 2 - gap) / 2;
  const aspect = beforeImg.height / Math.max(1, beforeImg.width);
  const panelH = Math.min(760, Math.max(420, Math.round(panelW * aspect)));
  const cardH = headerH + panelH + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Dark architectural studio background
  ctx.fillStyle = '#0D0E10';
  ctx.fillRect(0, 0, cardW, cardH);

  // Header
  ctx.fillStyle = '#C8A97E';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('ORGANIC FINISHES LLC  •  FINISH CONCEPT PREVIEW', pad, 44);

  ctx.fillStyle = '#F2EFE9';
  ctx.font = 'bold 26px serif';
  ctx.fillText(params.title, pad, 78);

  const drawPanel = (img: HTMLImageElement, x: number, y: number, label: string) => {
    const imgRatio = img.width / Math.max(1, img.height);
    const boxRatio = panelW / panelH;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (imgRatio > boxRatio) {
      sw = img.height * boxRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / boxRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, panelW, panelH);

    // Label pill
    ctx.fillStyle = 'rgba(13, 14, 16, 0.78)';
    ctx.fillRect(x + 14, y + 14, 96, 28);
    ctx.fillStyle = '#F2EFE9';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(label, x + 28, y + 33);
  };

  drawPanel(beforeImg, pad, headerH, 'BEFORE');
  drawPanel(afterImg, pad + panelW + gap, headerH, 'AFTER');

  // Footer
  const footerY = headerH + panelH + 38;
  ctx.fillStyle = '#D8D2C7';
  ctx.font = '600 15px sans-serif';
  ctx.fillText(params.recipeLine, pad, footerY);

  ctx.fillStyle = '#9B968E';
  ctx.font = '500 13px sans-serif';
  ctx.fillText('405-816-0750  •  contact@organicfinishesllc.org  •  organicfinishesllc.org', pad, footerY + 24);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode concept card PNG'));
    }, 'image/png');
  });
}
