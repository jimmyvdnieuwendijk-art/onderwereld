"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send, Smile } from "lucide-react";
import { postChat } from "@/lib/actions/chat";
import { AVATAR_ACCEPT, CHAT_BODY_MAX, CHAT_CHANNEL_FAMILY, CHAT_CHANNEL_WORLD } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { useGameAction, useLivePlayer } from "@/hooks/use-player";
import type { ChatChannel, ChatLine } from "@/lib/game/chat";
import type { PlayerSnapshot } from "@/types/game";

const EMOJI = [
  "😀",
  "😎",
  "😈",
  "💀",
  "🔫",
  "💰",
  "🚬",
  "🥃",
  "🔥",
  "❤️",
  "😂",
  "👀",
  "🤝",
  "🚔",
  "🌃",
  "🐀",
  "👑",
  "💣",
  "🚗",
  "🤫",
] as const;

async function fetchChat(channel: ChatChannel): Promise<ChatLine[]> {
  const res = await fetch(`/api/chat?channel=${channel}`, { cache: "no-store" });
  if (!res.ok) throw new Error("chat");
  const data = (await res.json()) as { messages?: ChatLine[] };
  return data.messages ?? [];
}

function ChatList({
  rows,
  loading,
  error,
  empty,
  bottomRef,
}: {
  rows: ChatLine[];
  loading: boolean;
  error: boolean;
  empty: string;
  bottomRef: RefObject<HTMLDivElement | null>;
}) {
  if (loading && rows.length === 0) {
    return <p className="px-3 py-8 text-sm text-muted-foreground">Kanaal laden…</p>;
  }
  if (error) {
    return <p className="px-3 py-8 text-sm text-destructive">Chat is even stil. Probeer opnieuw.</p>;
  }
  if (rows.length === 0) {
    return <p className="px-3 py-8 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-3 px-3 py-3">
      {rows.map((row) => (
        <li key={row.id} className="flex gap-2.5">
          <PlayerAvatar url={row.avatarUrl} username={row.displayName} className="mt-0.5 size-8 shrink-0 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
              <Link href={`/game/spelers/${row.username}`} className="font-heading text-sm text-primary hover:underline">
                {row.displayName}
              </Link>
              {row.displayName !== row.username ? (
                <span className="text-muted-foreground">@{row.username}</span>
              ) : null}
              {row.isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-500/90">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  online
                </span>
              ) : null}
              <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
            </p>
            {row.body ? <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-snug">{row.body}</p> : null}
            {row.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- chat screenshots from authenticated API
              <img
                src={row.imageUrl}
                alt=""
                className="mt-2 max-h-56 max-w-full rounded-md border border-primary/20 object-contain bg-black/40"
              />
            ) : null}
          </div>
        </li>
      ))}
      <div ref={bottomRef} />
    </ul>
  );
}

export function ChatClient({
  initialPlayer,
  hasFamily,
  familyName,
  initialWorld,
  initialFamily,
}: {
  initialPlayer?: PlayerSnapshot;
  hasFamily: boolean;
  familyName: string | null;
  initialWorld: ChatLine[];
  initialFamily: ChatLine[];
}) {
  const player = useLivePlayer(initialPlayer);
  const inFamily = Boolean(player?.family?.id ?? hasFamily);
  const crewName = player?.family?.name ?? familyName;
  const queryClient = useQueryClient();
  const { run, pending } = useGameAction();
  const [tab, setTab] = useState<ChatChannel>(CHAT_CHANNEL_WORLD);
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const world = useQuery({
    queryKey: ["chat", CHAT_CHANNEL_WORLD],
    queryFn: () => fetchChat(CHAT_CHANNEL_WORLD),
    initialData: initialWorld,
    staleTime: 4_000,
    refetchInterval: 8_000,
  });
  const family = useQuery({
    queryKey: ["chat", CHAT_CHANNEL_FAMILY],
    queryFn: () => fetchChat(CHAT_CHANNEL_FAMILY),
    initialData: initialFamily,
    enabled: inFamily,
    staleTime: 4_000,
    refetchInterval: inFamily ? 8_000 : false,
  });

  const rows = tab === CHAT_CHANNEL_FAMILY ? (family.data ?? []) : (world.data ?? []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [rows.length, tab]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pickFile(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  function insertEmoji(mark: string) {
    const node = areaRef.current;
    if (!node) {
      setText((prev) => (prev + mark).slice(0, CHAT_BODY_MAX));
      return;
    }
    const start = node.selectionStart ?? text.length;
    const end = node.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${mark}${text.slice(end)}`.slice(0, CHAT_BODY_MAX);
    setText(next);
    requestAnimationFrame(() => {
      node.focus();
      const pos = Math.min(start + mark.length, CHAT_BODY_MAX);
      node.setSelectionRange(pos, pos);
    });
  }

  function submit() {
    if (pending) return;
    if (tab === CHAT_CHANNEL_FAMILY && !inFamily) return;
    const body = text.trim();
    if (!file && body.length < 1) return;
    run(
      () => postChat(tab, body, file),
      (result) => {
        if (!result.ok) return;
        setText("");
        pickFile(null);
        if (fileRef.current) fileRef.current.value = "";
        queryClient.invalidateQueries({ queryKey: ["chat", tab] });
      },
    );
  }

  const canSend = !pending && (Boolean(file) || text.trim().length > 0) && (tab !== CHAT_CHANNEL_FAMILY || inFamily);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4a359]">Sociaal</p>
        <h1 className="font-heading text-3xl text-[#d4a359]">Chat</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Wereldchat is voor iedereen op straat. Familiechat blijft binnen de crew.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ChatChannel)} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="border border-primary/20 bg-[#16110c]">
          <TabsTrigger value={CHAT_CHANNEL_WORLD}>Wereldchat</TabsTrigger>
          <TabsTrigger value={CHAT_CHANNEL_FAMILY}>Familiechat</TabsTrigger>
        </TabsList>

        <TabsContent value={CHAT_CHANNEL_WORLD} className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="max-h-[min(62vh,32rem)] min-h-64 overflow-y-auto rounded-xl border border-primary/20 bg-[#120e0a]/80">
            <ChatList
              rows={world.data ?? []}
              loading={world.isLoading}
              error={world.isError}
              empty="Stilte in de wereld. Zeg iets."
              bottomRef={bottomRef}
            />
          </div>
        </TabsContent>

        <TabsContent value={CHAT_CHANNEL_FAMILY} className="mt-3 flex min-h-0 flex-1 flex-col">
          {!inFamily ? (
            <div className="rounded-xl border border-dashed border-primary/25 bg-[#120e0a]/70 px-4 py-10 text-center">
              <p className="font-heading text-lg text-[#d4a359]">Geen familie</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Familiechat is alleen voor leden. Start of join een crew, dan praat je hier onder elkaar.
              </p>
              <p className="mt-4">
                <Link href="/game/familie" className={buttonVariants({ variant: "outline" })}>
                  Naar Familie
                </Link>
              </p>
            </div>
          ) : (
            <div className="max-h-[min(62vh,32rem)] min-h-64 overflow-y-auto rounded-xl border border-primary/20 bg-[#120e0a]/80">
              <p className="border-b border-primary/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#d4a359]/80">
                {crewName ?? "Familie"}
              </p>
              <ChatList
                rows={family.data ?? []}
                loading={family.isLoading}
                error={family.isError}
                empty="Nog geen family-praat. Eerste bericht is aan jou."
                bottomRef={bottomRef}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <form
        className="rounded-xl border border-primary/20 bg-[#16110c] p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {emojiOpen ? (
          <div className="mb-2 flex flex-wrap gap-1 rounded-md border border-primary/15 bg-black/30 p-2">
            {EMOJI.map((mark) => (
              <button
                key={mark}
                type="button"
                className="size-8 rounded-md text-lg hover:bg-primary/15"
                onClick={() => insertEmoji(mark)}
                aria-label={`Emoji ${mark}`}
              >
                {mark}
              </button>
            ))}
          </div>
        ) : null}
        {preview ? (
          <div className="mb-2 flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-16 w-16 rounded-md object-cover border border-primary/20" />
            <Button type="button" size="sm" variant="outline" onClick={() => pickFile(null)}>
              Screenshot weg
            </Button>
          </div>
        ) : null}
        <Textarea
          ref={areaRef}
          value={text}
          maxLength={CHAT_BODY_MAX}
          placeholder={
            tab === CHAT_CHANNEL_FAMILY && !inFamily
              ? "Alleen familyleden kunnen hier typen…"
              : "Typ, plak een smiley of stuur een screenshot…"
          }
          disabled={tab === CHAT_CHANNEL_FAMILY && !inFamily}
          rows={2}
          className="resize-none bg-black/20"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEmojiOpen((open) => !open)}
            disabled={tab === CHAT_CHANNEL_FAMILY && !inFamily}
          >
            <Smile className="size-4" />
            Smileys
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={tab === CHAT_CHANNEL_FAMILY && !inFamily}
          >
            <ImagePlus className="size-4" />
            Screenshot
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          />
          <p className="ml-auto text-[11px] text-muted-foreground">
            {text.length}/{CHAT_BODY_MAX}
          </p>
          <Button type="submit" disabled={!canSend}>
            <Send className="size-4" />
            {pending ? "Sturen…" : "Sturen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
