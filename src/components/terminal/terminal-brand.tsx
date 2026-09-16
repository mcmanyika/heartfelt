import { ChurchLogo } from "@/components/ui/church-logo";
import { cn } from "@/lib/utils/cn";

type TerminalBrandProps = {
  src: string | null | undefined;
  name: string;
  className?: string;
  imageClassName?: string;
};

export function TerminalBrand({ src, name, className, imageClassName }: TerminalBrandProps) {
  if (src) {
    return (
      <ChurchLogo
        src={src}
        name={name}
        className={cn("h-14 w-fit rounded-xl bg-white p-1.5", className)}
        imageClassName={cn("max-h-11 max-w-[180px]", imageClassName)}
      />
    );
  }

  return (
    <p className="kiosk-gold text-[11px] font-semibold tracking-[0.18em] uppercase">{name}</p>
  );
}
