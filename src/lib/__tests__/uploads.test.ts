import { describe, it, expect } from "vitest";
import { validateUpload, formatBytes, acceptAttr, UPLOAD_LIMITS } from "../uploads";

const MB = 1024 * 1024;

describe("validateUpload", () => {
  it("accepts an in-limit image for an images-only bucket", () => {
    expect(validateUpload({ size: 2 * MB, type: "image/png" }, "inspection-reports")).toBeNull();
  });

  it("rejects an oversize file with a friendly message naming both sizes", () => {
    const msg = validateUpload({ size: 12 * MB, type: "image/jpeg" }, "inspection-reports");
    expect(msg).toBe("That file is 12 MB. The maximum is 10 MB.");
  });

  it("rejects a PDF in an images-only bucket", () => {
    const msg = validateUpload({ size: 1 * MB, type: "application/pdf" }, "inspection-reports");
    expect(msg).toBe("That file type isn't allowed here — please upload images.");
  });

  it("accepts a PDF in an images+PDF bucket", () => {
    expect(validateUpload({ size: 1 * MB, type: "application/pdf" }, "tenant-documents")).toBeNull();
  });

  it("rejects a non-image/non-PDF (e.g. an executable) with the type message", () => {
    const msg = validateUpload({ size: 10, type: "application/x-msdownload" }, "tenant-documents");
    expect(msg).toBe("That file type isn't allowed here — please upload images or PDFs.");
  });

  it("allows an empty MIME type through to the server gate rather than false-blocking", () => {
    expect(validateUpload({ size: 1 * MB, type: "" }, "inspection-reports")).toBeNull();
  });

  it("has no client-side opinion on an unknown bucket", () => {
    expect(validateUpload({ size: 999 * MB, type: "application/zip" }, "not-a-bucket")).toBeNull();
  });

  it("treats the size limit as inclusive (exactly at the cap is fine)", () => {
    expect(validateUpload({ size: 10 * MB, type: "image/png" }, "inspection-reports")).toBeNull();
    expect(validateUpload({ size: 10 * MB + 1, type: "image/png" }, "inspection-reports")).not.toBeNull();
  });

  it("a file just over a whole-MB cap reads strictly larger than the cap (not '15 MB vs 15 MB')", () => {
    const msg = validateUpload({ size: 15 * MB + 1, type: "image/png" }, "tenant-documents");
    expect(msg).toBe("That file is 15.1 MB. The maximum is 15 MB.");
  });
});

describe("formatBytes", () => {
  it("renders whole and fractional MB, and KB below 1 MB", () => {
    expect(formatBytes(15 * MB)).toBe("15 MB");
    expect(formatBytes(Math.round(1.5 * MB))).toBe("1.5 MB");
    expect(formatBytes(200 * 1024)).toBe("200 KB");
  });
  it("rolls a size just under 1 MB up to '1.0 MB' rather than '1024 KB'", () => {
    expect(formatBytes(MB - 1)).toBe("1.0 MB");
  });
});

describe("acceptAttr", () => {
  it("joins the bucket's accept patterns for an <input accept> attribute", () => {
    expect(acceptAttr("tenant-documents")).toBe("image/*,application/pdf");
    expect(acceptAttr("property-photos")).toBe("image/*");
  });
  it("returns an empty string for an unknown bucket", () => {
    expect(acceptAttr("nope")).toBe("");
  });
});

describe("UPLOAD_LIMITS", () => {
  it("covers every private bucket the app uploads to", () => {
    for (const b of [
      "renovation-receipts",
      "tenant-documents",
      "compliance-certificates",
      "inspection-reports",
      "maintenance-photos",
      "property-photos",
      "tenant-resources",
    ]) {
      expect(UPLOAD_LIMITS[b]).toBeTruthy();
    }
  });
});
