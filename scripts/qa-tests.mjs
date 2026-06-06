import assert from "node:assert/strict";
import { portfolioContent } from "../src/data/portfolio.js";
import { isCmsEnabled } from "../src/utils/cmsAccess.js";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_RESUME_UPLOAD_BYTES,
  hasDataUrls,
  isSafeUrl,
  sanitizeUrl,
  validateUploadFile,
} from "../src/utils/contentSecurity.js";
import { normalizePortfolioContent, preparePortfolioContent } from "../src/utils/portfolioContent.js";

function fileStub(overrides) {
  return {
    name: "file.png",
    type: "image/png",
    size: 1000,
    ...overrides,
  };
}

const testCases = [
  {
    id: "CMS-001",
    name: "CMS access is local-only unless explicitly enabled",
    run() {
      assert.equal(isCmsEnabled({ DEV: true }), true);
      assert.equal(isCmsEnabled({ DEV: false }), false);
      assert.equal(isCmsEnabled({ DEV: false, VITE_ENABLE_PUBLIC_CMS: "true" }), true);
    },
  },
  {
    id: "CMS-002",
    name: "Normalizer keeps required portfolio structure and removes project gallery fields",
    run() {
      const normalized = normalizePortfolioContent({
        ...portfolioContent,
        projects: [{ ...portfolioContent.projects[0], gallery: ["/unsafe-extra.jpg"] }],
      });

      assert.ok(Array.isArray(normalized.sectionOrder));
      assert.ok(normalized.sectionOrder.includes("showcase"));
      assert.equal("gallery" in normalized.projects[0], false);
      assert.equal(normalized.projects[0].linkLabel, "Project link");
    },
  },
  {
    id: "CMS-003",
    name: "Full JSON draft save path preserves valid JSON edits",
    run() {
      const jsonDraft = JSON.stringify({
        ...portfolioContent,
        profile: {
          ...portfolioContent.profile,
          name: "QA JSON Name",
        },
      });

      const prepared = preparePortfolioContent(JSON.parse(jsonDraft));
      assert.equal(prepared.profile.name, "QA JSON Name");
    },
  },
  {
    id: "SEC-001",
    name: "Unsafe URL schemes are blocked before save, copy, export, or render",
    run() {
      const prepared = preparePortfolioContent({
        ...portfolioContent,
        profile: {
          ...portfolioContent.profile,
          portrait: "javascript:alert(1)",
          resume: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        },
        socialLinks: [{ label: "Bad", url: "javascript:alert(1)" }],
        research: [{ ...portfolioContent.research[0], image: "data:image/svg+xml;base64,PHN2Zy8+" }],
        projects: [{ ...portfolioContent.projects[0], url: "vbscript:msgbox(1)", image: "javascript:alert(1)" }],
      });

      assert.equal(prepared.profile.portrait, "");
      assert.equal(prepared.profile.resume, "");
      assert.equal(prepared.socialLinks[0].url, "");
      assert.equal(prepared.research[0].image ?? "", "");
      assert.equal(prepared.projects[0].url, "");
      assert.equal(prepared.projects[0].image ?? "", "");
    },
  },
  {
    id: "SEC-002",
    name: "Safe URL policy allows expected portfolio URL types",
    run() {
      assert.equal(isSafeUrl("https://example.com/profile", "link"), true);
      assert.equal(isSafeUrl("mailto:test@example.com", "link"), true);
      assert.equal(isSafeUrl("tel:+8801700000000", "link"), true);
      assert.equal(isSafeUrl("/images/portfolio/demo.jpg", "image"), true);
      assert.equal(isSafeUrl("data:image/png;base64,aGVsbG8=", "image"), true);
      assert.equal(isSafeUrl("data:application/pdf;base64,aGVsbG8=", "resume"), true);
      assert.equal(sanitizeUrl("javascript:alert(1)", "link", "#"), "#");
    },
  },
  {
    id: "UPLOAD-001",
    name: "Image uploads are validated by MIME type and size",
    run() {
      assert.equal(validateUploadFile(fileStub({ type: "image/png" }), "image").valid, true);
      assert.equal(validateUploadFile(fileStub({ type: "image/svg+xml" }), "image").valid, false);
      assert.equal(validateUploadFile(fileStub({ type: "text/html" }), "image").valid, false);
      assert.equal(validateUploadFile(fileStub({ type: "image/jpeg", size: MAX_IMAGE_UPLOAD_BYTES + 1 }), "image").valid, false);
    },
  },
  {
    id: "UPLOAD-002",
    name: "Resume uploads are validated by type, extension, and size",
    run() {
      assert.equal(validateUploadFile(fileStub({ name: "resume.pdf", type: "application/pdf" }), "resume").valid, true);
      assert.equal(validateUploadFile(fileStub({ name: "resume.docx", type: "" }), "resume").valid, true);
      assert.equal(validateUploadFile(fileStub({ name: "resume.exe", type: "application/x-msdownload" }), "resume").valid, false);
      assert.equal(validateUploadFile(fileStub({ name: "resume.pdf", type: "application/pdf", size: MAX_RESUME_UPLOAD_BYTES + 1 }), "resume").valid, false);
    },
  },
  {
    id: "UPLOAD-003",
    name: "Data URL detection catches draft uploads before export/copy confirmation",
    run() {
      assert.equal(hasDataUrls({ profile: { portrait: "data:image/png;base64,aGVsbG8=" } }), true);
      assert.equal(hasDataUrls({ profile: { portrait: "/images/eesha.jpeg" } }), false);
    },
  },
  {
    id: "MEDIA-001",
    name: "Prepared JSON keeps valid online media and project links",
    run() {
      const prepared = preparePortfolioContent({
        ...portfolioContent,
        profile: {
          ...portfolioContent.profile,
          portrait: "https://cdn.example.com/photo.webp",
          resume: "https://cdn.example.com/resume.pdf",
        },
        projects: [{ ...portfolioContent.projects[0], url: "https://example.com/project", image: "https://cdn.example.com/project.jpg" }],
      });

      assert.equal(prepared.profile.portrait, "https://cdn.example.com/photo.webp");
      assert.equal(prepared.profile.resume, "https://cdn.example.com/resume.pdf");
      assert.equal(prepared.projects[0].url, "https://example.com/project");
      assert.equal(prepared.projects[0].image, "https://cdn.example.com/project.jpg");
    },
  },
];

let passed = 0;
let failed = 0;

console.log("Portfolio QA test cases");
console.log("=======================");

for (const testCase of testCases) {
  try {
    testCase.run();
    passed += 1;
    console.log(`PASS ${testCase.id} - ${testCase.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${testCase.id} - ${testCase.name}`);
    console.error(`     ${error.message}`);
  }
}

console.log("=======================");
console.log(`Result: ${passed} passed, ${failed} failed, ${testCases.length} total`);

if (failed > 0) {
  process.exitCode = 1;
}
