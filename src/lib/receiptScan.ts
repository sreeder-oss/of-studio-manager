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
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
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
