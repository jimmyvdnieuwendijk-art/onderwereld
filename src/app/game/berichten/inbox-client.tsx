"use client";

import { useState } from "react";
import { markMessageRead, sendMessage } from "@/lib/actions/social";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameAction } from "@/hooks/use-player";
import { useRouter } from "next/navigation";

type Msg = {
  id: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  fromUser: { username: string };
  toUser: { username: string };
};

export function InboxClient({
  inbox,
  sent,
}: {
  inbox: Msg[];
  sent: Msg[];
}) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="font-heading text-3xl">Berichten</h1>
        <Card>
          <CardHeader>
            <CardTitle>Nieuw bericht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Gebruikersnaam" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder="Onderwerp" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Tekst" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button
              disabled={pending}
              onClick={() =>
                run(() => sendMessage(to, subject, body), (r) => {
                  if (r.ok) {
                    setBody("");
                    router.refresh();
                  }
                })
              }
            >
              Versturen
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inbox.length === 0 && <p className="text-sm text-muted-foreground">Geen post.</p>}
            {inbox.map((msg) => (
              <button
                key={msg.id}
                className="block w-full rounded-lg border border-border/60 p-3 text-left text-sm"
                onClick={() => run(() => markMessageRead(msg.id), () => router.refresh())}
              >
                <p className={msg.read ? "text-muted-foreground" : "font-medium text-primary"}>
                  {msg.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  Van {msg.fromUser.username} · {formatDateTime(msg.createdAt)}
                </p>
                <p className="mt-1">{msg.body}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Verzonden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {sent.length === 0 && <p className="text-muted-foreground">Nog niets verzonden.</p>}
          {sent.map((msg) => (
            <div key={msg.id} className="border-b border-border/40 pb-2">
              <p className="font-medium">{msg.subject}</p>
              <p className="text-xs text-muted-foreground">
                Aan {msg.toUser.username} · {formatDateTime(msg.createdAt)}
              </p>
              <p>{msg.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
