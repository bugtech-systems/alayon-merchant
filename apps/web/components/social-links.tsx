// components/social-links.tsx
import { cn } from "@/lib/utils";
import {
  X,               // previously Twitter
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Facebook,
  Mail,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type SocialPlatform =
  | "x"              // changed from "twitter"
  | "github"
  | "linkedin"
  | "instagram"
  | "youtube"
  | "facebook"
  | "email"
  | "website";

interface SocialLink {
  platform: SocialPlatform;
  url: string;
  icon?: LucideIcon;
}

const platformIcons: Record<SocialPlatform, LucideIcon> = {
  x: X,                      // ✅ use X instead of Twitter
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  email: Mail,
  website: Globe,
};

interface SocialLinksProps {
  links: SocialLink[];
  className?: string;
  iconClassName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 p-1.5",
  md: "h-10 w-10 p-2",
  lg: "h-12 w-12 p-2.5",
};

const variantClasses = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

export function SocialLinks({
  links,
  className,
  iconClassName,
  variant = "ghost",
  size = "md",
}: SocialLinksProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {links.map(({ platform, url, icon: CustomIcon }) => {
        const Icon = CustomIcon || platformIcons[platform];
        if (!Icon) return null;
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              sizeClasses[size],
              variantClasses[variant],
              iconClassName
            )}
            aria-label={`${platform} (opens in new tab)`}
          >
            <Icon className={cn("h-full w-full", iconClassName)} />
          </a>
        );
      })}
    </div>
  );
}