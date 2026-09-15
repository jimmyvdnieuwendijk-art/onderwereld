import type { Metadata } from "next";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  siteOrigin,
} from "@/lib/site";

export function rootMetadata(): Metadata {
  const origin = siteOrigin();
  return {
    metadataBase: new URL(origin),
    title: {
      default: SITE_TITLE,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "nl_NL",
      url: origin,
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: "/landing/hero.webp",
          width: 1920,
          height: 1080,
          alt: "Onderwereld — gratis browser MMORPG in de Nederlandse onderwereld",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: ["/landing/hero.webp"],
    },
    robots: {
      index: true,
      follow: true,
    },
    category: "games",
  };
}

export const LANDING_FAQ = [
  {
    question: "Wat is Onderwereld?",
    answer:
      "Onderwereld is een gratis browser MMORPG en online maffia game. Je speelt in de Nederlandse onderwereld: misdaden, families, handel, auto's en PvP — allemaal in je browser, zonder download.",
  },
  {
    question: "Is Onderwereld echt een MMORPG?",
    answer:
      "Ja. Het is een persistente multiplayer crime game: je personage, rang, cash en familie blijven bestaan. Andere spelers lopen dezelfde straten. Geen installatie, wel een levende wereld.",
  },
  {
    question: "Is het gratis om te spelen?",
    answer:
      "Ja. Maak een gebruikersnaam of log in, en je start als Scum in Amsterdam. Geen client, geen launcher — een crime game NL die in de browser draait.",
  },
  {
    question: "Moet ik iets downloaden?",
    answer:
      "Nee. Onderwereld is een browser game. Open de site, registreer, en je zit in de straat.",
  },
] as const;
