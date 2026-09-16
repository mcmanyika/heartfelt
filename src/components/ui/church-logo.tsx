import { cn } from "@/lib/utils/cn";

type ChurchLogoProps = {
  src: string | null | undefined;
  name: string;
  className?: string;
  imageClassName?: string;
};

export function ChurchLogo({ src, name, className, imageClassName }: ChurchLogoProps) {
  if (!src) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center overflow-hidden", className)}>
      {/* Storage URLs are tenant-specific and not in next/image remotePatterns. */}
      <img src={src} alt={`${name} logo`} className={cn("object-contain", imageClassName)} />
    </div>
  );
}
