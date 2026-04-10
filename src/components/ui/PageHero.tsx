import Header from "@/components/Header";

interface PageHeroProps {
  label?: string;
  title: string;
  subtitle?: string;
  image?: string;
  children?: React.ReactNode;
  minHeight?: string;
}

export default function PageHero({
  label,
  title,
  subtitle,
  image,
  children,
  minHeight = "min-h-[340px] md:min-h-[400px]",
}: PageHeroProps) {
  return (
    <div
      data-hero
      className={`relative flex items-end ${minHeight} bg-foreground overflow-hidden`}
    >
      {image && (
        <>
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" />
        </>
      )}

      <Header transparent />

      <div className="relative z-10 w-full pb-12 pt-28 md:pb-16 md:pt-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {label && (
            <p className="text-white/50 uppercase tracking-widest text-xs font-medium mb-3">
              {label}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-white/75 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </div>
  );
}
