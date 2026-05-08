import Icon from "@/components/ui/icon";

const IMG_EXT = ["jpg", "jpeg", "png", "webp", "gif", "heic"];

function isImage(url: string) {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  return IMG_EXT.includes(ext);
}

function shortName(name?: string | null, url?: string | null) {
  if (name) return name;
  if (!url) return "Файл";
  return url.split("/").pop() || "Файл";
}

export default function AttachmentBubble({
  url,
  name,
  onLight,
}: {
  url: string;
  name?: string | null;
  onLight?: boolean;
}) {
  if (!url) return null;
  if (isImage(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block mt-1 rounded-lg overflow-hidden max-w-[220px]"
      >
        <img
          src={url}
          alt={shortName(name, url)}
          className="w-full h-auto object-cover max-h-48"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`mt-1 inline-flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:underline ${
        onLight ? "bg-white/15" : "bg-background/60"
      }`}
    >
      <Icon name="Paperclip" size={13} />
      <span className="truncate max-w-[180px]">{shortName(name, url)}</span>
    </a>
  );
}
