import { useState } from "react";
import { HeartHandshake } from "lucide-react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({ src, alt, className = "", fallbackTitle }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 text-slate-600 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <HeartHandshake className="w-10 h-10 text-blue-700 mb-2" />
        <span className="text-sm font-medium text-slate-700 text-center">{fallbackTitle || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
