import { notFound } from "next/navigation";
import EmbedView from "./EmbedView";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function EmbedPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length > 128) notFound();
  return <EmbedView token={token} />;
}
