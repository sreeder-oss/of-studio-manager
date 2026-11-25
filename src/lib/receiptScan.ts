import { supabase } from '@/integrations/supabase/client';
import { getStoredDeepSeekKey, getStoredBackupKey, getStoredModelId } from '@/lib/aiModels';

export interface ReceiptScanResult {
  vendor: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
}

/** Downscale a photo to a JPEG data URL so the upload stays small. */
async function toJpegDataUrl(file: File, maxSide = 1600): Promise<string> {
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      if (typeof (img as { decode?: () => Promise<void> }).decode === 'function') {
        try {
          await img.decode();
        } catch {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image decode error'));
          });
        }
      } else {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image decode error'));
        });
      }
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, c.width, c.height);
          return c.toDataURL('image/jpeg', 0.85);
        }
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (e) {
    console.warn('Canvas downscaling skipped, falling back to direct data URL', e);
  }

  // Fallback: read directly as Data URL
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/** Send the receipt photo to ai-chat (receipt_scan mode). Throws with a readable message on failure. */
export async function scanReceipt(file: File): Promise<ReceiptScanResult> {
  const image = await toJpegDataUrl(file);
  const apiKey = getStoredDeepSeekKey() || undefined;
  const backupApiKey = getStoredBackupKey() || undefined;
  const model = getStoredModelId();
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { mode: 'receipt_scan', image, model, apiKey, backupApiKey },
  });
  if (error) {
    let msg = 'Could not read the receipt.';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) msg = body.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  return data as ReceiptScanResult;
}
