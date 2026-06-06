import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { portfolioContent as fallbackContent } from "./portfolio.js";

export const CONTENT_DATABASE_PATH = "content/portfolio-content.json";

const PortfolioContentContext = createContext(null);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeContent(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (!isRecord(base)) return override ?? base;

  const merged = { ...base };
  if (!isRecord(override)) return merged;

  Object.entries(override).forEach(([key, value]) => {
    merged[key] = key in base ? mergeContent(base[key], value) : value;
  });

  return merged;
}

export function normalizePortfolioContent(content) {
  const merged = mergeContent(deepClone(fallbackContent), content ?? {});
  const sections = isRecord(merged.sections) ? merged.sections : fallbackContent.sections;

  const sectionOrder = Array.isArray(merged.sectionOrder)
    ? merged.sectionOrder.filter((id) => typeof id === "string" && sections[id])
    : fallbackContent.sectionOrder;

  const treeNavItems = Array.isArray(merged.treeNavItems)
    ? merged.treeNavItems.filter((item) => item?.id && Array.isArray(item.position) && item.position.length >= 3)
    : fallbackContent.treeNavItems;

  const projects = Array.isArray(merged.projects)
    ? merged.projects.map((project) => {
        const { gallery, ...projectWithoutGallery } = isRecord(project) ? project : {};
        return { linkLabel: "Project link", ...projectWithoutGallery };
      })
    : fallbackContent.projects;

  return {
    ...merged,
    sections,
    sectionOrder: sectionOrder.length ? sectionOrder : fallbackContent.sectionOrder,
    treeNavItems: treeNavItems.length ? treeNavItems : fallbackContent.treeNavItems,
    projects,
  };
}

export function PortfolioContentProvider({ children }) {
  const [databaseContent, setDatabaseContent] = useState(() => normalizePortfolioContent(fallbackContent));
  const [content, setContent] = useState(() => normalizePortfolioContent(fallbackContent));
  const [source, setSource] = useState("default module");
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [hasPreviewDraft, setHasPreviewDraft] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDatabase() {
      let nextDatabase = normalizePortfolioContent(fallbackContent);
      let nextSource = "default module";

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${CONTENT_DATABASE_PATH}`, { cache: "no-store" });
        if (response.ok) {
          nextDatabase = normalizePortfolioContent(await response.json());
          nextSource = "json database";
        }
      } catch (error) {
        console.warn("Unable to load portfolio JSON database. Falling back to module content.", error);
      }

      const nextContent = normalizePortfolioContent(nextDatabase);

      if (!mounted) return;
      setDatabaseContent(nextDatabase);
      setContent(nextContent);
      setSource(nextSource);
      setDraftSavedAt(null);
      setHasPreviewDraft(false);
      setReady(true);
    }

    loadDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  const updateContent = useCallback((nextContent) => {
    if (typeof nextContent !== "function") {
      const normalized = normalizePortfolioContent(nextContent);
      setContent(normalized);
      setSource("preview draft");
      setDraftSavedAt(new Date().toISOString());
      setHasPreviewDraft(true);
      return;
    }

    setContent((current) => {
      const resolved = nextContent(current);
      const normalized = normalizePortfolioContent(resolved);
      setSource("preview draft");
      setDraftSavedAt(new Date().toISOString());
      setHasPreviewDraft(true);
      return normalized;
    });
  }, []);

  const resetContent = useCallback(() => {
    setContent(normalizePortfolioContent(databaseContent));
    setSource("json database");
    setDraftSavedAt(null);
    setHasPreviewDraft(false);
  }, [databaseContent]);

  const value = useMemo(
    () => ({
      content,
      databaseContent,
      draftSavedAt,
      hasPreviewDraft,
      ready,
      source,
      databasePath: CONTENT_DATABASE_PATH,
      updateContent,
      resetContent,
    }),
    [content, databaseContent, draftSavedAt, hasPreviewDraft, ready, resetContent, source, updateContent],
  );

  return <PortfolioContentContext.Provider value={value}>{children}</PortfolioContentContext.Provider>;
}

export function usePortfolioContent() {
  const context = useContext(PortfolioContentContext);

  if (!context) {
    throw new Error("usePortfolioContent must be used inside PortfolioContentProvider.");
  }

  return context;
}
