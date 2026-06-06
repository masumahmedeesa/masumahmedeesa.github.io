import { portfolioContent as fallbackContent } from "../data/portfolio.js";
import { sanitizeUrl } from "./contentSecurity.js";

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

function sanitizeLinks(links) {
  return Array.isArray(links)
    ? links.map((link) => ({
        ...link,
        url: sanitizeUrl(link?.url, "link"),
      }))
    : links;
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
        return { ...projectWithoutGallery, linkLabel: projectWithoutGallery.linkLabel ?? "Project link" };
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

export function preparePortfolioContent(content) {
  const normalized = normalizePortfolioContent(content);

  return {
    ...normalized,
    profile: {
      ...normalized.profile,
      portrait: sanitizeUrl(normalized.profile?.portrait, "image"),
      resume: sanitizeUrl(normalized.profile?.resume, "resume"),
    },
    socialLinks: sanitizeLinks(normalized.socialLinks),
    experiences: (normalized.experiences ?? []).map((job) => ({
      ...job,
      links: sanitizeLinks(job.links),
    })),
    skillGroups: (normalized.skillGroups ?? []).map((group) => ({
      ...group,
      links: sanitizeLinks(group.links),
    })),
    research: (normalized.research ?? []).map((item) => {
      const image = sanitizeUrl(item.image, "image");
      return {
        ...item,
        image: image || undefined,
        links: sanitizeLinks(item.links),
      };
    }),
    projects: (normalized.projects ?? []).map((project) => {
      const image = sanitizeUrl(project.image, "image");
      return {
        ...project,
        image: image || undefined,
        url: sanitizeUrl(project.url, "link"),
        links: sanitizeLinks(project.links),
      };
    }),
  };
}
