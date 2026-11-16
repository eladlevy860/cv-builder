import { EditorLoader } from "@/features/editor/editor";

export default async function EditorPage({ params }: PageProps<"/editor/[id]">) {
  const { id } = await params;
  return <EditorLoader id={id} />;
}
