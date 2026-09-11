import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

const FEATURES = [
  { title: "MISDADEN", src: "/landing/misdaden.webp", alt: "Bronzen schedel met gekruiste dolken" },
  { title: "ECONOMIE", src: "/landing/economie.webp", alt: "Leren buidel met gouden munten en staven" },
  { title: "PVP", src: "/landing/pvp.webp", alt: "Gekruiste revolvers en boksbeugel" },
  { title: "FAMILIES", src: "/landing/families.webp", alt: "Gouden leeuwenwapen met kroon" },
] as const;

export default function LandingPage() {
  return (
    <div className={styles.page}>
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
            <Link href="/game" className={styles.play}>
              SPELEN
            </Link>
          </nav>
        </header>

        <main className={styles.hero}>
          <h1 className={styles.headline}>DE STRATEN VAN DE LAGE LANDEN ZIJN VAN NIEMAND.</h1>
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
            </article>
          ))}
        </section>

        <p className={styles.foot}>
          Onderwereld — tekststrategie. Demo: demo@onderwereld.nl / demo1234
        </p>
      </div>
    </div>
  );
}
