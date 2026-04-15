import { PrivacySections1to4 } from "./PrivacySections1to4";
import { PrivacySections5to7 } from "./PrivacySections5to7";
import { PrivacySections8to15 } from "./PrivacySections8to15";
import { PrivacyAppendicesSection } from "./PrivacyAppendicesSection";

interface Props {
  onOpenAppendix: (id: number) => void;
}

export default function PrivacyContent({ onOpenAppendix }: Props) {
  return (
    <div className="space-y-12 text-foreground/90 leading-relaxed">
      <PrivacySections1to4 />
      <PrivacySections5to7 />
      <PrivacySections8to15 />
      <PrivacyAppendicesSection onOpenAppendix={onOpenAppendix} />
    </div>
  );
}
