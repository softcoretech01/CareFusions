import { useState } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { fileUrl } from '../../utils/fileUrl';

/**
 * Thumbnail for an uploaded document tile.
 *
 * The tiles used to render every stored path straight into an <img> and hide
 * the element on error, so a PDF and a file that is missing from the server
 * both looked identical to a successful upload: the words "File Uploaded" and
 * an empty box. This distinguishes the three cases.
 */
export const DocPreview = ({ path }: { path?: unknown }) => {
  const [broken, setBroken] = useState(false);
  const src = fileUrl(path);

  if (!src) return null;

  // An <img> can never render a PDF, so don't try and then report it missing.
  if (/\.pdf(\?|$)/i.test(src)) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
        <FileText className="w-4 h-4 text-red-500" /> PDF document
      </span>
    );
  }

  if (broken) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <AlertTriangle className="w-4 h-4" /> File missing on server
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="preview"
      className="h-16 object-contain"
      onError={() => setBroken(true)}
    />
  );
};
