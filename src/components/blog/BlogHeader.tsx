import Header from "@/components/Header";

interface BlogHeaderProps {
  title?: string;
  backTo?: string;
  backLabel?: string;
}

export default function BlogHeader({ title, backTo, backLabel }: BlogHeaderProps) {
  void title; void backTo; void backLabel;
  return <Header />;
}
