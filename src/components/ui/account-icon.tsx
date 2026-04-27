import { Wallet } from "lucide-react";
import { getIconComponent } from "@/lib/icons";
import { getInstitution, institutionSlugFromIcon } from "@/lib/institutions";
import { cn } from "@/lib/utils";

type Props = {
  icon: string | null | undefined;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { wrap: "size-7", icon: "size-4", img: 18 },
  md: { wrap: "size-9", icon: "size-5", img: 22 },
  lg: { wrap: "size-12", icon: "size-6", img: 28 },
} as const;

export function AccountIcon({ icon, color, size = "md", className }: Props) {
  const dims = SIZES[size];
  const tone = color ?? "#6366f1";
  const slug = institutionSlugFromIcon(icon);

  if (slug) {
    const inst = getInstitution(slug);
    if (inst) {
      return (
        <span
          className={cn(
            "bg-background inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
            dims.wrap,
            className,
          )}
          aria-label={inst.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={inst.logoUrl}
            alt=""
            width={dims.img}
            height={dims.img}
            className="object-contain"
            loading="lazy"
          />
        </span>
      );
    }
  }

  const Lucide = getIconComponent(icon) ?? Wallet;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border",
        dims.wrap,
        className,
      )}
      style={{ borderColor: `${tone}40`, color: tone, backgroundColor: `${tone}1a` }}
      aria-hidden
    >
      <Lucide className={dims.icon} />
    </span>
  );
}
