import { EditorPlaceholder } from "@/features/editor/editor-placeholder";

export default async function EditorPage({ params }: PageProps<"/editor/[id]">) {
  const { id } = await params;
  return <EditorPlaceholder id={id} />;
}
