"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BoldIcon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, UnlinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeRichText, type RichText } from "@/core/model/richtext";
import { cn } from "@/lib/utils";
import { useDocLang } from "./fields";

/**
 * Minimal rich-text editor: bold, italic, links, bullet and numbered lists.
 * Everything else (headings, colors, pasted styles) is stripped by the
 * schema. Undo/redo is handled by the editor store, not TipTap, so Ctrl+Z
 * behaves the same everywhere in the form.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  hint,
  testId,
  minHeight = "5rem",
}: {
  label: string;
  value: RichText;
  onChange: (v: RichText) => void;
  hint?: string;
  testId?: string;
  minHeight?: string;
}) {
  const t = useTranslations("rte");
  const lang = useDocLang();
  const id = useId();
  const lastEmitted = useRef<RichText | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        undoRedo: false,
        dropcursor: false,
        gapcursor: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null } },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        dir: "auto",
        lang,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": `${id}-label`,
        ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
        ...(testId ? { "data-testid": testId } : {}),
        class: "rte-content",
        spellcheck: "true",
      },
    },
    onUpdate({ editor }) {
      const next = normalizeRichText(editor.getJSON());
      lastEmitted.current = next;
      onChangeRef.current(next);
    },
  });

  // Sync external changes (undo/redo, restoring a version, inserted examples).
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    const current = normalizeRichText(editor.getJSON());
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    lastEmitted.current = value;
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            link: e.isActive("link"),
            href: (e.getAttributes("link").href as string | undefined) ?? "",
          }
        : null,
  });

  return (
    <div className="grid gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium" onClick={() => editor?.commands.focus()}>
        {label}
      </span>
      <div className="rounded-md border border-input bg-card shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <div role="toolbar" aria-label={t("toolbar")} aria-controls={id} className="flex items-center gap-0.5 border-b px-1 py-1">
          <ToolButton label={t("bold")} active={state?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <BoldIcon />
          </ToolButton>
          <ToolButton label={t("italic")} active={state?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <ItalicIcon />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <ToolButton label={t("bulletList")} active={state?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <ListIcon className="rtl:-scale-x-100" />
          </ToolButton>
          <ToolButton label={t("orderedList")} active={state?.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrderedIcon className="rtl:-scale-x-100" />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <LinkButton
            active={!!state?.link}
            href={state?.href ?? ""}
            onApply={(href) => {
              if (!editor) return;
              const chain = editor.chain().focus().extendMarkRange("link");
              if (href) chain.setLink({ href }).run();
              else chain.unsetLink().run();
            }}
          />
          {state?.link && (
            <ToolButton label={t("removeLink")} onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}>
              <UnlinkIcon />
            </ToolButton>
          )}
        </div>
        <EditorContent editor={editor} className="rte px-3 py-2 text-sm" style={{ minHeight }} />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      className={cn("size-7", active && "bg-accent text-accent-foreground")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function LinkButton({ active, href, onApply }: { active: boolean; href: string; onApply: (href: string) => void }) {
  const t = useTranslations("rte");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(href);
  const id = useId();
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(href);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("link")}
          title={t("link")}
          aria-pressed={active}
          className={cn("size-7", active && "bg-accent text-accent-foreground")}
          onMouseDown={(e) => e.preventDefault()}
        >
          <LinkIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onApply(value.trim());
            setOpen(false);
          }}
        >
          <label htmlFor={id} className="text-sm font-medium">
            {t("linkUrl")}
          </label>
          <Input id={id} dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://" autoFocus />
          <Button type="submit" size="sm" className="justify-self-end">
            {t("applyLink")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
