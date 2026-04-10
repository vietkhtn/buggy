export interface JiraKeyResult {
  corrected: string | null;
  wasChanged: boolean;
  original: string;
}

/**
 * Attempts to normalise a raw JIRA key string to the required format (e.g. AC-03).
 *
 * Rules:
 * - Trims and upper-cases the input
 * - Already-valid keys (e.g. AC-3, PROJ-123) are returned with wasChanged=true only if
 *   casing differed
 * - Underscore/space separators are treated as hyphens
 * - Missing hyphen between prefix and number is inserted (e.g. AC03 → AC-3)
 * - If the key cannot be normalised to a valid format, corrected is null
 */
export function autoCorrectJiraKey(raw: string): JiraKeyResult {
  const upper = raw.trim().toUpperCase();
  if (!upper) return { corrected: null, wasChanged: false, original: raw };

  // Already valid
  if (/^[A-Z][A-Z0-9]*-[0-9]+$/.test(upper)) {
    return { corrected: upper, wasChanged: upper !== raw.trim(), original: raw };
  }

  // Normalise: replace _ or space with -, strip other non-alphanumeric chars
  const normalised = upper.replace(/[_\s]/g, "-").replace(/[^A-Z0-9-]/g, "");

  // If a hyphen is present but the format still isn't valid, give up
  if (normalised.includes("-")) {
    const match = normalised.match(/^([A-Z][A-Z0-9]*)-([0-9]+)$/);
    if (match) {
      return { corrected: `${match[1]}-${match[2]}`, wasChanged: true, original: raw };
    }
    return { corrected: null, wasChanged: false, original: raw };
  }

  // No hyphen: split at the letters→digits boundary (letters-only prefix)
  const match = normalised.match(/^([A-Z]+)([0-9]+)$/);
  if (match) {
    return { corrected: `${match[1]}-${match[2]}`, wasChanged: true, original: raw };
  }

  return { corrected: null, wasChanged: false, original: raw };
}
