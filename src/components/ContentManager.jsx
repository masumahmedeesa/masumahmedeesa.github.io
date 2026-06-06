import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Database, Download, FileJson, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
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
  ["resumeLabel", "Resume button label"],
  ["journeyLabel", "Ambient label"],
];

const treeColorPalette = ["#f4d35e", "#7bd389", "#70d6ff", "#ff9f6e", "#c7f9cc", "#f497b6", "#b8f2e6", "#a0c4ff", "#95d5b2", "#ffcad4"];
const toHexColor = (value) => (/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#f4d35e");

function makeEmptyLink() {
  return { label: "New Link", url: "" };
}

function makeEmptyEducation() {
  return {
    degree: "New Degree",
    institution: "Institution",
    period: "Period",
    result: "Result",
  };
}

function makeEmptyExperience() {
  return {
    role: "New Role",
    type: "Full-time",
    organization: "Organization",
    location: "Location",
    period: "Period",
    summary: "Short summary.",
    bullets: ["Add an achievement."],
    technologies: ["React"],
    links: [],
  };
}

function makeEmptySkillGroup() {
  return {
    title: "New Skill Group",
    level: 80,
    items: ["Add a skill"],
    links: [],
  };
}

function makeEmptyResearch() {
  return {
    title: "New Research",
    period: "Period",
    description: "Describe the research.",
    technologies: ["Python"],
    image: "",
    links: [],
  };
}

function makeEmptyProject() {
  return {
    title: "New Project",
    category: "Category",
    image: "/images/portfolio/codexpro.jpg",
    url: "",
    linkLabel: "Project link",
    description: "Describe the project.",
    bullets: ["Add a project highlight."],
    technologies: ["React"],
    links: [],
  };
}

function makeEmptyStat() {
  return { label: "New Metric", value: "0+" };
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

function formatSavedAt(value) {
  if (!value) return "No preview draft yet";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function Field({ label, value, onChange, textarea = false, type = "text", min, max }) {
  const Input = textarea ? "textarea" : "input";

  return (
    <label className="cms-field">
      <span>{label}</span>
      <Input value={value ?? ""} onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)} rows={textarea ? 4 : undefined} type={type} min={min} max={max} />
    </label>
  );
}

function AssetField({ label, value, onChange, onStatus, kind = "image" }) {
  const [mode, setMode] = useState("url");
  const isImage = kind === "image";
  const uploadLabel = isImage ? "Or you can upload a photo" : "Or you can upload a resume";
  const urlLabel = isImage ? "Or you can use an image URL" : "Or you can use a resume URL";
  const acceptedTypes = isImage ? "image/*" : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const handleUpload = (event) => {
    const [file] = event.target.files ?? [];
    if (!file) return;

    if (isImage && !file.type.startsWith("image/")) {
      onStatus({ type: "error", text: "Please upload an image file." });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      onStatus({ type: "info", text: `Uploaded ${isImage ? "image" : "resume"} draft. Export or copy JSON before reload.` });
      event.target.value = "";
    };
    reader.onerror = () => {
      onStatus({ type: "error", text: "Could not read the selected file." });
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="cms-asset-field">
      <div className="cms-asset-row">
        <div className="cms-asset-control">
          {mode === "url" ? (
            <>
              <label className="cms-field">
                <span>{label}</span>
                <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={isImage ? "https://example.com/image.jpg or /images/example.jpg" : "https://example.com/resume.pdf or /resume.pdf"} />
              </label>
              <button type="button" className="cms-switch-button" onClick={() => setMode("upload")}>
                {uploadLabel}
              </button>
            </>
          ) : (
            <>
              <label className="cms-field">
                <span>{isImage ? "Upload photo draft" : "Upload resume draft"} (Draft uploads reset on reload. For permanent use, clone the repo and follow README.md.)</span>
                <input type="file" accept={acceptedTypes} onChange={handleUpload} />
              </label>
              <button type="button" className="cms-switch-button" onClick={() => setMode("url")}>
                {urlLabel}
              </button>
            </>
          )}
        </div>
        <div className={`cms-asset-preview ${isImage ? "is-image" : "is-file"}`} aria-label={`${label} preview`}>
          {value ? (
            isImage ? (
              <img src={value} alt="" />
            ) : (
              <a href={value} target="_blank" rel="noreferrer">
                <FileJson size={18} />
                <span>Open resume</span>
              </a>
            )
          ) : (
            <span>No file selected</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TextListEditor({ label, items = [], onChange, addLabel = "Add item" }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="cms-nested-editor">
      <div className="cms-nested-header">
        <span>{label}</span>
        <button type="button" onClick={() => onChange([...list, ""])}>
          <Plus size={15} />
          <span>{addLabel}</span>
        </button>
      </div>
      <div className="cms-nested-list">
        {list.map((item, index) => (
          <div className="cms-inline-row" key={`${label}-${index}`}>
            <input value={item ?? ""} onChange={(event) => onChange(list.map((current, itemIndex) => (itemIndex === index ? event.target.value : current)))} aria-label={`${label} ${index + 1}`} />
            <button type="button" onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label} ${index + 1}`}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkListEditor({ label, links = [], onChange }) {
  const list = Array.isArray(links) ? links : [];

  return (
    <div className="cms-nested-editor">
      <div className="cms-nested-header">
        <span>{label}</span>
        <button type="button" onClick={() => onChange([...list, makeEmptyLink()])}>
          <Plus size={15} />
          <span>Add link</span>
        </button>
      </div>
      <div className="cms-nested-list">
        {list.map((link, index) => (
          <div className="cms-link-row" key={`${label}-${index}`}>
            <input value={link.label ?? ""} onChange={(event) => onChange(list.map((current, itemIndex) => (itemIndex === index ? { ...current, label: event.target.value } : current)))} aria-label={`${label} label ${index + 1}`} />
            <input value={link.url ?? ""} onChange={(event) => onChange(list.map((current, itemIndex) => (itemIndex === index ? { ...current, url: event.target.value } : current)))} aria-label={`${label} URL ${index + 1}`} />
            <button type="button" onClick={() => onChange(list.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label} ${index + 1}`}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ title, onAdd, addLabel = "Add", children }) {
  return (
    <article className="cms-card cms-reveal">
      <header>
        <h2>{title}</h2>
        {onAdd ? (
          <button type="button" onClick={onAdd}>
            <Plus size={16} />
            <span>{addLabel}</span>
          </button>
        ) : null}
      </header>
      {children}
    </article>
  );
}

export default function ContentManager() {
  const { content, databasePath, draftSavedAt, hasPreviewDraft, resetContent, source, updateContent } = usePortfolioContent();
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
        { autoAlpha: 1, y: 0, duration: 0.62, ease: "power3.out", stagger: 0.04 },
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

  const updateProfile = (field, value) => {
    updateDraft((next) => {
      next.profile[field] = value;
      if (field === "handle" && next.sections.name) next.sections.name.eyebrow = value;
    }, "Profile draft updated");
  };

  const updateSectionMeta = (id, field, value) => {
    updateDraft((next) => {
      next.sections[id] = { ...next.sections[id], [field]: value };
      if (field === "title") {
        next.treeNavItems = next.treeNavItems.map((item) => (item.id === id ? { ...item, label: value } : item));
      }
    }, "Section copy updated");
  };

  const updateNavItem = (id, field, value) => {
    updateDraft((next) => {
      next.treeNavItems = next.treeNavItems.map((item) => (item.id === id ? { ...item, [field]: value } : item));
      if (field === "label" && next.sections[id]) next.sections[id].title = value;
    }, "Navigation draft updated");
  };

  const updateRecord = (collection, index, field, value, message) => {
    updateDraft((next) => {
      next[collection][index] = { ...next[collection][index], [field]: value };
    }, message);
  };

  const updateRecordList = (collection, index, field, value, message) => {
    updateDraft((next) => {
      next[collection][index] = { ...next[collection][index], [field]: value };
    }, message);
  };

  const updateTopLevelRecord = (record, field, value, message) => {
    updateDraft((next) => {
      next[record][field] = value;
    }, message);
  };

  const updateTopLevelList = (field, value, message) => {
    updateDraft((next) => {
      next[field] = value;
    }, message);
  };

  const handleSave = () => {
    try {
      const parsed = parseDraft(jsonDraft);
      updateContent(parsed);
      setDraftContent(parsed);
      setJsonDraft(stringify(parsed));
      setDirty(false);
      setStatus({ type: "success", text: "Saved for preview. Export or copy JSON before reload." });
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

      <section className="cms-warning cms-reveal" aria-label="Portfolio database usage warning">
        <AlertTriangle size={20} />
        <div>
          <strong>Preview only. Reload resets everything.</strong>
          <p>
            You can modify every portfolio section here, then click <b>Save Draft</b> to preview changes immediately.
            Drafts, uploaded photos, uploaded resumes, and URL changes last only until this page is reloaded. Before any reload, export or copy <b>portfolio-content.json</b>.
            For permanent use, clone the repo, replace <b>{databasePath}</b>, add real files when needed, and read this repository's README.md properly.
          </p>
        </div>
      </section>

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
              <span>{dirty ? "Save Draft" : hasPreviewDraft ? "Preview Saved" : "Save Draft"}</span>
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
              <dt>Draft lifetime</dt>
              <dd>Until reload</dd>
            </div>
            <div>
              <dt>Draft status</dt>
              <dd>{hasPreviewDraft ? `Saved ${formatSavedAt(draftSavedAt)}` : formatSavedAt(draftSavedAt)}</dd>
            </div>
          </dl>
        </aside>

        <section className="cms-editor-stack">
          <SectionCard title="Section Titles">
            <div className="cms-nav-list">
              {draftContent.sectionOrder.map((id) => {
                const section = draftContent.sections[id] ?? { title: id, eyebrow: "" };
                return (
                  <div className="cms-section-row" key={id}>
                    <span>{id}</span>
                    <Field label="Title" value={section.title} onChange={(value) => updateSectionMeta(id, "title", value)} />
                    <Field label="Eyebrow" value={section.eyebrow} onChange={(value) => updateSectionMeta(id, "eyebrow", value)} />
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Profile">
            <div className="cms-field-grid">
              {profileFields.map(([field, label]) => (
                <Field key={field} label={label} value={draftContent.profile[field]} onChange={(value) => updateProfile(field, value)} />
              ))}
            </div>
            <AssetField label="Portrait image URL (online image URL allowed)" value={draftContent.profile.portrait} onChange={(value) => updateProfile("portrait", value)} onStatus={setStatus} />
            <AssetField label="Resume URL (online resume URL allowed)" value={draftContent.profile.resume} onChange={(value) => updateProfile("resume", value)} onStatus={setStatus} kind="resume" />
          </SectionCard>

          <SectionCard title="Tree Navigation">
            <div className="cms-palette-viewer" aria-label="Current tree navigation color palette">
              {draftContent.treeNavItems.map((item) => (
                <button key={`palette-${item.id}`} type="button" onClick={() => setStatus({ type: "info", text: `${item.label} uses ${item.tint}` })} style={{ "--swatch": item.tint }} aria-label={`${item.label} color ${item.tint}`}>
                  <span />
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
            <div className="cms-nav-list">
              {draftContent.treeNavItems.map((item) => (
                <div className="cms-nav-row" key={item.id}>
                  <span style={{ "--leaf-tint": item.tint }}>{item.id}</span>
                  <Field label="Leaf label" value={item.label} onChange={(value) => updateNavItem(item.id, "label", value)} />
                  <div className="cms-color-control">
                    <div className="cms-color-inputs">
                      <input type="color" value={toHexColor(item.tint)} onChange={(event) => updateNavItem(item.id, "tint", event.target.value)} aria-label={`${item.id} color picker`} />
                      <input value={item.tint} onChange={(event) => updateNavItem(item.id, "tint", event.target.value)} aria-label={`${item.id} color hex`} />
                    </div>
                    <div className="cms-color-palette" aria-label={`${item.id} color palette`}>
                      {treeColorPalette.map((color) => (
                        <button key={`${item.id}-${color}`} type="button" className={(item.tint ?? "").toLowerCase() === color.toLowerCase() ? "is-active" : ""} onClick={() => updateNavItem(item.id, "tint", color)} style={{ "--swatch": color }} aria-label={`Use ${color} for ${item.id}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Myself Metrics" onAdd={() => updateTopLevelList("stats", [...(draftContent.stats ?? []), makeEmptyStat()], "Metric added")}>
            <div className="cms-list">
              {(draftContent.stats ?? []).map((stat, index) => (
                <div className="cms-list-row" key={`${stat.label}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{stat.label || `Metric ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateTopLevelList("stats", draftContent.stats.filter((_, itemIndex) => itemIndex !== index), "Metric removed")} aria-label={`Remove ${stat.label}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Label" value={stat.label} onChange={(value) => updateRecord("stats", index, "label", value, "Metric updated")} />
                    <Field label="Value" value={stat.value} onChange={(value) => updateRecord("stats", index, "value", value, "Metric updated")} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Objective">
            <div className="cms-field-grid is-single">
              <Field label="Headline" value={draftContent.objective.headline} onChange={(value) => updateTopLevelRecord("objective", "headline", value, "Objective updated")} textarea />
            </div>
            <TextListEditor label="Paragraphs" items={draftContent.objective.body} onChange={(value) => updateTopLevelRecord("objective", "body", value, "Objective paragraphs updated")} addLabel="Add paragraph" />
          </SectionCard>

          <SectionCard title="Who Am I">
            <div className="cms-field-grid is-single">
              <Field label="Headline" value={draftContent.whoAmI.headline} onChange={(value) => updateTopLevelRecord("whoAmI", "headline", value, "Who Am I updated")} textarea />
            </div>
            <TextListEditor label="Paragraphs" items={draftContent.whoAmI.paragraphs} onChange={(value) => updateTopLevelRecord("whoAmI", "paragraphs", value, "Who Am I paragraphs updated")} addLabel="Add paragraph" />
          </SectionCard>

          <SectionCard title="Experience" onAdd={() => updateTopLevelList("experiences", [...(draftContent.experiences ?? []), makeEmptyExperience()], "Experience added")}>
            <div className="cms-list">
              {(draftContent.experiences ?? []).map((job, index) => (
                <div className="cms-list-row" key={`${job.role}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{job.role || `Experience ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateTopLevelList("experiences", draftContent.experiences.filter((_, itemIndex) => itemIndex !== index), "Experience removed")} aria-label={`Remove ${job.role}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Role" value={job.role} onChange={(value) => updateRecord("experiences", index, "role", value, "Experience updated")} />
                    <Field label="Type" value={job.type} onChange={(value) => updateRecord("experiences", index, "type", value, "Experience updated")} />
                    <Field label="Organization" value={job.organization} onChange={(value) => updateRecord("experiences", index, "organization", value, "Experience updated")} />
                    <Field label="Location" value={job.location} onChange={(value) => updateRecord("experiences", index, "location", value, "Experience updated")} />
                    <Field label="Period" value={job.period} onChange={(value) => updateRecord("experiences", index, "period", value, "Experience updated")} />
                  </div>
                  <Field label="Summary" value={job.summary} textarea onChange={(value) => updateRecord("experiences", index, "summary", value, "Experience updated")} />
                  <TextListEditor label="Bullets" items={job.bullets} onChange={(value) => updateRecordList("experiences", index, "bullets", value, "Experience bullets updated")} addLabel="Add bullet" />
                  <TextListEditor label="Technologies" items={job.technologies} onChange={(value) => updateRecordList("experiences", index, "technologies", value, "Experience technologies updated")} addLabel="Add technology" />
                  <LinkListEditor label="Links" links={job.links} onChange={(value) => updateRecordList("experiences", index, "links", value, "Experience links updated")} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Education" onAdd={() => updateTopLevelList("education", [...(draftContent.education ?? []), makeEmptyEducation()], "Education added")}>
            <div className="cms-list">
              {(draftContent.education ?? []).map((item, index) => (
                <div className="cms-list-row" key={`${item.degree}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{item.degree || `Education ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateTopLevelList("education", draftContent.education.filter((_, itemIndex) => itemIndex !== index), "Education removed")} aria-label={`Remove ${item.degree}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Degree" value={item.degree} onChange={(value) => updateRecord("education", index, "degree", value, "Education updated")} />
                    <Field label="Institution" value={item.institution} onChange={(value) => updateRecord("education", index, "institution", value, "Education updated")} />
                    <Field label="Period" value={item.period} onChange={(value) => updateRecord("education", index, "period", value, "Education updated")} />
                    <Field label="Result" value={item.result} onChange={(value) => updateRecord("education", index, "result", value, "Education updated")} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Skills" onAdd={() => updateTopLevelList("skillGroups", [...(draftContent.skillGroups ?? []), makeEmptySkillGroup()], "Skill group added")}>
            <div className="cms-list">
              {(draftContent.skillGroups ?? []).map((group, index) => (
                <div className="cms-list-row" key={`${group.title}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{group.title || `Skill Group ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateTopLevelList("skillGroups", draftContent.skillGroups.filter((_, itemIndex) => itemIndex !== index), "Skill group removed")} aria-label={`Remove ${group.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Title" value={group.title} onChange={(value) => updateRecord("skillGroups", index, "title", value, "Skill group updated")} />
                    <Field label="Level" value={group.level} type="number" min="0" max="100" onChange={(value) => updateRecord("skillGroups", index, "level", value, "Skill group updated")} />
                  </div>
                  <TextListEditor label="Skills" items={group.items} onChange={(value) => updateRecordList("skillGroups", index, "items", value, "Skills updated")} addLabel="Add skill" />
                  <LinkListEditor label="Links" links={group.links} onChange={(value) => updateRecordList("skillGroups", index, "links", value, "Skill links updated")} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Research" onAdd={() => updateTopLevelList("research", [...(draftContent.research ?? []), makeEmptyResearch()], "Research added")}>
            <div className="cms-list">
              {(draftContent.research ?? []).map((item, index) => (
                <div className="cms-list-row" key={`${item.title}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{item.title || `Research ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateTopLevelList("research", draftContent.research.filter((_, itemIndex) => itemIndex !== index), "Research removed")} aria-label={`Remove ${item.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Title" value={item.title} onChange={(value) => updateRecord("research", index, "title", value, "Research updated")} />
                    <Field label="Period" value={item.period} onChange={(value) => updateRecord("research", index, "period", value, "Research updated")} />
                  </div>
                  <Field label="Description" value={item.description} textarea onChange={(value) => updateRecord("research", index, "description", value, "Research updated")} />
                  <TextListEditor label="Technologies" items={item.technologies} onChange={(value) => updateRecordList("research", index, "technologies", value, "Research technologies updated")} addLabel="Add technology" />
                  <LinkListEditor label="Links" links={item.links} onChange={(value) => updateRecordList("research", index, "links", value, "Research links updated")} />
                  <AssetField label="Research image URL (online image URL allowed)" value={item.image} onChange={(value) => updateRecord("research", index, "image", value, "Research image updated")} onStatus={setStatus} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Projects" onAdd={() => updateTopLevelList("projects", [makeEmptyProject(), ...(draftContent.projects ?? [])], "Project added")}>
            <div className="cms-list">
              {(draftContent.projects ?? []).map((project, index) => (
                <div className="cms-list-row" key={`${project.title}-${index}`}>
                  <div className="cms-row-header">
                    <strong>{project.title || `Project ${index + 1}`}</strong>
                    <button type="button" onClick={() => updateTopLevelList("projects", draftContent.projects.filter((_, itemIndex) => itemIndex !== index), "Project removed")} aria-label={`Remove ${project.title}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="cms-field-grid">
                    <Field label="Title" value={project.title} onChange={(value) => updateRecord("projects", index, "title", value, "Project updated")} />
                    <Field label="Category" value={project.category} onChange={(value) => updateRecord("projects", index, "category", value, "Project updated")} />
                    <Field label="URL" value={project.url} onChange={(value) => updateRecord("projects", index, "url", value, "Project updated")} />
                    <Field label="URL label" value={project.linkLabel ?? "Project link"} onChange={(value) => updateRecord("projects", index, "linkLabel", value, "Project updated")} />
                  </div>
                  <Field label="Description" value={project.description} textarea onChange={(value) => updateRecord("projects", index, "description", value, "Project updated")} />
                  <TextListEditor label="Bullets" items={project.bullets} onChange={(value) => updateRecordList("projects", index, "bullets", value, "Project bullets updated")} addLabel="Add bullet" />
                  <TextListEditor label="Technologies" items={project.technologies} onChange={(value) => updateRecordList("projects", index, "technologies", value, "Project technologies updated")} addLabel="Add technology" />
                  <LinkListEditor label="Links" links={project.links} onChange={(value) => updateRecordList("projects", index, "links", value, "Project links updated")} />
                  <AssetField label="Project image URL (online image URL allowed)" value={project.image} onChange={(value) => updateRecord("projects", index, "image", value, "Project image updated")} onStatus={setStatus} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Social Links">
            <LinkListEditor label="Social links" links={draftContent.socialLinks} onChange={(value) => updateTopLevelList("socialLinks", value, "Social links updated")} />
          </SectionCard>

          <SectionCard title="Full JSON">
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
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
