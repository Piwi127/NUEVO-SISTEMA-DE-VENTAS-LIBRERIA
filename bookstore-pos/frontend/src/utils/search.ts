type SearchValue = string | number | boolean | null | undefined;

export type SearchMatchKind = "exact" | "phrase" | "prefix" | "word" | "contains" | "fuzzy" | "related";

export type SearchFieldConfig<T> = {
  key: string;
  weight: number;
  type?: "text" | "code";
  getValue: (item: T) => SearchValue | SearchValue[];
};

export type RankedSearchItem<T> = {
  item: T;
  score: number;
  matchedTokens: string[];
  matchedRelatedTokens: string[];
  matchedFields: string[];
  directHits: number;
  fuzzyHits: number;
  relatedHits: number;
  isRelated: boolean;
  primaryMatch: {
    field: string;
    kind: SearchMatchKind;
    score: number;
  } | null;
};

export type RankedSearchResult<T> = {
  items: RankedSearchItem<T>[];
  normalizedQuery: string;
  correctedQuery: string | null;
  canSearch: boolean;
  tokens: string[];
  expandedTokens: string[];
  suggestions: string[];
  total: number;
};

export type SmartSearchOptions<T> = {
  fields: SearchFieldConfig<T>[];
  synonymGroups?: readonly (readonly string[])[];
  stopWords?: Iterable<string>;
  hints?: string[];
  minTokenLength?: number;
  allowRelatedMatches?: boolean;
  boost?: (item: T) => number;
  getCorrectionTerms?: (items: T[]) => SearchValue[];
  sortComparator?: (left: RankedSearchItem<T>, right: RankedSearchItem<T>) => number;
};

type PreparedFieldValue<T> = {
  field: SearchFieldConfig<T>;
  normalized: string;
  compact: string;
  tokens: string[];
};

type SearchHit = {
  score: number;
  kind: SearchMatchKind;
};

const DEFAULT_STOP_WORDS = new Set(["a", "al", "con", "de", "del", "el", "en", "la", "las", "los", "para", "por", "un", "una", "y"]);

const toArray = <T,>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

export const normalizeSearchText = (value: SearchValue): string =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const compactSearchText = (value: SearchValue): string => normalizeSearchText(value).replace(/[^a-z0-9]+/g, "");

export const singularizeToken = (token: string): string => {
  if (token.length <= 3) return token;
  if (token.endsWith("ces") && token.length > 4) return `${token.slice(0, -3)}z`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
};

export const tokenizeSearchText = (
  value: SearchValue,
  options?: {
    stopWords?: Iterable<string>;
    minTokenLength?: number;
  }
): string[] => {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  const stopWords = new Set(Array.from(options?.stopWords ?? DEFAULT_STOP_WORDS, (token) => normalizeSearchText(token)));
  const minTokenLength = options?.minTokenLength ?? 2;

  return normalized
    .split(/[^a-z0-9]+/)
    .map(singularizeToken)
    .filter((token) => token.length >= minTokenLength && !stopWords.has(token));
};

const maxDistanceFor = (token: string): number => {
  if (token.length >= 9) return 2;
  if (token.length >= 6) return 1;
  return 0;
};

const editDistanceWithin = (left: string, right: string, maxDistance: number): number => {
  if (maxDistance <= 0) return left === right ? 0 : maxDistance + 1;
  if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMin = current[0];

    for (let column = 1; column <= right.length; column += 1) {
      const replacementCost = left[row - 1] === right[column - 1] ? 0 : 1;
      const value = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + replacementCost
      );
      current[column] = value;
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[right.length];
};

const isFuzzyMatch = (token: string, word: string): boolean => {
  const maxDistance = maxDistanceFor(token);
  if (maxDistance === 0) return false;
  if (word.startsWith(token) || token.startsWith(word)) {
    return Math.abs(word.length - token.length) <= maxDistance;
  }
  return editDistanceWithin(token, word, maxDistance) <= maxDistance;
};

const expandTokens = (tokens: string[], synonymGroups: readonly (readonly string[])[]): string[] => {
  const expanded = new Set(tokens);

  synonymGroups.forEach((group) => {
    const normalizedGroup = group.map((value) => normalizeSearchText(value)).filter(Boolean);
    if (normalizedGroup.some((term) => expanded.has(term))) {
      normalizedGroup.forEach((term) => expanded.add(term));
    }
  });

  return Array.from(expanded);
};

const pickCorrection = (token: string, knownTerms: string[]): string => {
  if (!token || knownTerms.includes(token)) return token;

  const maxDistance = maxDistanceFor(token);
  if (maxDistance === 0) return token;

  let bestTerm = token;
  let bestDistance = maxDistance + 1;

  for (const knownTerm of knownTerms) {
    if (!knownTerm || Math.abs(knownTerm.length - token.length) > maxDistance) continue;
    if (knownTerm[0] !== token[0] && !knownTerm.startsWith(token[0])) continue;

    const distance = editDistanceWithin(token, knownTerm, maxDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTerm = knownTerm;
      if (distance === 0) break;
    }
  }

  return bestDistance <= maxDistance ? bestTerm : token;
};

const collectCorrectionTerms = <T,>(items: T[], fields: SearchFieldConfig<T>[]): string[] => {
  const terms = new Set<string>();

  items.forEach((item) => {
    fields.forEach((field) => {
      toArray(field.getValue(item)).forEach((value) => {
        const normalized = normalizeSearchText(value);
        if (!normalized) return;
        terms.add(normalized);
        tokenizeSearchText(normalized, { minTokenLength: 2 }).forEach((token) => terms.add(token));
        const compact = compactSearchText(value);
        if (compact.length >= 3) terms.add(compact);
      });
    });
  });

  return Array.from(terms);
};

const buildSuggestions = (
  tokens: string[],
  synonymGroups: readonly (readonly string[])[],
  hints: string[]
): string[] => {
  const normalizedHints = hints.map((hint) => normalizeSearchText(hint)).filter(Boolean);
  if (!tokens.length) {
    return Array.from(new Set(normalizedHints)).slice(0, 8);
  }

  const relatedTerms = synonymGroups
    .filter((group) => group.some((value) => tokens.includes(normalizeSearchText(value))))
    .flat()
    .map((value) => normalizeSearchText(value))
    .filter((value) => value && !tokens.includes(value));

  const merged = relatedTerms.length > 0 ? relatedTerms : normalizedHints.filter((hint) => !tokens.includes(hint));
  return Array.from(new Set(merged)).slice(0, 8);
};

const scorePhraseMatch = <T,>(
  entry: PreparedFieldValue<T>,
  normalizedQuery: string,
  compactQuery: string
): SearchHit | null => {
  if (!normalizedQuery) return null;

  if (entry.field.type === "code" && compactQuery) {
    if (entry.compact === compactQuery) return { score: entry.field.weight * 6.4, kind: "phrase" };
    if (entry.compact.startsWith(compactQuery)) return { score: entry.field.weight * 5.1, kind: "prefix" };
    if (entry.compact.includes(compactQuery)) return { score: entry.field.weight * 4.2, kind: "contains" };
  }

  if (normalizedQuery.length < 3) return null;
  if (entry.normalized === normalizedQuery) return { score: entry.field.weight * 5.6, kind: "phrase" };
  if (entry.normalized.startsWith(normalizedQuery)) return { score: entry.field.weight * 4.5, kind: "prefix" };
  if (entry.normalized.includes(normalizedQuery)) return { score: entry.field.weight * 3.4, kind: "contains" };
  return null;
};

const scoreTokenMatch = <T,>(entry: PreparedFieldValue<T>, token: string, compactToken: string): SearchHit | null => {
  if (!token) return null;

  if (entry.field.type === "code" && compactToken) {
    if (entry.compact === compactToken) return { score: entry.field.weight * 6, kind: "exact" };
    if (entry.compact.startsWith(compactToken)) return { score: entry.field.weight * 4.8, kind: "prefix" };
    if (entry.compact.includes(compactToken)) return { score: entry.field.weight * 3.8, kind: "contains" };
  }

  if (!entry.normalized) return null;
  if (entry.normalized === token) return { score: entry.field.weight * 5, kind: "exact" };
  if (entry.normalized.startsWith(token)) return { score: entry.field.weight * 4, kind: "prefix" };
  if (entry.tokens.includes(token)) return { score: entry.field.weight * 3.6, kind: "word" };
  if (entry.normalized.includes(token)) return { score: entry.field.weight * 2.6, kind: "contains" };
  if (entry.tokens.some((word) => isFuzzyMatch(token, word))) return { score: entry.field.weight * 1.8, kind: "fuzzy" };
  return null;
};

const scoreRelatedMatch = <T,>(entry: PreparedFieldValue<T>, token: string, compactToken: string): SearchHit | null => {
  if (!token) return null;

  if (entry.field.type === "code" && compactToken && entry.compact.includes(compactToken)) {
    return { score: entry.field.weight * 1.2, kind: "related" };
  }

  if (entry.tokens.includes(token)) return { score: entry.field.weight * 1.15, kind: "related" };
  if (entry.normalized.includes(token)) return { score: entry.field.weight * 0.9, kind: "related" };
  return null;
};

export const runSmartSearch = <T,>(items: T[], query: string, options: SmartSearchOptions<T>): RankedSearchResult<T> => {
  const minTokenLength = options.minTokenLength ?? 2;
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  const stopWords = options.stopWords ?? DEFAULT_STOP_WORDS;
  const tokens = tokenizeSearchText(normalizedQuery, { stopWords, minTokenLength });
  const synonymGroups = options.synonymGroups ?? [];

  const correctionSeed = new Set<string>();
  synonymGroups.flat().forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (normalized) correctionSeed.add(normalized);
  });
  (options.hints ?? []).forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (normalized) correctionSeed.add(normalized);
  });
  const correctionSource = options.getCorrectionTerms ? options.getCorrectionTerms(items) : collectCorrectionTerms(items, options.fields);
  correctionSource.forEach((value) => {
    const normalized = normalizeSearchText(value);
    if (!normalized) return;
    correctionSeed.add(normalized);
    tokenizeSearchText(normalized, { minTokenLength }).forEach((token) => correctionSeed.add(token));
  });
  const knownTerms = Array.from(correctionSeed);

  const correctedTokens = tokens.map((token) => pickCorrection(token, knownTerms));
  const correctedQuery = correctedTokens.length > 0 && correctedTokens.join(" ") !== tokens.join(" ") ? correctedTokens.join(" ") : null;
  const expansionSeed = correctedTokens.length > 0 ? correctedTokens : tokens;
  const expandedTokens = expandTokens(expansionSeed, synonymGroups);
  const canSearch = tokens.length > 0 || compactQuery.length >= minTokenLength;
  const suggestions = buildSuggestions(expansionSeed, synonymGroups, options.hints ?? []);

  if (!canSearch) {
    return {
      items: [],
      normalizedQuery,
      correctedQuery,
      canSearch: false,
      tokens,
      expandedTokens,
      suggestions,
      total: 0,
    };
  }

  const rankedItems = items
    .map((item) => {
      const preparedFields: PreparedFieldValue<T>[] = options.fields
        .flatMap((field) =>
          toArray(field.getValue(item))
            .map((value) => ({
              field,
              normalized: normalizeSearchText(value),
              compact: compactSearchText(value),
              tokens: tokenizeSearchText(value, { minTokenLength: 2 }),
            }))
            .filter((entry) => entry.normalized || entry.compact)
        );

      const matchedTokens = new Set<string>();
      const matchedRelatedTokens = new Set<string>();
      const matchedFields = new Set<string>();
      let score = 0;
      let directHits = 0;
      let fuzzyHits = 0;
      let relatedHits = 0;
      let primaryMatch: RankedSearchItem<T>["primaryMatch"] = null;

      const updatePrimaryMatch = (field: string, kind: SearchMatchKind, hitScore: number) => {
        if (!primaryMatch || hitScore > primaryMatch.score) {
          primaryMatch = { field, kind, score: hitScore };
        }
      };

      preparedFields.forEach((entry) => {
        const phraseHit = scorePhraseMatch(entry, normalizedQuery, compactQuery);
        if (!phraseHit) return;
        score += phraseHit.score;
        matchedFields.add(entry.field.key);
        updatePrimaryMatch(entry.field.key, phraseHit.kind, phraseHit.score);
      });

      for (const token of tokens) {
        const compactToken = compactSearchText(token);
        let bestFieldHit: SearchHit | null = null;
        let bestFieldKey = "";

        for (const entry of preparedFields) {
          const hit = scoreTokenMatch(entry, token, compactToken);
          if (!hit) continue;
          if (!bestFieldHit || hit.score > bestFieldHit.score) {
            bestFieldHit = hit;
            bestFieldKey = entry.field.key;
          }
        }

        if (!bestFieldHit || !bestFieldKey) continue;
        score += bestFieldHit.score;
        matchedTokens.add(token);
        matchedFields.add(bestFieldKey);
        directHits += 1;
        if (bestFieldHit.kind === "fuzzy") fuzzyHits += 1;
        updatePrimaryMatch(bestFieldKey, bestFieldHit.kind, bestFieldHit.score);
      }

      for (const token of expandedTokens.filter((value) => !tokens.includes(value))) {
        const compactToken = compactSearchText(token);
        let bestFieldHit: SearchHit | null = null;
        let bestFieldKey = "";

        for (const entry of preparedFields) {
          const hit = scoreRelatedMatch(entry, token, compactToken);
          if (!hit) continue;
          if (!bestFieldHit || hit.score > bestFieldHit.score) {
            bestFieldHit = hit;
            bestFieldKey = entry.field.key;
          }
        }

        if (!bestFieldHit || !bestFieldKey) continue;
        score += bestFieldHit.score;
        matchedRelatedTokens.add(token);
        matchedFields.add(bestFieldKey);
        relatedHits += 1;
        updatePrimaryMatch(bestFieldKey, bestFieldHit.kind, bestFieldHit.score);
      }

      if (matchedTokens.size === tokens.length && tokens.length > 0) {
        score += 28 + tokens.length * 8;
      }

      if (matchedTokens.size === 0) {
        if (!options.allowRelatedMatches || matchedRelatedTokens.size === 0) return null;
      }

      score += options.boost?.(item) ?? 0;

      const candidate: RankedSearchItem<T> = {
        item,
        score,
        matchedTokens: Array.from(matchedTokens),
        matchedRelatedTokens: Array.from(matchedRelatedTokens),
        matchedFields: Array.from(matchedFields),
        directHits,
        fuzzyHits,
        relatedHits,
        isRelated: matchedTokens.size === 0 && matchedRelatedTokens.size > 0,
        primaryMatch,
      };

      return candidate;
    })
    .filter((entry): entry is RankedSearchItem<T> => entry !== null)
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;

      const hitDelta = right.directHits - left.directHits;
      if (hitDelta !== 0) return hitDelta;

      const fuzzyDelta = left.fuzzyHits - right.fuzzyHits;
      if (fuzzyDelta !== 0) return fuzzyDelta;

      return options.sortComparator ? options.sortComparator(left, right) : 0;
    });

  return {
    items: rankedItems,
    normalizedQuery,
    correctedQuery,
    canSearch: true,
    tokens,
    expandedTokens,
    suggestions,
    total: rankedItems.length,
  };
};
