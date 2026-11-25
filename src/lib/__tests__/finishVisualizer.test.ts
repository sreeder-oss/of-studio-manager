import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compileFinishPrompt,
  dataUrlToFile,
  generateFinishVisualization,
  OF_SAMPLE_PRESETS,
} from '@/lib/finishVisualizer';
import {
  DEEPSEEK_KEY_STORAGE_KEY,
  GEMMA_KEY_STORAGE_KEY,
  VISUALIZER_KEY_STORAGE_KEY,
  VISUALIZER_MODEL_STORAGE_KEY,
} from '@/lib/aiModels';

describe('compileFinishPrompt', () => {
  it('includes surface preservation, craftsmanship variables, inspiration reference, and refinement note', () => {
    const prompt = compileFinishPrompt({
      surfaceTarget: 'Range Hood',
      finishSystem: 'Biolime',
      movement: 'Dramatic',
      sheen: 'Dead Flat Matte',
      texture: 'Light Trowel',
      hasInspirationImage: true,
      refinementNote: 'Keep the wood cabinets untouched and warmer cream tone',
    });

    expect(prompt).toContain('Biolime');
    expect(prompt).toContain('Range Hood');
    expect(prompt).toContain('wood cabinetry');
    expect(prompt).toContain('Movement / variation = Dramatic');
    expect(prompt).toContain('Surface sheen = Dead Flat Matte');
    expect(prompt).toContain('Surface profile = Light Trowel');
    expect(prompt).toContain('Photo 2 (the Client Inspiration / Sample Board reference)');
    expect(prompt).toContain('Do NOT make it look like flat latex paint, CGI');
    expect(prompt).toContain('Keep the wood cabinets untouched and warmer cream tone');
  });

  it('uses brush-applied physics for Limewash and forbids trowel marks', () => {
    const prompt = compileFinishPrompt({
      surfaceTarget: 'Fireplace',
      finishSystem: 'Limewash',
      movement: 'Medium',
      sheen: 'Dead Flat Matte',
      texture: 'Smooth',
      hasInspirationImage: false,
    });

    expect(prompt).toContain('masonry block brush');
    expect(prompt).toContain('ZERO trowel marks');
    expect(prompt).toContain('Brush clouding / movement = Medium');
    expect(prompt).not.toContain('hand-troweled');
  });
});

describe('OF_SAMPLE_PRESETS', () => {
  it('provides 4 real Organic Finishes work & sample board presets', () => {
    expect(OF_SAMPLE_PRESETS).toHaveLength(4);
    for (const p of OF_SAMPLE_PRESETS) {
      expect(p.imagePath).toMatch(/^\/samples\/.+\.jpg$/);
    }
  });
});

describe('generateFinishVisualization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem(DEEPSEEK_KEY_STORAGE_KEY);
    window.localStorage.removeItem(GEMMA_KEY_STORAGE_KEY);
    window.localStorage.removeItem(VISUALIZER_KEY_STORAGE_KEY);
    window.localStorage.removeItem(VISUALIZER_MODEL_STORAGE_KEY);
  });

  it('throws a clear Settings error when no OpenRouter sk-or- key is stored', async () => {
    await expect(
      generateFinishVisualization({
        roomImageDataUrl: 'data:image/jpeg;base64,abc',
        prompt: 'test prompt',
      }),
    ).rejects.toThrow(/OpenRouter API key required/i);
  });

  it('uses dedicated Visualizer key & Seedream 5.0 Lite Images API by default', async () => {
    window.localStorage.setItem(VISUALIZER_KEY_STORAGE_KEY, 'sk-or-seedream-key-999');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ b64_json: 'ZmFrZQ==', media_type: 'image/png' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await generateFinishVisualization({
      roomImageDataUrl: 'data:image/jpeg;base64,cm9vbQ==',
      inspirationImageDataUrl: 'data:image/jpeg;base64,aW5zcA==',
      prompt: 'Render Biolime',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toBe('https://openrouter.ai/api/v1/images');
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body || '{}')) as {
      model?: string;
      response_format?: string;
      input_references?: Array<{ type?: string }>;
    };
    expect(body.model).toBe('bytedance-seed/seedream-5-0-lite');
    expect(body.response_format).toBe('b64_json');
    expect(body.input_references).toHaveLength(2);
    expect(res.imageDataUrl).toBe('data:image/png;base64,ZmFrZQ==');
    expect(res.modelUsed).toBe('bytedance-seed/seedream-5-0-lite');
  });

  it('supports Gemini Chat API when Gemini is selected and reuses primary OpenRouter key', async () => {
    window.localStorage.setItem(DEEPSEEK_KEY_STORAGE_KEY, 'sk-or-test-key-123');
    window.localStorage.setItem(VISUALIZER_MODEL_STORAGE_KEY, 'google/gemini-2.5-flash-image-preview');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                images: [{ image_url: { url: 'data:image/png;base64,ZmFrZQ==' } }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await generateFinishVisualization({
      roomImageDataUrl: 'data:image/jpeg;base64,cm9vbQ==',
      inspirationImageDataUrl: 'data:image/jpeg;base64,aW5zcA==',
      prompt: 'Render Biolime',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toBe('https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body || '{}')) as {
      modalities?: string[];
      messages?: Array<{ content?: Array<{ type?: string }> }>;
    };
    expect(body.modalities).toEqual(['image', 'text']);
    expect(body.messages?.[0]?.content).toHaveLength(3);
    expect(res.imageDataUrl).toBe('data:image/png;base64,ZmFrZQ==');
  });
});

describe('dataUrlToFile', () => {
  it('converts a base64 data URL into a File with matching MIME type', () => {
    const file = dataUrlToFile('data:image/jpeg;base64,SGVsbG8=', 'walkthrough.jpg');
    expect(file.name).toBe('walkthrough.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(file.size).toBe(5);
  });
});
