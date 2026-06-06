import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Database, Download, FileJson, GripVertical, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { normalizePortfolioContent, usePortfolioContent } from "../data/PortfolioContentContext.jsx";
import { hasDataUrls, validateUploadFile, validateUrl } from "../utils/contentSecurity.js";
import { safeImageSrc, safeResumeHref } from "../utils/assets.js";
import { preparePortfolioContent } from "../utils/portfolioContent.js";
import { reorderItems } from "../utils/reorder.js";

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

const editorTabs = [
  { id: "section-titles", label: "Section Titles" },
  { id: "profile", label: "Profile" },
  { id: "tree-navigation", label: "Tree Navigation" },
  { id: "myself-metrics", label: "Myself Metrics" },
  { id: "objective", label: "Objective" },
  { id: "who-am-i", label: "Who Am I" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "research", label: "Research" },
  { id: "projects", label: "Projects" },
  { id: "social-links", label: "Social Links" },
  { id: "full-json", label: "Full JSON" },
];

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

function prepareDraft(jsonDraft) {
  return preparePortfolioContent(JSON.parse(jsonDraft));
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

    const validation = validateUploadFile(file, kind);
    if (!validation.valid) {
      onStatus({ type: "error", text: validation.message });
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

  const handleUrlBlur = (event) => {
    const validation = validateUrl(event.target.value, kind);
    if (!validation.valid) {
      onStatus({ type: "error", text: validation.message });
    }
  };

  const previewUrl = isImage ? safeImageSrc(value) : safeResumeHref(value);

  return (
    <div className="cms-asset-field">
      <div className="cms-asset-row">
        <div className="cms-asset-control">
          {mode === "url" ? (
            <>
              <label className="cms-field">
                <span>{label}</span>
                <input
                  key={`${kind}-url`}
                  value={value ?? ""}
                  onBlur={handleUrlBlur}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder={isImage ? "https://example.com/image.jpg or /images/example.jpg" : "https://example.com/resume.pdf or /resume.pdf"}
                />
              </label>
              <button type="button" className="cms-switch-button" onClick={() => setMode("upload")}>
                {uploadLabel}
              </button>
            </>
          ) : (
            <>
              <label className="cms-field">
                <span>{isImage ? "Upload photo draft" : "Upload resume draft"} (Draft uploads reset on reload. For permanent use, clone the repo and follow README.md.)</span>
                <input key={`${kind}-upload`} type="file" accept={acceptedTypes} onChange={handleUpload} />
              </label>
              <button type="button" className="cms-switch-button" onClick={() => setMode("url")}>
                {urlLabel}
              </button>
            </>
          )}
        </div>
        <div className={`cms-asset-preview ${isImage ? "is-image" : "is-file"}`} aria-label={`${label} preview`}>
          {previewUrl ? (
            isImage ? (
              <img src={previewUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <a href={previewUrl} target="_blank" rel="noreferrer">
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
  const compact = label === "Skills" || label === "Technologies";

  return (
    <div className="cms-nested-editor">
      <div className="cms-nested-header">
        <span>{label}</span>
        <button type="button" onClick={() => onChange([...list, ""])}>
          <Plus size={15} />
          <span>{addLabel}</span>
        </button>
      </div>
      <div className={`cms-nested-list ${compact ? "is-compact" : ""}`}>
        {list.map((item, index) => (
          <div className={`cms-inline-row ${compact ? "is-compact" : ""}`} key={`${label}-${index}`}>
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

function SectionCard({ title, onAdd, addLabel = "Add", tabId, activeTab, children }) {
  const isTabbed = Boolean(tabId);
  const isActive = !isTabbed || activeTab === tabId;

  return (
    <article
      className={`cms-card cms-reveal ${isTabbed ? "cms-tab-panel" : ""} ${isActive ? "is-active" : ""}`}
      hidden={!isActive}
      id={isTabbed ? `cms-panel-${tabId}` : undefined}
      role={isTabbed ? "tabpanel" : undefined}
      aria-labelledby={isTabbed ? `cms-tab-${tabId}` : undefined}
    >
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

function SortableItemTabs({ collection, items = [], activeIndex, onActiveIndexChange, onReorder, getLabel, emptyLabel }) {
  const list = Array.isArray(items) ? items : [];
  const dragSourceRef = useRef(null);

  if (!list.length) {
    return (
      <div className="cms-item-tabs is-empty">
        <span>{emptyLabel}</span>
      </div>
    );
  }

  const safeActiveIndex = Math.min(Math.max(activeIndex ?? 0, 0), list.length - 1);

  return (
    <div className="cms-item-tabs" role="tablist" aria-label={`${collection} entries`}>
      {list.map((item, index) => {
        const label = getLabel(item, index) || `${collection} ${index + 1}`;
        const isActive = safeActiveIndex === index;

        return (
          <button
            key={`${collection}-${index}`}
            type="button"
            role="tab"
            draggable
            className={isActive ? "is-active" : ""}
            aria-selected={isActive}
            onClick={() => onActiveIndexChange(index)}
            onDragStart={(event) => {
              dragSourceRef.current = index;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(index));
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const rawIndex = event.dataTransfer.getData("text/plain");
              const fromIndex = Number(rawIndex || dragSourceRef.current);
              dragSourceRef.current = null;
              if (!Number.isInteger(fromIndex) || fromIndex === index) return;
              onReorder(fromIndex, index);
            }}
            onDragEnd={() => {
              dragSourceRef.current = null;
            }}
            title="Drag this tab to reorder"
          >
            <GripVertical size={14} aria-hidden="true" />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </button>
        );
      })}
    </div>
  );
}

export default function ContentManager() {
  const { content, databasePath, draftSavedAt, hasPreviewDraft, resetContent, source, updateContent } = usePortfolioContent();
  const [draftContent, setDraftContent] = useState(() => normalizePortfolioContent(content));
  const [jsonDraft, setJsonDraft] = useState(() => stringify(normalizePortfolioContent(content)));
  const [activeTab, setActiveTab] = useState(editorTabs[0].id);
  const [activeItemTabs, setActiveItemTabs] = useState({
    experiences: 0,
    education: 0,
    skillGroups: 0,
    research: 0,
    projects: 0,
  });
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

  useEffect(() => {
    const collections = ["experiences", "education", "skillGroups", "research", "projects"];
    setActiveItemTabs((current) => {
      let changed = false;
      const next = { ...current };

      collections.forEach((collection) => {
        const length = Array.isArray(draftContent[collection]) ? draftContent[collection].length : 0;
        const safeIndex = length ? Math.min(Math.max(current[collection] ?? 0, 0), length - 1) : 0;
        if (safeIndex !== current[collection]) {
          next[collection] = safeIndex;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [draftContent]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cms-reveal",
        { y: 18 },
        { y: 0, duration: 0.62, ease: "power3.out", stagger: 0.04 },
      );
    }, shellRef);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cms-tab-panel.is-active",
        { y: 14 },
        { y: 0, duration: 0.36, ease: "power2.out" },
      );
    }, shellRef);

    return () => ctx.revert();
  }, [activeTab]);

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

  const setActiveItemTab = (collection, index) => {
    setActiveItemTabs((current) => ({ ...current, [collection]: index }));
  };

  const addCollectionItem = (collection, item, message, placement = "end") => {
    const currentList = Array.isArray(draftContent[collection]) ? draftContent[collection] : [];
    const nextList = placement === "start" ? [item, ...currentList] : [...currentList, item];
    const nextIndex = placement === "start" ? 0 : nextList.length - 1;

    updateTopLevelList(collection, nextList, message);
    setActiveItemTab(collection, nextIndex);
  };

  const removeCollectionItem = (collection, index, message) => {
    const currentList = Array.isArray(draftContent[collection]) ? draftContent[collection] : [];
    const nextList = currentList.filter((_, itemIndex) => itemIndex !== index);

    updateTopLevelList(collection, nextList, message);
    setActiveItemTab(collection, Math.min(index, Math.max(nextList.length - 1, 0)));
  };

  const reorderCollectionItems = (collection, fromIndex, toIndex, message) => {
    const currentList = Array.isArray(draftContent[collection]) ? draftContent[collection] : [];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentList.length || toIndex >= currentList.length) return;

    updateTopLevelList(collection, reorderItems(currentList, fromIndex, toIndex), message);
    setActiveItemTab(collection, toIndex);
  };

  const handleSave = () => {
    try {
      const parsed = prepareDraft(jsonDraft);
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
      const parsed = prepareDraft(jsonDraft);
      if (hasDataUrls(parsed) && !window.confirm("This JSON contains uploaded draft files as base64 data URLs. Export only if you are comfortable storing those files in the JSON.")) return;
      downloadJson(parsed);
      setJsonDraft(stringify(parsed));
      setStatus({ type: "success", text: "Exported portfolio-content.json" });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    }
  };

  const handleCopy = async () => {
    try {
      const parsed = prepareDraft(jsonDraft);
      if (hasDataUrls(parsed) && !window.confirm("This JSON contains uploaded draft files as base64 data URLs. Copy only if you are comfortable storing those files in the JSON.")) return;
      const preparedJson = stringify(parsed);
      await navigator.clipboard.writeText(`${preparedJson}\n`);
      setDraftContent(parsed);
      setJsonDraft(preparedJson);
      setStatus({ type: "success", text: "JSON copied" });
    } catch (error) {
      setStatus({ type: "error", text: error.message });
    }
  };

  const handleImport = async (event) => {
    const [file] = event.target.files ?? [];
    if (!file) return;

    try {
      const parsed = preparePortfolioContent(JSON.parse(await file.text()));
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

  const handleJsonDraftChange = (event) => {
    const nextJson = event.target.value;
    setJsonDraft(nextJson);
    setDirty(true);

    try {
      const parsed = parseDraft(nextJson);
      setDraftContent(parsed);
      setStatus({ type: "info", text: "JSON draft is valid. Save Draft to preview." });
    } catch {
      setStatus({ type: "info", text: "Editing JSON draft. Fix syntax before saving." });
    }
  };

  useEffect(() => {
    const shouldWarn = dirty || hasPreviewDraft;
    if (!shouldWarn) return undefined;

    const warnBeforeReload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeReload);
    return () => window.removeEventListener("beforeunload", warnBeforeReload);
  }, [dirty, hasPreviewDraft]);

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
          <nav className="cms-tabs cms-reveal" aria-label="Portfolio database sections" role="tablist">
            {editorTabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                id={`cms-tab-${tab.id}`}
                role="tab"
                className={activeTab === tab.id ? "is-active" : ""}
                aria-selected={activeTab === tab.id}
                aria-controls={`cms-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{tab.label}</strong>
              </button>
            ))}
          </nav>

          <SectionCard title="Section Titles" tabId="section-titles" activeTab={activeTab}>
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

          <SectionCard title="Profile" tabId="profile" activeTab={activeTab}>
            <div className="cms-field-grid">
              {profileFields.map(([field, label]) => (
                <Field key={field} label={label} value={draftContent.profile[field]} onChange={(value) => updateProfile(field, value)} />
              ))}
            </div>
            <AssetField label="Portrait image URL (online image URL allowed)" value={draftContent.profile.portrait} onChange={(value) => updateProfile("portrait", value)} onStatus={setStatus} />
            <AssetField label="Resume URL (online resume URL allowed)" value={draftContent.profile.resume} onChange={(value) => updateProfile("resume", value)} onStatus={setStatus} kind="resume" />
          </SectionCard>

          <SectionCard title="Tree Navigation" tabId="tree-navigation" activeTab={activeTab}>
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

          <SectionCard title="Myself Metrics" tabId="myself-metrics" activeTab={activeTab} onAdd={() => updateTopLevelList("stats", [...(draftContent.stats ?? []), makeEmptyStat()], "Metric added")}>
            <div className="cms-list">
              {(draftContent.stats ?? []).map((stat, index) => (
                <div className="cms-list-row" key={`metric-${index}`}>
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

          <SectionCard title="Objective" tabId="objective" activeTab={activeTab}>
            <div className="cms-field-grid is-single">
              <Field label="Headline" value={draftContent.objective.headline} onChange={(value) => updateTopLevelRecord("objective", "headline", value, "Objective updated")} textarea />
            </div>
            <TextListEditor label="Paragraphs" items={draftContent.objective.body} onChange={(value) => updateTopLevelRecord("objective", "body", value, "Objective paragraphs updated")} addLabel="Add paragraph" />
          </SectionCard>

          <SectionCard title="Who Am I" tabId="who-am-i" activeTab={activeTab}>
            <div className="cms-field-grid is-single">
              <Field label="Headline" value={draftContent.whoAmI.headline} onChange={(value) => updateTopLevelRecord("whoAmI", "headline", value, "Who Am I updated")} textarea />
            </div>
            <TextListEditor label="Paragraphs" items={draftContent.whoAmI.paragraphs} onChange={(value) => updateTopLevelRecord("whoAmI", "paragraphs", value, "Who Am I paragraphs updated")} addLabel="Add paragraph" />
          </SectionCard>

          <SectionCard title="Experience" tabId="experience" activeTab={activeTab} onAdd={() => addCollectionItem("experiences", makeEmptyExperience(), "Experience added")}>
            {(() => {
              const jobs = draftContent.experiences ?? [];
              const activeIndex = Math.min(activeItemTabs.experiences ?? 0, Math.max(jobs.length - 1, 0));
              const job = jobs[activeIndex];

              return (
                <>
                  <SortableItemTabs
                    collection="Experience"
                    items={jobs}
                    activeIndex={activeIndex}
                    onActiveIndexChange={(index) => setActiveItemTab("experiences", index)}
                    onReorder={(fromIndex, toIndex) => reorderCollectionItems("experiences", fromIndex, toIndex, "Experience reordered")}
                    getLabel={(item, index) => item.role || `Experience ${index + 1}`}
                    emptyLabel="No experience entries yet."
                  />
                  {job ? (
                    <div className="cms-list">
                      <div className="cms-list-row" key={`experience-editor-${activeIndex}`}>
                        <div className="cms-row-header">
                          <strong>{job.role || `Experience ${activeIndex + 1}`}</strong>
                          <button type="button" onClick={() => removeCollectionItem("experiences", activeIndex, "Experience removed")} aria-label={`Remove ${job.role}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="cms-field-grid">
                          <Field label="Role" value={job.role} onChange={(value) => updateRecord("experiences", activeIndex, "role", value, "Experience updated")} />
                          <Field label="Type" value={job.type} onChange={(value) => updateRecord("experiences", activeIndex, "type", value, "Experience updated")} />
                          <Field label="Organization" value={job.organization} onChange={(value) => updateRecord("experiences", activeIndex, "organization", value, "Experience updated")} />
                          <Field label="Location" value={job.location} onChange={(value) => updateRecord("experiences", activeIndex, "location", value, "Experience updated")} />
                          <Field label="Period" value={job.period} onChange={(value) => updateRecord("experiences", activeIndex, "period", value, "Experience updated")} />
                        </div>
                        <Field label="Summary" value={job.summary} textarea onChange={(value) => updateRecord("experiences", activeIndex, "summary", value, "Experience updated")} />
                        <TextListEditor label="Bullets" items={job.bullets} onChange={(value) => updateRecordList("experiences", activeIndex, "bullets", value, "Experience bullets updated")} addLabel="Add bullet" />
                        <TextListEditor label="Technologies" items={job.technologies} onChange={(value) => updateRecordList("experiences", activeIndex, "technologies", value, "Experience technologies updated")} addLabel="Add technology" />
                        <LinkListEditor label="Links" links={job.links} onChange={(value) => updateRecordList("experiences", activeIndex, "links", value, "Experience links updated")} />
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </SectionCard>

          <SectionCard title="Education" tabId="education" activeTab={activeTab} onAdd={() => addCollectionItem("education", makeEmptyEducation(), "Education added")}>
            {(() => {
              const educationItems = draftContent.education ?? [];
              const activeIndex = Math.min(activeItemTabs.education ?? 0, Math.max(educationItems.length - 1, 0));
              const item = educationItems[activeIndex];

              return (
                <>
                  <SortableItemTabs
                    collection="Education"
                    items={educationItems}
                    activeIndex={activeIndex}
                    onActiveIndexChange={(index) => setActiveItemTab("education", index)}
                    onReorder={(fromIndex, toIndex) => reorderCollectionItems("education", fromIndex, toIndex, "Education reordered")}
                    getLabel={(entry, index) => entry.degree || `Education ${index + 1}`}
                    emptyLabel="No education entries yet."
                  />
                  {item ? (
                    <div className="cms-list">
                      <div className="cms-list-row" key={`education-editor-${activeIndex}`}>
                        <div className="cms-row-header">
                          <strong>{item.degree || `Education ${activeIndex + 1}`}</strong>
                          <button type="button" onClick={() => removeCollectionItem("education", activeIndex, "Education removed")} aria-label={`Remove ${item.degree}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="cms-field-grid">
                          <Field label="Degree" value={item.degree} onChange={(value) => updateRecord("education", activeIndex, "degree", value, "Education updated")} />
                          <Field label="Institution" value={item.institution} onChange={(value) => updateRecord("education", activeIndex, "institution", value, "Education updated")} />
                          <Field label="Period" value={item.period} onChange={(value) => updateRecord("education", activeIndex, "period", value, "Education updated")} />
                          <Field label="Result" value={item.result} onChange={(value) => updateRecord("education", activeIndex, "result", value, "Education updated")} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </SectionCard>

          <SectionCard title="Skills" tabId="skills" activeTab={activeTab} onAdd={() => addCollectionItem("skillGroups", makeEmptySkillGroup(), "Skill group added")}>
            {(() => {
              const skillGroups = draftContent.skillGroups ?? [];
              const activeIndex = Math.min(activeItemTabs.skillGroups ?? 0, Math.max(skillGroups.length - 1, 0));
              const group = skillGroups[activeIndex];

              return (
                <>
                  <SortableItemTabs
                    collection="Skills"
                    items={skillGroups}
                    activeIndex={activeIndex}
                    onActiveIndexChange={(index) => setActiveItemTab("skillGroups", index)}
                    onReorder={(fromIndex, toIndex) => reorderCollectionItems("skillGroups", fromIndex, toIndex, "Skill groups reordered")}
                    getLabel={(entry, index) => entry.title || `Skill Group ${index + 1}`}
                    emptyLabel="No skill groups yet."
                  />
                  {group ? (
                    <div className="cms-list">
                      <div className="cms-list-row" key={`skills-editor-${activeIndex}`}>
                        <div className="cms-row-header">
                          <strong>{group.title || `Skill Group ${activeIndex + 1}`}</strong>
                          <button type="button" onClick={() => removeCollectionItem("skillGroups", activeIndex, "Skill group removed")} aria-label={`Remove ${group.title}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="cms-field-grid">
                          <Field label="Title" value={group.title} onChange={(value) => updateRecord("skillGroups", activeIndex, "title", value, "Skill group updated")} />
                          <Field label="Level" value={group.level} type="number" min="0" max="100" onChange={(value) => updateRecord("skillGroups", activeIndex, "level", value, "Skill group updated")} />
                        </div>
                        <TextListEditor label="Skills" items={group.items} onChange={(value) => updateRecordList("skillGroups", activeIndex, "items", value, "Skills updated")} addLabel="Add skill" />
                        <LinkListEditor label="Links" links={group.links} onChange={(value) => updateRecordList("skillGroups", activeIndex, "links", value, "Skill links updated")} />
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </SectionCard>

          <SectionCard title="Research" tabId="research" activeTab={activeTab} onAdd={() => addCollectionItem("research", makeEmptyResearch(), "Research added")}>
            {(() => {
              const researchItems = draftContent.research ?? [];
              const activeIndex = Math.min(activeItemTabs.research ?? 0, Math.max(researchItems.length - 1, 0));
              const item = researchItems[activeIndex];

              return (
                <>
                  <SortableItemTabs
                    collection="Research"
                    items={researchItems}
                    activeIndex={activeIndex}
                    onActiveIndexChange={(index) => setActiveItemTab("research", index)}
                    onReorder={(fromIndex, toIndex) => reorderCollectionItems("research", fromIndex, toIndex, "Research reordered")}
                    getLabel={(entry, index) => entry.title || `Research ${index + 1}`}
                    emptyLabel="No research entries yet."
                  />
                  {item ? (
                    <div className="cms-list">
                      <div className="cms-list-row" key={`research-editor-${activeIndex}`}>
                        <div className="cms-row-header">
                          <strong>{item.title || `Research ${activeIndex + 1}`}</strong>
                          <button type="button" onClick={() => removeCollectionItem("research", activeIndex, "Research removed")} aria-label={`Remove ${item.title}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="cms-field-grid">
                          <Field label="Title" value={item.title} onChange={(value) => updateRecord("research", activeIndex, "title", value, "Research updated")} />
                          <Field label="Period" value={item.period} onChange={(value) => updateRecord("research", activeIndex, "period", value, "Research updated")} />
                        </div>
                        <Field label="Description" value={item.description} textarea onChange={(value) => updateRecord("research", activeIndex, "description", value, "Research updated")} />
                        <TextListEditor label="Technologies" items={item.technologies} onChange={(value) => updateRecordList("research", activeIndex, "technologies", value, "Research technologies updated")} addLabel="Add technology" />
                        <LinkListEditor label="Links" links={item.links} onChange={(value) => updateRecordList("research", activeIndex, "links", value, "Research links updated")} />
                        <AssetField label="Research image URL (online image URL allowed)" value={item.image} onChange={(value) => updateRecord("research", activeIndex, "image", value, "Research image updated")} onStatus={setStatus} />
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </SectionCard>

          <SectionCard title="Projects" tabId="projects" activeTab={activeTab} onAdd={() => addCollectionItem("projects", makeEmptyProject(), "Project added", "start")}>
            {(() => {
              const projects = draftContent.projects ?? [];
              const activeIndex = Math.min(activeItemTabs.projects ?? 0, Math.max(projects.length - 1, 0));
              const project = projects[activeIndex];

              return (
                <>
                  <SortableItemTabs
                    collection="Projects"
                    items={projects}
                    activeIndex={activeIndex}
                    onActiveIndexChange={(index) => setActiveItemTab("projects", index)}
                    onReorder={(fromIndex, toIndex) => reorderCollectionItems("projects", fromIndex, toIndex, "Projects reordered")}
                    getLabel={(entry, index) => entry.title || `Project ${index + 1}`}
                    emptyLabel="No projects yet."
                  />
                  {project ? (
                    <div className="cms-list">
                      <div className="cms-list-row" key={`project-editor-${activeIndex}`}>
                        <div className="cms-row-header">
                          <strong>{project.title || `Project ${activeIndex + 1}`}</strong>
                          <button type="button" onClick={() => removeCollectionItem("projects", activeIndex, "Project removed")} aria-label={`Remove ${project.title}`}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="cms-field-grid">
                          <Field label="Title" value={project.title} onChange={(value) => updateRecord("projects", activeIndex, "title", value, "Project updated")} />
                          <Field label="Category" value={project.category} onChange={(value) => updateRecord("projects", activeIndex, "category", value, "Project updated")} />
                          <Field label="URL" value={project.url} onChange={(value) => updateRecord("projects", activeIndex, "url", value, "Project updated")} />
                          <Field label="URL label" value={project.linkLabel ?? "Project link"} onChange={(value) => updateRecord("projects", activeIndex, "linkLabel", value, "Project updated")} />
                        </div>
                        <Field label="Description" value={project.description} textarea onChange={(value) => updateRecord("projects", activeIndex, "description", value, "Project updated")} />
                        <TextListEditor label="Bullets" items={project.bullets} onChange={(value) => updateRecordList("projects", activeIndex, "bullets", value, "Project bullets updated")} addLabel="Add bullet" />
                        <TextListEditor label="Technologies" items={project.technologies} onChange={(value) => updateRecordList("projects", activeIndex, "technologies", value, "Project technologies updated")} addLabel="Add technology" />
                        <LinkListEditor label="Links" links={project.links} onChange={(value) => updateRecordList("projects", activeIndex, "links", value, "Project links updated")} />
                        <AssetField label="Project image URL (online image URL allowed)" value={project.image} onChange={(value) => updateRecord("projects", activeIndex, "image", value, "Project image updated")} onStatus={setStatus} />
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </SectionCard>

          <SectionCard title="Social Links" tabId="social-links" activeTab={activeTab}>
            <LinkListEditor label="Social links" links={draftContent.socialLinks} onChange={(value) => updateTopLevelList("socialLinks", value, "Social links updated")} />
          </SectionCard>

          <SectionCard title="Full JSON" tabId="full-json" activeTab={activeTab}>
            <textarea
              className="cms-json"
              value={jsonDraft}
              spellCheck="false"
              onChange={(event) => {
                handleJsonDraftChange(event);
              }}
              aria-label="Portfolio content JSON"
            />
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
