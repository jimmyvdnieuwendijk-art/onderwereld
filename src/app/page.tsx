import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import styles from "./landing.module.css";
import { LANDING_FAQ } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, siteOrigin } from "@/lib/site";

const FEATURES = [
  {
    title: "MISDADEN",
    src: "/landing/misdaden.webp",
    alt: "Bronzen schedel met gekruiste dolken",
    blurb: "Klussen, exp en rang — van Scum tot Don.",
  },
  {
    title: "ECONOMIE",
    src: "/landing/economie.webp",
    alt: "Leren buidel met gouden munten en staven",
    blurb: "Bank, smokkel, handelsmarkt en garage.",
  },
  {
    title: "PVP",
    src: "/landing/pvp.webp",
    alt: "Gekruiste revolvers en boksbeugel",
    blurb: "Kogels, hits en rivalen in dezelfde straat.",
  },
  {
    title: "FAMILIES",
    src: "/landing/families.webp",
    alt: "Gouden leeuwenwapen met kroon",
    blurb: "Crew, HQ en heists met je eigen maffia.",
  },
] as const;

export const metadata: Metadata = {
  title: {
    absolute: "Onderwereld | Gratis browser MMORPG — Nederlandse maffia game",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoGame",
      name: SITE_NAME,
      url: siteOrigin(),
      inLanguage: "nl-NL",
      genre: ["MMORPG", "Crime", "Browser game"],
      playMode: "MultiPlayer",
      applicationCategory: "GameApplication",
      operatingSystem: "Web browser",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: LANDING_FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.backdrop}>
        <Image
          src="/landing/hero.webp"
          alt=""
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-[center_30%] md:object-center"
        />
      </div>
      <div className={styles.veil} />

      <div className={styles.shell}>
        <header className={styles.nav}>
          <p className={styles.logo}>ONDERWERELD</p>
          <nav className={styles.navLinks} aria-label="Hoofdmenu">
            <Link href="/inloggen" className={styles.ghost}>
              Inloggen
            </Link>
            <Link href="/registreren" className={styles.play}>
              Registreren
            </Link>
          </nav>
        </header>

        <main className={styles.hero}>
          <p className={styles.kicker}>Gratis browser MMORPG · crime game NL</p>
          <h1 className={styles.headline}>DE STRATEN VAN DE LAGE LANDEN ZIJN VAN NIEMAND.</h1>
          <p className={styles.subcopy}>
            Onderwereld is een gratis online maffia game in je browser. Geen download: bouw een
            crimineel leven, een familie en een naam in een persistente Nederlandse MMORPG.
          </p>
          <div className={styles.cta}>
            <Link href="/registreren" className={styles.gold}>
              START HET CRIMINEEL LEVEN
            </Link>
            <Link href="/inloggen" className={styles.bronze}>
              Ik heb al een naam
            </Link>
          </div>
        </main>

        <section className={styles.features} aria-label="Spelpijlers">
          {FEATURES.map((item) => (
            <article key={item.title} className={styles.plinth}>
              <Image
                src={item.src}
                alt={item.alt}
                width={640}
                height={640}
                sizes="(max-width: 768px) 42vw, 22vw"
                className={styles.artifact}
              />
              <h2 className={styles.label}>{item.title}</h2>
              <p className={styles.featureBlurb}>{item.blurb}</p>
            </article>
          ))}
        </section>

        <section className={styles.about} aria-labelledby="wat-is-onderwereld">
          <h2 id="wat-is-onderwereld" className={styles.sectionTitle}>
            Wat is Onderwereld?
          </h2>
          <p>
            Onderwereld is een <strong>gratis browser MMORPG</strong> in de Nederlandse onderwereld.
            Je speelt in de browser: misdaden voor cash en ervaring, auto&apos;s stelen, smokkelen
            tussen steden, een familie opzetten en andere spelers raken in PvP. Geen launcher, geen
            client — een crime game NL die blijft staan als je het tabblad sluit.
          </p>
        </section>

        <section className={styles.faq} aria-labelledby="faq-heading">
          <h2 id="faq-heading" className={styles.sectionTitle}>
            Veelgestelde vragen
          </h2>
          <div className={styles.faqList}>
            {LANDING_FAQ.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className={styles.foot}>
          Onderwereld — gratis browser MMORPG · Nederlandse maffia game · geen download
        </p>
      </div>
    </div>
  );
}
