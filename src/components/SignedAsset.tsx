import React, { useEffect, useState } from 'react';
import { getReceiptImageUrl } from '@/hooks/useReceipts';
import { getDocumentFileUrl } from '@/hooks/useDocuments';
import { getPhotoUrl } from '@/hooks/usePhotos';

type Bucket = 'receipts' | 'of-documents' | 'of-photos';

const resolve = (bucket: Bucket, p: string) =>
  bucket === 'receipts' ? getReceiptImageUrl(p) : bucket === 'of-photos' ? getPhotoUrl(p) : getDocumentFileUrl(p);

export const SignedImage: React.FC<{
  bucket: Bucket;
  path: string;
  alt?: string;
  className?: string;
}> = ({ bucket, path, alt, className }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    resolve(bucket, path).then((u) => on && setUrl(u)).catch(() => on && setUrl(null));
    return () => { on = false; };
  }, [bucket, path]);
  if (!url) return <div className={className} />;
  return <img src={url} alt={alt || ''} className={className} />;
};

export const SignedLink: React.FC<{
  bucket: Bucket;
  path: string;
  children: React.ReactNode;
  className?: string;
}> = ({ bucket, path, children, className }) => {
  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const u = await resolve(bucket, path);
      window.open(u, '_blank', 'noopener,noreferrer');
    } catch {
      /* noop */
    }
  };
  return (
    <a href="#" onClick={onClick} className={className}>
      {children}
    </a>
  );
};
