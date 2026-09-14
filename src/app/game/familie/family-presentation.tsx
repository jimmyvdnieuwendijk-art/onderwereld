"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  removeFamilyBanner,
  removeFamilyPageImage,
  moveFamilyPageImage,
  saveFamilyPage,
  updateFamilyPageImageCaption,
  uploadFamilyBanner,
  uploadFamilyPageImage,
} from "@/lib/actions/family";
import {
  AVATAR_ACCEPT,
  FAMILY_PAGE_IMAGES_MAX,
  FAMILY_PAGE_TEXT_MAX,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGameAction } from "@/hooks/use-player";
import type { FamilyHq } from "./hq-types";

export function FamilyPresentation({ hq }: { hq: FamilyHq }) {
  const hasBody = hq.pageText.trim().length > 0 || hq.pageImages.length > 0;
  if (!hasBody) return null;

  return (
    <section className="space-y-3 rounded-lg border border-[#d4a359]/20 bg-[#1a1510]/80 p-3">
      <p className="text-[11px] uppercase tracking-wider text-[#d4a359]">Familiepresentatie</p>
      {hq.pageText.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{hq.pageText}</p>
      ) : null}
      {hq.pageImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {hq.pageImages.map((image) => (
            <figure key={image.id} className="overflow-hidden rounded-lg border border-[#d4a359]/20">
              {/* eslint-disable-next-line @next/next/no-img-element -- family page blobs */}
              <img src={image.url} alt={image.caption || "Familiefoto"} className="h-44 w-full object-cover" />
              {image.caption ? (
                <figcaption className="px-2 py-1.5 text-xs text-muted-foreground">{image.caption}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function FamilyLayoutEditor({ hq }: { hq: FamilyHq }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const bannerRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [pageText, setPageText] = useState(hq.pageText);
  const [caption, setCaption] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(hq.pageImages.map((image) => [image.id, image.caption])),
  );
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-[#d4a359]">Familiefoto</p>
        <p className="text-xs text-muted-foreground">Banner op Overzicht. JPG, PNG of WebP, max. 1 MB.</p>
        {hq.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- family banner blob
          <img src={hq.bannerUrl} alt="Familiefoto" className="h-32 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#d4a359]/30 text-xs text-muted-foreground">
            Nog geen familiefoto
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={bannerRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) run(() => uploadFamilyBanner(file), refresh);
            }}
          />
          <Button size="sm" disabled={pending} onClick={() => bannerRef.current?.click()}>
            Foto uploaden
          </Button>
          {hq.bannerUrl ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => removeFamilyBanner(), refresh)}>
              Verwijderen
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-[#d4a359]">Paginatekst</p>
        <Textarea
          value={pageText}
          maxLength={FAMILY_PAGE_TEXT_MAX}
          rows={8}
          placeholder="Geschiedenis, regels, respect — bouw een volledige familiepresentatie."
          onChange={(e) => setPageText(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs tabular-nums text-muted-foreground">
            {pageText.length}/{FAMILY_PAGE_TEXT_MAX}
          </p>
          <Button size="sm" disabled={pending} onClick={() => run(() => saveFamilyPage(pageText), refresh)}>
            Tekst opslaan
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-[#d4a359]">
          Afbeeldingen ({hq.pageImages.length}/{FAMILY_PAGE_IMAGES_MAX})
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={caption}
            maxLength={120}
            placeholder="Bijschrift voor nieuwe foto"
            onChange={(e) => setCaption(e.target.value)}
          />
          <input
            ref={imageRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                run(() => uploadFamilyPageImage(file, caption), (r) => {
                  if (r.ok) setCaption("");
                  refresh(r);
                });
              }
            }}
          />
          <Button
            size="sm"
            disabled={pending || hq.pageImages.length >= FAMILY_PAGE_IMAGES_MAX}
            onClick={() => imageRef.current?.click()}
          >
            Afbeelding toevoegen
          </Button>
        </div>
        <div className="space-y-2">
          {hq.pageImages.map((image, index) => (
            <div key={image.id} className="flex gap-2 rounded-lg border border-border/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- family page blobs */}
              <img src={image.url} alt="" className="size-16 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  value={captions[image.id] ?? image.caption}
                  maxLength={120}
                  onChange={(e) => setCaptions((prev) => ({ ...prev, [image.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() => updateFamilyPageImageCaption(image.id, captions[image.id] ?? image.caption), refresh)
                    }
                  >
                    Bijschrift
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || index === 0}
                    onClick={() => run(() => moveFamilyPageImage(image.id, "up"), refresh)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending || index === hq.pageImages.length - 1}
                    onClick={() => run(() => moveFamilyPageImage(image.id, "down"), refresh)}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#8b2626] text-white hover:bg-[#8b2626]/90"
                    disabled={pending}
                    onClick={() => run(() => removeFamilyPageImage(image.id), refresh)}
                  >
                    Weg
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
