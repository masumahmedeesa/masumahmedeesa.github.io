import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownToLine, Database, Github, Linkedin, Mail, Menu, X } from "lucide-react";
import ContentManager from "./components/ContentManager.jsx";
import ContentPanel from "./components/ContentPanel.jsx";
import { usePortfolioContent } from "./data/PortfolioContentContext.jsx";
import { assetUrl } from "./utils/assets.js";

gsap.registerPlugin(ScrollTrigger);

const TreeExperience = lazy(() => import("./components/TreeExperience.jsx"));

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return hash;
}

export default function App() {
  const route = useHashRoute();
  const { content } = usePortfolioContent();
  const { profile, sectionOrder, sections, socialLinks, treeNavItems } = content;
  const [activeId, setActiveId] = useState("name");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const firstSectionId = sectionOrder[0] ?? Object.keys(sections)[0] ?? "name";
  const activeSection = sections[activeId] ?? sections[firstSectionId];

  const socialIconMap = useMemo(
    () => ({
      Github,
      GitHub: Github,
      LinkedIn: Linkedin,
    }),
    [],
  );

  useEffect(() => {
    if (!sections[activeId] && firstSectionId) setActiveId(firstSectionId);
  }, [activeId, firstSectionId, sections]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".chrome-reveal",
        { autoAlpha: 0, y: -14 },
        { autoAlpha: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.08 },
      );
    });

    return () => ctx.revert();
  }, []);

  const handleSelect = (id) => {
    setHasInteracted(true);
    setActiveId(id);
    setNavOpen(false);
  };

  if (route === "#/admin") {
    return <ContentManager />;
  }

  return (
    <main className="app-shell">
      <Suspense fallback={<div className="tree-loading">Growing the canopy...</div>}>
        <TreeExperience activeId={activeId} hasInteracted={hasInteracted} onSelect={handleSelect} treeNavItems={treeNavItems} />
      </Suspense>

      <header className="topbar chrome-reveal">
        <button className="brand-mark" type="button" onClick={() => handleSelect(firstSectionId)} aria-label={`Open ${profile.name} section`}>
          <span>{profile.handle}</span>
        </button>

        <nav className={`section-dock ${navOpen ? "is-open" : ""}`} aria-label="Portfolio sections">
          {sectionOrder.map((id) => (
            <button
              key={id}
              className={activeId === id ? "is-active" : ""}
              type="button"
              onClick={() => handleSelect(id)}
            >
              {sections[id]?.title ?? id}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <a className="icon-button admin-entry" href="#/admin" aria-label="Open content manager">
            <Database size={18} />
          </a>
          <button className="icon-button mobile-menu" type="button" onClick={() => setNavOpen((value) => !value)} aria-label="Toggle navigation">
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <aside className="status-rail chrome-reveal" aria-label="Portfolio links">
        <a className="icon-button" href={`mailto:${profile.email}`} aria-label={`Email ${profile.name}`}>
          <Mail size={18} />
        </a>
        {socialLinks.map((link) => {
          const Icon = socialIconMap[link.label];
          return (
            <a key={link.label} className="icon-button" href={link.url} target="_blank" rel="noreferrer" aria-label={link.label}>
              {Icon ? <Icon size={18} /> : <span className="social-initial">{link.label.slice(0, 1)}</span>}
            </a>
          );
        })}
        <a className="icon-button" href={assetUrl(profile.resume)} target="_blank" rel="noreferrer" aria-label="Download resume">
          <ArrowDownToLine size={18} />
        </a>
      </aside>

      <ContentPanel section={activeSection} activeId={activeId} onSelect={handleSelect} content={content} />

      <div className="ambient-copy chrome-reveal" aria-hidden="true">
        <span>Professional Journey</span>
        <strong>{activeSection?.title}</strong>
      </div>
    </main>
  );
}
