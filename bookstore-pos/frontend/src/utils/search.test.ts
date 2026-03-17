import { describe, expect, it } from "vitest";
import { normalizeSearchText, runSmartSearch } from "@/utils/search";

describe("runSmartSearch", () => {
  it("normalizes accents and whitespace", () => {
    expect(normalizeSearchText("  Lápiz   HB  ")).toBe("lapiz hb");
  });

  it("prioritizes exact code matches over loose text matches", () => {
    const result = runSmartSearch(
      [
        { id: 1, sku: "BK-100", name: "Cuaderno cuadriculado" },
        { id: 2, sku: "BK-1000", name: "Lapiz grafito" },
      ],
      "BK-100",
      {
        fields: [
          { key: "sku", weight: 100, type: "code", getValue: (item) => item.sku },
          { key: "name", weight: 60, getValue: (item) => item.name },
        ],
      }
    );

    expect(result.items[0]?.item.id).toBe(1);
    expect(result.items[0]?.primaryMatch?.field).toBe("sku");
  });

  it("offers a corrected query when a known token is misspelled", () => {
    const result = runSmartSearch(
      [],
      "cuadernoo",
      {
        fields: [],
        synonymGroups: [["cuaderno", "cuadernos", "libreta"]],
        hints: ["cuaderno"],
      }
    );

    expect(result.correctedQuery).toBe("cuaderno");
  });

  it("can surface related matches from synonym groups", () => {
    const result = runSmartSearch(
      [{ id: 1, name: "Folder plastico" }],
      "carpeta",
      {
        fields: [{ key: "name", weight: 90, getValue: (item) => item.name }],
        synonymGroups: [["folder", "carpeta", "archivador"]],
        allowRelatedMatches: true,
      }
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isRelated).toBe(true);
  });
});
