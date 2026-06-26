"use client";

import { useState, useMemo } from "react";
import { Volleyball, Layers, Shield, Zap, Monitor, Download } from "./Icons";
import LoginPopover from "./LoginPopover";

type LoginMode = "login" | "signup";

function getReturningUser(): boolean {
  try {
    return localStorage.getItem("remembrall-has-signed-in") === "1";
  } catch {
    return false;
  }
}

const GOLD_STOPS = ["#D4AF37", "#B8860B", "#996515"];

const FEATURES = [
  {
    icon: Zap,
    title: "Instant capture",
    description: "Open. Type or paste. Done. No friction between thought and record — your ideas are preserved the moment they arrive.",
    texture: "brick",
  },
  {
    icon: Shield,
    title: "End-to-end encrypted",
    description: "Your notes are yours alone. Client-side encryption means no one else can read them — not even us.",
    texture: "dots",
  },
  {
    icon: Layers,
    title: "Organised sections",
    description: "Group notes into pages and sections. Pin what matters. Drag to reorder. Colour to categorise.",
    texture: "waves",
  },
  {
    icon: Monitor,
    title: "Desktop, web & extension",
    description: "A native tray app for your desktop, a web app for everywhere else, and a Chrome extension for quick clipping.",
    texture: "crosshatch",
  },
];

const TEXTURES: Record<string, string> = {
  brick: `url("data:image/svg+xml,%3Csvg width='42' height='44' viewBox='0 0 42 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h42v44H0V0zm1 1h40v20H1V1zM0 23h20v20H0V23zm22 0h20v20H22V23z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  dots: `url("data:image/svg+xml,%3Csvg width='12' height='16' viewBox='0 0 12 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 .99C4 .445 4.444 0 5 0c.552 0 1 .45 1 .99v4.02C6 5.555 5.556 6 5 6c-.552 0-1-.45-1-.99V.99zm6 8c0-.546.444-.99 1-.99.552 0 1 .45 1 .99v4.02c0 .546-.444.99-1 .99-.552 0-1-.45-1-.99V8.99z' fill='%23ffffff' fill-opacity='0.04' fill-rule='evenodd'/%3E%3C/svg%3E")`,
  waves: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 28' width='56' height='28'%3E%3Cpath fill='%23ffffff' fill-opacity='0.03' d='M56 26v2h-7.75c2.3-1.27 4.94-2 7.75-2zm-26 2a2 2 0 1 0-4 0h-4.09A25.98 25.98 0 0 0 0 16v-2c.67 0 1.34.02 2 .07V14a2 2 0 0 0-2-2v-2a4 4 0 0 1 3.98 3.6 28.09 28.09 0 0 1 2.8-3.86A8 8 0 0 0 0 6V4a9.99 9.99 0 0 1 8.17 4.23c.94-.95 1.96-1.83 3.03-2.63A13.98 13.98 0 0 0 0 0h7.75c2 1.1 3.73 2.63 5.1 4.45 1.12-.72 2.3-1.37 3.53-1.93A20.1 20.1 0 0 0 14.28 0h2.7c.45.56.88 1.14 1.29 1.74 1.3-.48 2.63-.87 4-1.15-.11-.2-.23-.4-.36-.59H26v.07a28.4 28.4 0 0 1 4 0V0h4.09l-.37.59c1.38.28 2.72.67 4.01 1.15.4-.6.84-1.18 1.3-1.74h2.69a20.1 20.1 0 0 0-2.1 2.52c1.23.56 2.41 1.2 3.54 1.93A16.08 16.08 0 0 1 48.25 0H56c-4.58 0-8.65 2.2-11.2 5.6 1.07.8 2.09 1.68 3.03 2.63A9.99 9.99 0 0 1 56 4v2a8 8 0 0 0-6.77 3.74c1.03 1.2 1.97 2.5 2.79 3.86A4 4 0 0 1 56 10v2a2 2 0 0 0-2 2.07 28.4 28.4 0 0 1 2-.07v2c-9.2 0-17.3 4.78-21.91 12H30z'/%3E%3C/svg%3E")`,
  crosshatch: `url("data:image/svg+xml,%3Csvg width='88' height='24' viewBox='0 0 88 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M10 0l30 15 2 1V2.18A10 10 0 0 0 41.76 0H39.7a8 8 0 0 1 .3 2.18v10.58L14.47 0H10zm31.76 24a10 10 0 0 0-5.29-6.76L4 1 2 0v13.82a10 10 0 0 0 5.53 8.94L10 24h4.47l-6.05-3.02A8 8 0 0 1 4 13.82V3.24l31.58 15.78A8 8 0 0 1 39.7 24h2.06z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
};

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("signup");
  const isReturning = useMemo(() => getReturningUser(), []);

  const handleCta = () => {
    setLoginMode(isReturning ? "login" : "signup");
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <LandingHeader onSignIn={() => { setLoginMode("login"); setShowLogin(true); }} isReturning={isReturning} />
      <main className="flex-1">
        <HeroSection onGetStarted={handleCta} isReturning={isReturning} />
        <FeaturesSection />
        <ScreenshotsSection />
        <CTASection onGetStarted={handleCta} isReturning={isReturning} />
      </main>
      <LandingFooter />
      {showLogin && <LoginPopover onClose={() => setShowLogin(false)} defaultMode={loginMode} />}
    </div>
  );
}

function LandingHeader({ onSignIn, isReturning }: { onSignIn: () => void; isReturning: boolean }) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4"
      style={{
        background: "color-mix(in srgb, var(--surface) 85%, transparent)",
        backdropFilter: "blur(12px) saturate(1.2)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="lh-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={GOLD_STOPS[0]} />
              <stop offset="50%" stopColor={GOLD_STOPS[1]} />
              <stop offset="100%" stopColor={GOLD_STOPS[2]} />
            </linearGradient>
          </defs>
        </svg>
        <Volleyball size={26} strokeWidth={1.5} style={{ stroke: "url(#lh-gold)", fill: "none" }} />
        <span
          className="text-base font-bold tracking-tight"
          style={{ fontFamily: "var(--font-almendra), serif", color: "var(--text)", letterSpacing: "-0.01em" }}
        >
          Brall
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/ppsandwich/remembrall/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <Download size={14} />
          <span className="hidden sm:inline">Download</span>
        </a>
        <button
          onClick={onSignIn}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "var(--accent)",
            color: "var(--surface)",
            border: "1px solid var(--accent)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          {isReturning ? "Go to notes" : "Get started"}
        </button>
      </div>
    </header>
  );
}

function HeroSection({ onGetStarted, isReturning }: { onGetStarted: () => void; isReturning: boolean }) {
  return (
    <section className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: "min(100vh, 720px)" }}>
      {/* Animated gradient background */}
      <div
        className="landing-animated-bg absolute inset-0"
        style={{
          background: `linear-gradient(135deg, var(--bg) 0%, var(--surface-subtle) 25%, var(--bg) 50%, color-mix(in srgb, var(--border) 30%, var(--bg)) 75%, var(--bg) 100%)`,
          backgroundSize: "400% 400%",
        }}
      />

      {/* Floating orbs */}
      <div
        className="landing-orb-1 absolute rounded-full"
        style={{
          width: "400px",
          height: "400px",
          top: "10%",
          left: "15%",
          background: `radial-gradient(circle, color-mix(in srgb, ${GOLD_STOPS[0]} 8%, transparent) 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        className="landing-orb-2 absolute rounded-full"
        style={{
          width: "350px",
          height: "350px",
          bottom: "15%",
          right: "10%",
          background: `radial-gradient(circle, color-mix(in srgb, ${GOLD_STOPS[1]} 6%, transparent) 0%, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />
      <div
        className="landing-orb-3 absolute rounded-full"
        style={{
          width: "250px",
          height: "250px",
          top: "50%",
          left: "60%",
          background: `radial-gradient(circle, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat", opacity: 0.6 }}
      />

      {/* Decorative stars */}
      <LandingStar style={{ top: "18%", left: "22%", animationDelay: "0s" }} />
      <LandingStar style={{ top: "30%", right: "25%", animationDelay: "1.2s" }} />
      <LandingStar style={{ bottom: "28%", left: "30%", animationDelay: "0.6s" }} />
      <LandingStar style={{ top: "45%", right: "18%", animationDelay: "2s" }} />
      <LandingStar style={{ bottom: "20%", right: "35%", animationDelay: "0.9s" }} />
      <LandingStar style={{ top: "15%", left: "55%", animationDelay: "1.5s" }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <div className="landing-fade-up mb-6">
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <linearGradient id="hero-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={GOLD_STOPS[0]} />
                <stop offset="50%" stopColor={GOLD_STOPS[1]} />
                <stop offset="100%" stopColor={GOLD_STOPS[2]} />
              </linearGradient>
            </defs>
          </svg>
          <Volleyball size={64} strokeWidth={1} style={{ stroke: "url(#hero-gold)", fill: "none", margin: "0 auto" }} />
        </div>

        <h1
          className="landing-fade-up landing-fade-up-d1"
          style={{
            fontFamily: "var(--font-almendra), serif",
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--text)",
            marginBottom: "1rem",
          }}
        >
          Brall
        </h1>

        <p
          className="landing-fade-up landing-fade-up-d2"
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.35rem)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: "480px",
            margin: "0 auto 2.5rem",
          }}
        >
          The speed-first note capture app that respects your privacy. Open, type, and vanish back into thought.
        </p>

        <div className="landing-fade-up landing-fade-up-d3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGetStarted}
            className="landing-shimmer px-8 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: `linear-gradient(135deg, ${GOLD_STOPS[0]}, ${GOLD_STOPS[1]}, ${GOLD_STOPS[2]})`,
              color: "#1a1a1a",
              border: "none",
              boxShadow: `0 4px 24px color-mix(in srgb, ${GOLD_STOPS[1]} 30%, transparent)`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 32px color-mix(in srgb, ${GOLD_STOPS[1]} 40%, transparent)`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 24px color-mix(in srgb, ${GOLD_STOPS[1]} 30%, transparent)`; }}
          >
            {isReturning ? "Go to notes" : "Get started — it's free"}
          </button>
          <a
            href="https://github.com/ppsandwich/remembrall/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Download size={15} />
            Download for Desktop
          </a>
        </div>
        <div className="landing-fade-up landing-fade-up-d3 mt-3 flex items-center justify-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>No account required to try</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>macOS, Windows & Linux</span>
        </div>

        <p
          className="landing-fade-up landing-fade-up-d4 mt-16 text-xs tracking-widest uppercase"
          style={{ color: "var(--text-muted)", opacity: 0.5 }}
        >
          Scroll to discover
        </p>
      </div>
    </section>
  );
}

function LandingStar({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="landing-star absolute w-1 h-1 rounded-full pointer-events-none"
      style={{
        background: GOLD_STOPS[0],
        boxShadow: `0 0 6px 2px color-mix(in srgb, ${GOLD_STOPS[0]} 40%, transparent)`,
        ...style,
      }}
    />
  );
}

function FeaturesSection() {
  return (
    <section className="relative py-24 md:py-32 px-6">
      {/* Section divider texture */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, var(--border), transparent)`,
        }}
      />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-xs tracking-widest uppercase mb-3"
            style={{ color: GOLD_STOPS[1] }}
          >
            Why Brall
          </p>
          <h2
            style={{
              fontFamily: "var(--font-almendra), serif",
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Built for the way you think
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const Icon = feature.icon;
  return (
    <div
      className={`landing-fade-up landing-fade-up-d${index + 1} relative rounded-xl p-6 md:p-8 transition-all overflow-hidden`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        backgroundImage: TEXTURES[feature.texture],
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{
          background: `color-mix(in srgb, ${GOLD_STOPS[1]} 10%, var(--surface))`,
          border: `1px solid color-mix(in srgb, ${GOLD_STOPS[1]} 20%, var(--border))`,
        }}
      >
        <Icon size={18} strokeWidth={1.5} style={{ color: GOLD_STOPS[1] }} />
      </div>
      <h3
        className="text-sm font-semibold mb-2"
        style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
      >
        {feature.title}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {feature.description}
      </p>
    </div>
  );
}

function ScreenshotsSection() {
  return (
    <section className="relative py-24 md:py-32 px-6" style={{ background: "var(--surface-subtle)" }}>
      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat", opacity: 0.5 }}
      />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-xs tracking-widest uppercase mb-3"
            style={{ color: GOLD_STOPS[1] }}
          >
            See it in action
          </p>
          <h2
            style={{
              fontFamily: "var(--font-almendra), serif",
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Crafted with intention
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScreenshotMockup label="Note grid with colour-coded sections" />
          <ScreenshotMockup label="Rich text editor with tags" />
        </div>
      </div>
    </section>
  );
}

function ScreenshotMockup({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444", opacity: 0.7 }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B", opacity: 0.7 }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22C55E", opacity: 0.7 }} />
        <span className="ml-2 text-xs" style={{ color: "var(--text-muted)", opacity: 0.5 }}>{label}</span>
      </div>
      {/* Content placeholder */}
      <div
        className="flex items-center justify-center"
        style={{
          height: "280px",
          background: `linear-gradient(135deg, var(--surface-subtle), var(--bg))`,
        }}
      >
        <div className="text-center px-6">
          <Volleyball size={32} strokeWidth={1} style={{ stroke: "var(--border-strong)", fill: "none", margin: "0 auto 0.75rem", opacity: 0.4 }} />
          <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.4 }}>
            Screenshot coming soon
          </p>
        </div>
      </div>
    </div>
  );
}

function CTASection({ onGetStarted, isReturning }: { onGetStarted: () => void; isReturning: boolean }) {
  return (
    <section className="relative py-24 md:py-32 px-6 overflow-hidden">
      {/* Decorative orb */}
      <div
        className="landing-orb-2 absolute rounded-full"
        style={{
          width: "300px",
          height: "300px",
          top: "20%",
          right: "10%",
          background: `radial-gradient(circle, color-mix(in srgb, ${GOLD_STOPS[0]} 6%, transparent) 0%, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />

      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat", opacity: 0.4 }}
      />

      <div className="relative text-center max-w-lg mx-auto">
        <p
          className="text-xs tracking-widest uppercase mb-3"
          style={{ color: GOLD_STOPS[1] }}
        >
          {isReturning ? "Welcome back" : "Begin"}
        </p>
        <h2
          style={{
            fontFamily: "var(--font-almendra), serif",
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            marginBottom: "1rem",
          }}
        >
          {isReturning ? "Your notes are waiting" : "Ready to capture your thoughts?"}
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          {isReturning
            ? "Sign in to pick up where you left off."
            : "Sign up in seconds. No credit card, no commitment. Just open and write."}
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "var(--accent)",
            color: "var(--surface)",
            border: "1px solid var(--accent)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {isReturning ? "Go to notes" : "Sign up — it's free"}
        </button>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer
      className="px-6 md:px-10 py-8"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Volleyball size={14} strokeWidth={1.5} style={{ stroke: GOLD_STOPS[1], fill: "none", opacity: 0.5 }} />
          <span className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
            © 2025 Brall
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>
            Created by{" "}
            <span style={{ color: "var(--text-secondary)" }}>Dylan Gibbs</span>
            {" "}aka{" "}
            <span style={{ color: "var(--text-secondary)" }}>Sandwich Codes</span>
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <a
            href="mailto:dfgibbs@gmail.com"
            className="hover:underline transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            dfgibbs@gmail.com
          </a>
          <span style={{ opacity: 0.3 }}>·</span>
          <a
            href="https://github.com/ppsandwich"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
