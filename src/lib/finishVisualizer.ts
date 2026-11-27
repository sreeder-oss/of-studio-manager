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
  physicsPrompt: string;
  isBrushApplied?: boolean;
}> = [
  {
    id: 'Biolime',
    desc: 'Breathable eco-mineral lime plaster with soft organic movement',
    physicsPrompt:
      'Breathable eco-mineral Biolime plaster with soft, organic hand-applied tonal movement and natural matte mineral warmth.',
  },
  {
    id: 'Venetian Marmorino',
    desc: 'Classic crushed-marble plaster with layered depth & soft sheen',
    physicsPrompt:
      'Multi-coat compressed crushed-marble Venetian Marmorino plaster burnished flat with a steel trowel. Smooth to the touch with ZERO coarse grit or heavy stucco ridges, showing deep translucent tonal veining and subtle light-reflecting polish.',
  },
  {
    id: 'Limewash',
    desc: 'Chalky mineral brush-applied wash with natural clouding',
    physicsPrompt:
      'Thin, chalky, dead-flat mineral limewash applied with a wide masonry block brush in soft cross-hatch and cloudy strokes. ZERO plaster thickness, ZERO trowel marks, ZERO ridges, and ZERO specular sheen. Soft, airy, powdery mineral color variation.',
    isBrushApplied: true,
  },
  {
    id: 'Tadelakt',
    desc: 'Seamless burnished waterproof Moroccan lime plaster',
    physicsPrompt:
      'Dense, seamless waterproof Moroccan Tadelakt lime plaster compressed and burnished with a polishing stone, showing organic mottled mineral depth and a soft, waxy stone-polished sheen.',
  },
  {
    id: 'Microcement',
    desc: 'Modern architectural thin-set seamless concrete finish',
    physicsPrompt:
      'Ultra-thin, sleek monolithic architectural microcement skim-coat. Contemporary seamless concrete aesthetic with subtle fine-aggregate micro-pitting and soft tonal clouding — NOT chunky stucco and NOT busy marble veining.',
  },
  {
    id: 'Roman Clay',
    desc: 'Velvety, hand-troweled mineral clay with subtle suede-like depth',
    physicsPrompt:
      'Ultra-thin, velvety mineral Roman Clay with soft suede-like tonal variation, delicate feathered edges, and warm matte-to-satin depth — no heavy ridges or coarse sand.',
  },
  {
    id: 'Travertino',
    desc: 'Textured porous stone-like lime plaster with mineral pitting',
    physicsPrompt:
      'Porous, carved natural limestone Travertino plaster with subtle horizontal mineral pitting/striations and crisp matte stone character.',
  },
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
    defaultMovement: 'Medium',
    defaultTexture: 'Smooth',
  },
  {
    id: 'aged-copper',
    label: 'Metallic Copper-Bronze',
    subtitle: 'OF Sample Board',
    imagePath: '/samples/sample-copper.jpg',
    defaultSystem: 'Venetian Marmorino',
    defaultSheen: 'Burnished',
    defaultMovement: 'Medium',
    defaultTexture: 'Smooth',
  },
];

export interface VisualizerSwatchRef {
  manufacturer: string;
  code: string;
  name: string;
  hex: string;
  undertone: string;
  sheenBehavior: string;
}

export interface CompilePromptInput {
  surfaceTarget: SurfaceTarget;
  finishSystem: FinishSystem;
  movement: TrowelMovement;
  sheen: SurfaceSheen;
  texture: TextureDepth;
  hasInspirationImage: boolean;
  swatch?: VisualizerSwatchRef | null;
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
  const sysMeta = FINISH_SYSTEMS.find((s) => s.id === input.finishSystem);
  const movementLabel = sysMeta?.isBrushApplied ? 'Brush clouding / movement' : 'Movement / variation';
  const swatchInstruction = input.swatch
    ? `Factory-formulated color target: ${input.swatch.manufacturer} ${input.swatch.code} "${input.swatch.name}" (base hex ${input.swatch.hex}, undertone: ${input.swatch.undertone}). Light & texture behavior: ${input.swatch.sheenBehavior}`
    : '';
  const parts = [
    `Edit Photo 1 (the real jobsite space) to show an authentic ${input.finishSystem} finish applied to the ${input.surfaceTarget}.`,
    sysMeta ? `Material & application physics: ${sysMeta.physicsPrompt}` : '',
    SURFACE_PRESERVATION[input.surfaceTarget],
    `Finish parameters: ${movementLabel} = ${input.movement}; Surface sheen = ${input.sheen}; Surface profile = ${input.texture}.`,
    swatchInstruction,
    input.hasInspirationImage
      ? `Use Photo 2 (the Client Inspiration / Sample Board reference) for color tone, mineral depth, and surface character — adapt it realistically to Photo 1's exact architectural scale, perspective, and ambient daylight.`
      : input.swatch
        ? `Match the specified ${input.swatch.manufacturer} ${input.swatch.name} mineral color realistically to Photo 1's existing ambient daylight and shadows.`
        : `Use a refined, natural architectural mineral tone suited to the room's existing lighting.`,
    `Photorealism rules: Render genuine architectural surface micro-detail and realistic light falloff. Do NOT make it look like flat latex paint, CGI, or plastic 3D rendering. Preserve the exact camera angle, lens geometry, and room proportions of Photo 1.`,
  ].filter(Boolean);

  if (input.refinementNote && input.refinementNote.trim()) {
    parts.push(`Specific refinement instruction: ${input.refinementNote.trim()}`);
  }

  return parts.join('\n\n');
}

export function getVisualizerOpenRouterKey(): string {
  const clean = (s: string) =>
    s
      .replace(/^Bearer\s+/i, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim();
  const dedicated = clean(getStoredVisualizerKey());
  if (dedicated) {
    if (!dedicated.startsWith('sk-or-')) {
      throw new Error(
        'Finish Visualizer key must be an OpenRouter key starting with "sk-or-". Check Settings -> Finish Visualizer.',
      );
    }
    return dedicated;
  }
  const primary = clean(getStoredDeepSeekKey());
  if (primary.startsWith('sk-or-')) return primary;
  const backup = clean(getStoredBackupKey());
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
      'OpenRouter API key required for image generation. Paste your sk-or- key in Settings -> Finish Visualizer.',
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://of-studio-manager.lovable.app',
    'X-Title': 'OF Studio Manager - Finish Visualizer',
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
          if (/missing authentication header/i.test(errDetail)) {
            throw new Error(
              'OpenRouter rejected your API key (invalid or incomplete sk-or-v1-... key). Re-copy your full key from openrouter.ai/keys and click "Save Visualizer Key" in Settings.',
            );
          }
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

async function urlToDataUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Could not load generated image (${resp.status})`);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to convert generated image'));
    reader.readAsDataURL(blob);
  });
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

  const [beforeImg, afterImg, logoImg] = await Promise.all([
    loadImg(params.beforeUrl),
    loadImg(params.afterUrl),
    loadImg('/of-email-logo.png').catch(() => null),
  ]);

  const cardW = 1400;
  const pad = 44;
  const gap = 24;
  const headerH = 104;
  const footerH = 72;
  const panelW = (cardW - pad * 2 - gap) / 2;
  const aspect = beforeImg.height / Math.max(1, beforeImg.width);
  const panelH = Math.min(760, Math.max(420, Math.round(panelW * aspect)));
  const cardH = headerH + panelH + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Darkest Navy Blue (#1A2332) architectural studio background + Botanical Leaf Green top rule
  ctx.fillStyle = '#1A2332';
  ctx.fillRect(0, 0, cardW, cardH);
  ctx.fillStyle = '#49A33D';
  ctx.fillRect(0, 0, cardW, 5);

  // Header
  ctx.fillStyle = '#49A33D';
  ctx.font = 'bold 13px "Open Sans", sans-serif';
  ctx.fillText('ORGANIC FINISHES LLC  •  FINISH CONCEPT PREVIEW', pad, 44);

  ctx.fillStyle = '#E8E3D6';
  ctx.font = 'bold 28px "DM Serif Display", serif';
  ctx.fillText(params.title, pad, 82);

  if (logoImg) {
    const lh = 64;
    const lw = Math.round(lh * (logoImg.width / Math.max(1, logoImg.height)));
    ctx.drawImage(logoImg, cardW - pad - lw, 22, lw, lh);
  }

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
    ctx.fillStyle = 'rgba(26, 35, 50, 0.84)';
    ctx.fillRect(x + 14, y + 14, 96, 28);
    ctx.fillStyle = '#E8E3D6';
    ctx.font = 'bold 12px "Open Sans", sans-serif';
    ctx.fillText(label, x + 28, y + 33);
  };

  drawPanel(beforeImg, pad, headerH, 'BEFORE');
  drawPanel(afterImg, pad + panelW + gap, headerH, 'AFTER');

  // Footer
  const footerY = headerH + panelH + 40;
  ctx.fillStyle = '#E8E3D6';
  ctx.font = '600 15px "Open Sans", sans-serif';
  ctx.fillText(params.recipeLine, pad, footerY);

  ctx.fillStyle = '#9BA6B2';
  ctx.font = '500 13px "IBM Plex Mono", monospace';
  ctx.fillText('405-816-0750  •  contact@organicfinishesllc.org  •  organicfinishesllc.org  •  @organic.finishes', pad, footerY + 24);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode concept card PNG'));
    }, 'image/png');
  });
}
