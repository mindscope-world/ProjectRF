import React, { useState } from 'react';
import { uploadAdminImage } from './adminClient';

/** Shared file-picker + upload button used by any admin form that attaches
 * an image (product photos, site logo, hero background, ...). Uploads
 * immediately on selection and hands the resulting URL back via onUploaded
 * — the caller decides what to do with it (set local state, PATCH a
 * product, etc.), keeping this component free of any domain knowledge. */
export const ImageUploadButton: React.FC<{ label: string; onUploaded: (url: string) => void }> = ({
  label,
  onUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `image-upload-${label.replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2)}`;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadAdminImage(file);
      onUploaded(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="inline-block px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
      >
        {uploading ? 'Uploading…' : label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
};
