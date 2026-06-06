import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownToLine, ExternalLink, Github, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { assetUrl } from "../utils/assets.js";

gsap.registerPlugin(ScrollTrigger);

function LinkList({ links = [] }) {
  if (!links.length) return null;

  return (
    <div className="link-list">
      {links.map((link) => (
        <a key={`${link.label}-${link.url}`} href={assetUrl(link.url)} target="_blank" rel="noreferrer">
          <span>{link.label}</span>
          <ExternalLink size={14} />
        </a>
      ))}
    </div>
  );
}

function TechChips({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="chip-row">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function NameSection({ content }) {
  const { profile, stats } = content;

  return (
    <div className="name-grid" data-reveal>
      <div className="portrait-wrap">
        <img src={assetUrl(profile.portrait)} alt={profile.name} />
      </div>
      <div>
        <p className="panel-kicker">{profile.handle}</p>
        <h2>{profile.name}</h2>
        <p className="lead">{profile.title}</p>
        <p className="muted">{profile.subtitle}</p>
        <div className="stats-grid" aria-label="Portfolio impact metrics">
          {(stats ?? []).map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectiveSection({ content }) {
  const { objective } = content;

  return (
    <div className="copy-stack">
      <h2 data-reveal>{objective.headline}</h2>
      {(objective.body ?? []).map((paragraph) => (
        <p key={paragraph} className="lead" data-reveal>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function WhoAmISection({ content }) {
  const { whoAmI } = content;

  return (
    <div className="copy-stack">
      <h2 data-reveal>{whoAmI.headline}</h2>
      {(whoAmI.paragraphs ?? []).map((paragraph) => (
        <p key={paragraph} className="lead" data-reveal>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function ExperienceSection({ content }) {
  const { experiences } = content;

  return (
    <div className="timeline">
      {(experiences ?? []).map((job) => (
        <article key={`${job.role}-${job.organization}`} className="timeline-item" data-reveal>
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-heading">
              <div>
                <span>{job.type}</span>
                <h3>{job.role}</h3>
              </div>
              <p>{job.period}</p>
            </div>
            <p className="muted">
              {job.organization}, {job.location}
            </p>
            <p>{job.summary}</p>
            <ul>
              {(job.bullets ?? []).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <TechChips items={job.technologies} />
            <LinkList links={job.links} />
          </div>
        </article>
      ))}
    </div>
  );
}

function EducationSection({ content }) {
  const { education } = content;

  return (
    <div className="copy-stack">
      {(education ?? []).map((item) => (
        <article className="feature-block" key={item.degree} data-reveal>
          <h2>{item.degree}</h2>
          <p className="lead">{item.institution}</p>
          <p>{item.period}</p>
          <strong>{item.result}</strong>
        </article>
      ))}
    </div>
  );
}

function SkillsSection({ content }) {
  const { skillGroups } = content;

  return (
    <div className="skills-grid">
      {(skillGroups ?? []).map((group) => (
        <article className="skill-block" key={group.title} data-reveal>
          <div className="skill-heading">
            <h3>{group.title}</h3>
            <strong>{group.level}%</strong>
          </div>
          <div className="skill-meter" aria-hidden="true">
            <span style={{ width: `${group.level}%` }} />
          </div>
          <TechChips items={group.items} />
          <LinkList links={group.links} />
        </article>
      ))}
    </div>
  );
}

function ResearchSection({ content }) {
  const { research } = content;

  return (
    <div className="project-list">
      {(research ?? []).map((item) => (
        <article className="project-row" key={item.title} data-reveal>
          {item.image ? <img src={assetUrl(item.image)} alt="" /> : <div className="paper-mark">MT</div>}
          <div>
            <span>{item.period}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <TechChips items={item.technologies} />
            <LinkList links={item.links} />
          </div>
        </article>
      ))}
    </div>
  );
}

function ShowcaseSection({ content }) {
  const { projects } = content;

  return (
    <div className="showcase-grid">
      {(projects ?? []).map((project) => {
        const projectLinks = [...(project.url ? [{ label: project.linkLabel ?? "Project link", url: project.url }] : []), ...(project.links ?? [])];

        return (
          <article className="showcase-card" key={project.title} data-reveal>
            <a href={assetUrl(project.url || project.image || "#")} target="_blank" rel="noreferrer" className="showcase-media">
              {project.image ? <img src={assetUrl(project.image)} alt={`${project.title} visual showcase`} loading="lazy" /> : <div className="paper-mark">PR</div>}
            </a>
            <div className="showcase-copy">
              <span>{project.category}</span>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <ul>
                {(project.bullets ?? []).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <TechChips items={project.technologies} />
              <LinkList links={projectLinks} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function FollowSection({ content }) {
  const { socialLinks } = content;
  const iconMap = {
    Github,
    GitHub: Github,
    LinkedIn: Linkedin,
  };

  return (
    <div className="social-grid">
      {(socialLinks ?? []).map((link) => {
        const Icon = iconMap[link.label] ?? ExternalLink;
        return (
          <a key={link.label} href={link.url} target="_blank" rel="noreferrer" data-reveal>
            <Icon size={22} />
            <span>{link.label}</span>
            <ExternalLink size={14} />
          </a>
        );
      })}
    </div>
  );
}

function ContactSection({ content }) {
  const { profile } = content;
  const phoneHref = profile.phone ? profile.phone.replace(/[^\d+]/g, "") : "";

  return (
    <div className="contact-grid">
      <a href={`mailto:${profile.email}`} data-reveal>
        <Mail size={18} />
        <span>{profile.email}</span>
      </a>
      <a href={`tel:${phoneHref}`} data-reveal>
        <Phone size={18} />
        <span>{profile.phone}</span>
      </a>
      <div data-reveal>
        <MapPin size={18} />
        <span>{profile.location}</span>
      </div>
      <a href={assetUrl(profile.resume)} target="_blank" rel="noreferrer" data-reveal>
        <ArrowDownToLine size={18} />
        <span>{profile.resumeLabel ?? "Download Resume"}</span>
      </a>
    </div>
  );
}

function renderSection(type, content) {
  switch (type) {
    case "name":
      return <NameSection content={content} />;
    case "objective":
      return <ObjectiveSection content={content} />;
    case "whoami":
      return <WhoAmISection content={content} />;
    case "experience":
      return <ExperienceSection content={content} />;
    case "education":
      return <EducationSection content={content} />;
    case "skills":
      return <SkillsSection content={content} />;
    case "research":
      return <ResearchSection content={content} />;
    case "showcase":
      return <ShowcaseSection content={content} />;
    case "follow":
      return <FollowSection content={content} />;
    case "contact":
      return <ContactSection content={content} />;
    default:
      return <NameSection content={content} />;
  }
}

export default function ContentPanel({ section, activeId, onSelect, content }) {
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const { sectionOrder, sections } = content;

  useLayoutEffect(() => {
    if (!panelRef.current || !bodyRef.current) return undefined;

    bodyRef.current.scrollTop = 0;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, y: 28, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.72, ease: "power3.out" },
      );

      gsap.fromTo(
        "[data-reveal]",
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.68, ease: "power2.out", stagger: 0.055, delay: 0.12 },
      );

      const revealTargets = gsap.utils.toArray("[data-reveal]");
      ScrollTrigger.batch(revealTargets, {
        scroller: bodyRef.current,
        start: "top 92%",
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04, overwrite: true }),
      });
    }, panelRef);

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.scroller === bodyRef.current) trigger.kill();
      });
      ctx.revert();
    };
  }, [activeId]);

  return (
    <section className="content-panel chrome-reveal" ref={panelRef} aria-live="polite">
      <div className="panel-header">
        <div>
          <span>{section.eyebrow}</span>
          <h1>{section.title}</h1>
        </div>
        <div className="panel-index">
          <strong>{String(sectionOrder.indexOf(section.id) + 1).padStart(2, "0")}</strong>
          <span>/ {String(sectionOrder.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="panel-body" ref={bodyRef}>
        {renderSection(section.type, content)}
      </div>

      <div className="panel-footer" style={{ "--section-count": sectionOrder.length }}>
        {sectionOrder.map((id) => (
          <button key={id} type="button" className={id === activeId ? "is-active" : ""} onClick={() => onSelect(id)} aria-label={`Open ${sections[id]?.title ?? id}`}>
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}
