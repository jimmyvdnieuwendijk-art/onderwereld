"use client";

import { useState, type ReactNode } from "react";
import {
  deleteMessage,
  markAllMessagesRead,
  markMessageRead,
  sendMessage,
} from "@/lib/actions/social";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useGameAction } from "@/hooks/use-player";
import { useRouter } from "next/navigation";
import { Mail, MailOpen, Send, Trash2 } from "lucide-react";

type Person = { username: string; displayName: string | null };
type Msg = {
  id: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  fromUser: Person;
  toUser: Person;
};

function nameOf(user: Person) {
  return user.displayName?.trim() || user.username;
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center">
      <p className="font-heading text-lg">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function InboxClient({
  inbox,
  sent,
}: {
  inbox: Msg[];
  sent: Msg[];
}) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [tab, setTab] = useState("inbox");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const unread = inbox.filter((m) => !m.read).length;

  function refresh() {
    router.refresh();
  }

  function replyTo(msg: Msg) {
    setTo(msg.fromUser.username);
    setSubject(msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`);
    setTab("compose");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl">Berichten</h1>
        </div>
        {unread > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => markAllMessagesRead(), (r) => r.ok && refresh())}
          >
            Alles gelezen
          </Button>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            <Mail className="size-3.5" />
            Inbox
            {unread > 0 ? (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                {unread}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="outbox" className="gap-1.5">
            <Send className="size-3.5" />
            Verzonden
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5">
            Opstellen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          {inbox.length === 0 ? (
            <Empty title="Geen post" hint="Je inbox is leeg." />
          ) : (
            <div className="space-y-2">
              {inbox.map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  peerLabel={`Van ${nameOf(msg.fromUser)}`}
                  open={openId === msg.id}
                  pending={pending}
                  onOpen={() => {
                    setOpenId((id) => (id === msg.id ? null : msg.id));
                    if (!msg.read) run(() => markMessageRead(msg.id), () => refresh());
                  }}
                  onDelete={() => run(() => deleteMessage(msg.id), (r) => r.ok && refresh())}
                  extra={
                    <Button type="button" variant="ghost" size="sm" onClick={() => replyTo(msg)}>
                      Beantwoorden
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outbox" className="mt-4">
          {sent.length === 0 ? (
            <Empty title="Niets verzonden" hint="Nog geen uitgaande post." />
          ) : (
            <div className="space-y-2">
              {sent.map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  peerLabel={`Aan ${nameOf(msg.toUser)}`}
                  open={openId === msg.id}
                  pending={pending}
                  onOpen={() => setOpenId((id) => (id === msg.id ? null : msg.id))}
                  onDelete={() => run(() => deleteMessage(msg.id), (r) => r.ok && refresh())}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nieuw bericht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Gebruikersnaam" value={to} onChange={(e) => setTo(e.target.value)} />
              <Input placeholder="Onderwerp" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Textarea placeholder="Tekst" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
              <Button
                disabled={pending}
                onClick={() =>
                  run(() => sendMessage(to, subject, body), (r) => {
                    if (!r.ok) return;
                    setBody("");
                    setSubject("");
                    refresh();
                    setTab("outbox");
                  })
                }
              >
                Versturen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MessageRow({
  msg,
  peerLabel,
  open,
  pending,
  onOpen,
  onDelete,
  extra,
}: {
  msg: Msg;
  peerLabel: string;
  open: boolean;
  pending: boolean;
  onOpen: () => void;
  onDelete: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40">
      <div className="flex items-start gap-2 p-3">
        <button type="button" className="min-w-0 flex-1 text-left text-sm" onClick={onOpen}>
          <p className={msg.read ? "text-muted-foreground" : "font-medium text-primary"}>
            {msg.read ? <MailOpen className="mr-1 inline size-3.5" /> : <Mail className="mr-1 inline size-3.5" />}
            {msg.subject}
          </p>
          <p className="text-xs text-muted-foreground">
            {peerLabel} · {formatDateTime(msg.createdAt)}
          </p>
        </button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={pending} onClick={onDelete} aria-label="Verwijderen">
          <Trash2 className="size-4" />
        </Button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-border/40 px-3 py-2 text-sm">
          <p className="whitespace-pre-wrap">{msg.body}</p>
          {extra}
        </div>
      ) : null}
    </div>
  );
}