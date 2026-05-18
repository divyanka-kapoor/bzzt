/**
 * Display-layer formatting utilities — no DB or API changes.
 */

/**
 * Formats concatenated PascalCase district/state names for display.
 *
 * "WestBengal"           → "West Bengal"
 * "AndamanandNicobar"    → "Andaman and Nicobar"
 * "NCTofDelhi"           → "NCT of Delhi"
 * "DadraandNagarHaveli"  → "Dadra and Nagar Haveli"
 * "AkwaIbom"             → "Akwa Ibom"
 * "Jakarta"              → "Jakarta" (unchanged)
 */
export function formatDistrictName(raw: string): string {
  if (!raw) return raw;

  let s = raw.replace(/_/g, ' ');

  // Insert spaces around lowercase connectors embedded between PascalCase words
  // Handles both lowercase-before (NagarandHaveli) and uppercase-before (NCTofDelhi)
  s = s.replace(/([A-Za-z])(and|of|the|de|do|da|van|von)([A-Z])/g, '$1 $2 $3');

  // Split acronym blocks before a TitleCase word: "NCTDelhi" → "NCT Delhi"
  s = s.replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2');

  // Split standard PascalCase boundaries: "WestBengal" → "West Bengal"
  s = s.replace(/([a-z\d])([A-Z])/g, '$1 $2');

  return s.replace(/\s+/g, ' ').trim();
}
