import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { portfolioContent as fallbackContent } from "./portfolio.js";

export const PORTFOLIO_STORAGE_KEY = "treePortfolio.content.v1";
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

  return {
    ...merged,
    sections,
    sectionOrder: sectionOrder.length ? sectionOrder : fallbackContent.sectionOrder,
    treeNavItems: treeNavItems.length ? treeNavItems : fallbackContent.treeNavItems,
  };
}

function readLocalDatabase() {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Unable to read portfolio database from localStorage.", error);
    return null;
  }
}

function writeLocalDatabase(content) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(content));
}

function clearLocalDatabase() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
}

export function PortfolioContentProvider({ children }) {
  const [databaseContent, setDatabaseContent] = useState(() => normalizePortfolioContent(fallbackContent));
  const [content, setContent] = useState(() => normalizePortfolioContent(readLocalDatabase() ?? fallbackContent));
  const [source, setSource] = useState(() => (readLocalDatabase() ? "browser database" : "default module"));
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

      const localDatabase = readLocalDatabase();
      const nextContent = normalizePortfolioContent(localDatabase ?? nextDatabase);

      if (!mounted) return;
      setDatabaseContent(nextDatabase);
      setContent(nextContent);
      setSource(localDatabase ? "browser database" : nextSource);
      setReady(true);
    }

    loadDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  const updateContent = useCallback((nextContent) => {
    setContent((current) => {
      const resolved = typeof nextContent === "function" ? nextContent(current) : nextContent;
      const normalized = normalizePortfolioContent(resolved);
      writeLocalDatabase(normalized);
      setSource("browser database");
      return normalized;
    });
  }, []);

  const resetContent = useCallback(() => {
    clearLocalDatabase();
    setContent(normalizePortfolioContent(databaseContent));
    setSource("json database");
  }, [databaseContent]);

  const value = useMemo(
    () => ({
      content,
      databaseContent,
      ready,
      source,
      storageKey: PORTFOLIO_STORAGE_KEY,
      databasePath: CONTENT_DATABASE_PATH,
      updateContent,
      resetContent,
    }),
    [content, databaseContent, ready, resetContent, source, updateContent],
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
