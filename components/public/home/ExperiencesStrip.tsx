import * as React from "react";
import Image from "next/image";
import { Waves, Flame, Trees, Compass, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExperienceItem {
  id: string;
  title: string;
  status: "ACTIVE" | "UPCOMING";
  imageUrl: string;
  icon: React.ElementType;
}

const EXPERIENCES: ExperienceItem[] = [
  {
    id: "exp-pool",
    title: "Designer Swimming Pool",
    status: "ACTIVE",
    imageUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/pool.webp",
    icon: Waves,
  },
  {
    id: "exp-campfire",
    title: "Campfire & BBQ Experience",
    status: "ACTIVE",
    imageUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/campfire.webp",
    icon: Flame,
  },
  {
    id: "exp-lawn",
    title: "Lush Lawn & Recreation",
    status: "ACTIVE",
    imageUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/lawn.webp",
    icon: Trees,
  },
  {
    id: "exp-kayaking",
    title: "Wetland Kayaking",
    status: "UPCOMING",
    imageUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/kayaking.webp",
    icon: Compass,
  },
  {
    id: "exp-floating-stage",
    title: "Scenic Floating Stage",
    status: "UPCOMING",
    imageUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/floating_stage.webp",
    icon: Sparkles,
  },
];

export interface ExperiencesStripProps {
  className?: string;
}

/**
 * ExperiencesStrip - Editorial Visual Journal of Resort Activities
 *
 * Enforces:
 * 1. Visual Storytelling: Atmospheric image crops with soft 700ms ease-out transitions.
 * 2. High-Contrast Status Beacons: Pulsing emerald beacon for active experiences; amber pill for upcoming.
 * 3. Tabular Schedule Notes: font-mono text-xs for operational timings.
 */
export function ExperiencesStrip({ className }: ExperiencesStripProps) {
  return (
    <section
      aria-label="Resort Experiences and Recreation"
      className={cn(
        "content-visibility-auto mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8",
        className,
      )}
    >
      {/* Header */}
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <span className="text-primary font-malayalam text-xs font-semibold tracking-wider select-none">
          ആരാണ് സന്തോഷം ആഗ്രഹിക്കാത്തത്?
        </span>
        <h2 className="text-foreground mt-2 font-serif text-3xl tracking-tight sm:text-4xl lg:text-5xl">
          Unforgettable Sanctuary Experiences
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
          From tranquil twilight swims and starlit BBQ grills to scenic open
          lawns, immerse yourself in nature’s calm.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {EXPERIENCES.map((exp) => {
          const Icon = exp.icon;
          const isActive = exp.status === "ACTIVE";

          return (
            <div
              key={exp.id}
              className="group border-border/80 bg-card hover-lift flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ease-[var(--ease-snappy)] hover:shadow-lg"
            >
              {/* Photo Aperture */}
              <div className="bg-surface-subtle relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={exp.imageUrl}
                  alt={exp.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Floating Status Pill */}
                <div className="absolute top-3 left-3">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/95 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-950 shadow-xs select-none dark:bg-emerald-950/90 dark:text-emerald-200">
                      <span>Active experience</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/95 px-2.5 py-1 font-mono text-[11px] font-semibold text-amber-950 shadow-xs select-none dark:bg-amber-950/90 dark:text-amber-200">
                      <span>Upcoming / Under construction</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col justify-between gap-4 p-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-primary/10 text-primary border-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg border">
                      <Icon className="size-4 shrink-0" />
                    </div>
                    <h3 className="text-foreground font-serif text-xl font-medium tracking-tight">
                      {exp.title}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ExperiencesStrip;
