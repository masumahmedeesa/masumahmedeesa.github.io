import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, CheckCircle2, Copy, Database, Download, FileJson, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { normalizePortfolioContent, usePortfolioContent } from "../data/PortfolioContentContext.jsx";

const stringify = (value) => JSON.stringify(value, null, 2);
const clone = (value) => JSON.parse(JSON.stringify(value));

const profileFields = [
  ["name", "Name"],
  ["handle", "Handle"],
  ["title", "Title"],
  ["subtitle", "Subtitle"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["location", "Location"],
  ["portrait", "Portrait path"],
  ["resume", "Resume path"],
];

function makeEmptyProject() {
  return {
    title: "New Project",
    category: "Category",
    image: "/images/portfolio/codexpro.jpg",
    gallery: "",
    url: "",
    description: "Describe the project.",
    bullets: ["Add a project highlight."],
    technologies: ["React"],
    links: [],
  };
}

function parseDraft(jsonDraft) {
  return normalizePortfolioContent(JSON.parse(jsonDraft));
}

function downloadJson(content) {
  const blob = new Blob([`${stringify(content)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "portfolio-content.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Field({ label, value, onChange, textarea = false }) {
  const Input = textarea ? "textarea" : "input";

  return (
    <label className="cms-field">
      <span>{label}</span>
      <Input value={value ?? ""} onChange={(event) => onChange(event.target.value)} rows={textarea ? 4 : undefined} />
    </label>
  );
}

export default function ContentManager() {
  const { content, databasePath, resetContent, source, storageKey, updateContent } = usePortfolioContent();
  const [draftContent, setDraftContent] = useState(() => normalizePortfolioContent(content));
  const [jsonDraft, setJsonDraft] = useState(() => stringify(normalizePortfolioContent(content)));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState({ type: "info", text: "Ready" });
  const fileInputRef = useRef(null);
  const shellRef = useRef(null);

  const counts = useMemo(
    () => [
      { label: "Sections", value: draftContent.sectionOrder.length },
      { label: "Projects", value: draftContent.projects.length },
      { label: "Skills", value: draftContent.skillGroups.length },
      { label: "Social", value: draftContent.socialLinks.length },
    ],
    [draftContent],
  );

  useEffect(() => {
    const normalized = normalizePortfolioContent(content);
    setDraftContent(normalized);
    setJsonDraft(stringify(normalized));
    setDirty(false);
    setStatus({ type: "info", text: `Loaded from ${source}` });
  }, [content, source]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cms-reveal",
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.62, ease: "power3.out", stagger: 0.06 },
      );
    }, shellRef);

    return () => ctx.revert();
  }, []);

  const setDraft = (nextContent, message = "Draft updated") => {
    const normalized = normalizePortfolioContent(nextContent);
    setDraftContent(normalized);
    setJsonDraft(stringify(normalized));
    setDirty(true);
    setStatus({ type: "info", text: message });
  };

  const updateDraft = (recipe, message) => {
    let current;
    try {
      current = parseDraft(jsonDraft);
    } catch {
      setStatus({ type: "error", text: "Fix the JSON before using quick editors" });
      return;
    }

    const next = clone(current);
    recipe(next);
    setDraft(next, message);
  };

  const handleProfileChange = (field, value) => {
    updateDraft((next) => {
      next.profile[field] = value;
      if (field === "handle" && next.sections.name) next.sections.name.eyebrow = value;
    }, "Profile draft updated");
  };

  const handleNavChange = (id, field, value) => {
    updateDraft((next) => {
      next.treeNavItems = next.treeNavItems.map((item) => (item.id === id ? { ...item, [field]: value } : item));
      if (field === "label" && next.sections[id]) next.sections[id].title = value;
    }, "Navigation draft updated");
  };

  const handleProjectChange = (index, field, value) => {
    updateDraft((next) => {
      next.projects[index] = { ...next.projects[index], [field]: value };
    }, "Project draft updated");
  };

  const handleSocialChange = (index, field, value) => {
    updateDraft((next) => {
      next.socialLinks[index] = { ...next.socialLinks[index], [field]: value };
    }, "Social draft updated");
  };

  const handleSave = () => {
    try {
      const parsed = parseDraft(jsonDraft);
      updateContent(parsed);
      setDraftContent(parsed);
      setJsonDraft(stringify(parsed));
      setDirty(false);
      setStatus({ type: "success", text: "Saved to browser database" });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    }
  };

  const handleExport = () => {
    try {
      const parsed = parseDraft(jsonDraft);
      downloadJson(parsed);
      setStatus({ type: "success", text: "Exported portfolio-content.json" });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${jsonDraft}\n`);
      setStatus({ type: "success", text: "JSON copied" });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    }
  };

  const handleImport = async (event) => {
    const [file] = event.target.files ?? [];
    if (!file) return;

    try {
      const parsed = normalizePortfolioContent(JSON.parse(await file.text()));
      setDraft(parsed, "Imported JSON draft");
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    } finally {
      event.target.value = "";
    }
  };

  const handleReset = () => {
    resetContent();
    setStatus({ type: "info", text: "Reset to JSON database" });
  };

  return (
    <main className="cms-shell" ref={shellRef}>
      <header className="cms-topbar cms-reveal">
        <a className="cms-back" href="#/">
          <ArrowLeft size={18} />
          <span>Portfolio</span>
        </a>
        <div>
          <p>Content Studio</p>
          <h1>Portfolio Database</h1>
        </div>
        <span className="cms-source">
          <Database size={16} />
          {source}
        </span>
      </header>

      <div className="cms-layout">
        <aside className="cms-sidebar cms-reveal">
          <div className="cms-counts">
            {counts.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="cms-actions">
            <button type="button" onClick={handleSave} className="cms-primary">
              <Save size={16} />
              <span>{dirty ? "Save Draft" : "Saved"}</span>
            </button>
            <button type="button" onClick={handleExport}>
              <Download size={16} />
              <span>Export JSON</span>
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              <span>Import JSON</span>
            </button>
            <button type="button" onClick={handleCopy}>
              <Copy size={16} />
              <span>Copy JSON</span>
            </button>
            <button type="button" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} hidden />

          <div className={`cms-status is-${status.type}`}>
            {status.type === "success" ? <CheckCircle2 size={16} /> : <FileJson size={16} />}
            <span>{status.text}</span>
          </div>

          <dl className="cms-meta">
            <div>
              <dt>Database file</dt>
              <dd>{databasePath}</dd>
            </div>
            <div>
              <dt>Browser key</dt>
              <dd>{storageKey}</dd>
            </div>
          </dl>
        </aside>

        <section className="cms-editor-stack">
          <article className="cms-card cms-reveal">
            <header>
              <h2>Profile</h2>
            </header>
            <div className="cms-field-grid">
              {profileFields.map(([field, label]) => (
                <Field key={field} label={label} value={draftContent.profile[field]} onChange={(value) => handleProfileChange(field, value)} />
              ))}
            </div>
          </article>

          <article className="cms-card cms-reveal">
            <header>
              <h2>Tree Navigation</h2>
            </header>
            <div className="cms-nav-list">
              {draftContent.treeNavItems.map((item) => (
                <div className="cms-nav-row" key={item.id}>
                  <span style={{ "--leaf-tint": item.tint }}>{item.id}</span>
                  <input value={item.label} onChange={(event) => handleNavChange(item.id, "label", event.target.value)} aria-label={`${item.id} label`} />
                  <input value={item.tint} onChange={(event) => handleNavChange(item.id, "tint", event.target.value)} aria-label={`${item.id} color`} />
                </div>
              ))}
            </div>
          </article>

          <article className="cms-card cms-reveal">
            <header>
              <h2>Projects</h2>
              <button type="button" onClick={() => updateDraft((next) => next.projects.unshift(makeEmptyProject()), "Project added")}>
                <Plus size={16} />
                <span>Add</span>
              </button>
            </header>
            <div className="cms-list">
              {draftContent.projects.map((project, index) => (
                <div className="cms-list-row" key={`${project.title}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{project.title || `Project ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateDraft((next) => next.projects.splice(index, 1), "Project removed")} aria-label={`Remove ${project.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Title" value={project.title} onChange={(value) => handleProjectChange(index, "title", value)} />
                    <Field label="Category" value={project.category} onChange={(value) => handleProjectChange(index, "category", value)} />
                    <Field label="URL" value={project.url} onChange={(value) => handleProjectChange(index, "url", value)} />
                    <Field label="Image" value={project.image} onChange={(value) => handleProjectChange(index, "image", value)} />
                  </div>
                  <Field label="Description" value={project.description} textarea onChange={(value) => handleProjectChange(index, "description", value)} />
                </div>
              ))}
            </div>
          </article>

          <article className="cms-card cms-reveal">
            <header>
              <h2>Social Links</h2>
              <button type="button" onClick={() => updateDraft((next) => next.socialLinks.push({ label: "New Link", url: "" }), "Social link added")}>
                <Plus size={16} />
                <span>Add</span>
              </button>
            </header>
            <div className="cms-list">
              {draftContent.socialLinks.map((link, index) => (
                <div className="cms-nav-row" key={`${link.label}-${index}`}>
                  <input value={link.label} onChange={(event) => handleSocialChange(index, "label", event.target.value)} aria-label={`Social label ${index + 1}`} />
                  <input value={link.url} onChange={(event) => handleSocialChange(index, "url", event.target.value)} aria-label={`Social URL ${index + 1}`} />
                  <button type="button" onClick={() => updateDraft((next) => next.socialLinks.splice(index, 1), "Social link removed")} aria-label={`Remove ${link.label}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="cms-card cms-reveal">
            <header>
              <h2>Full JSON</h2>
            </header>
            <textarea
              className="cms-json"
              value={jsonDraft}
              spellCheck="false"
              onChange={(event) => {
                setJsonDraft(event.target.value);
                setDirty(true);
                setStatus({ type: "info", text: "JSON draft updated" });
              }}
              aria-label="Portfolio content JSON"
            />
          </article>
        </section>
      </div>
    </main>
  );
}
