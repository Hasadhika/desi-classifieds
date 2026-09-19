export const CANADIAN_PROVINCES = [
  "Ontario",
  "British Columbia",
  "Alberta",
  "Quebec",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
  "Northwest Territories",
  "Yukon",
  "Nunavut"
];

export const MAJOR_CITIES = {
  Ontario: [
    "Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton",
    "London", "Markham", "Vaughan", "Kitchener", "Windsor",
    "Richmond Hill", "Oakville", "Burlington", "Oshawa", "Barrie",
    "Scarborough", "Etobicoke", "North York"
  ],
  "British Columbia": [
    "Vancouver", "Surrey", "Burnaby", "Richmond", "Abbotsford",
    "Coquitlam", "Kelowna", "Saanich", "Delta", "Langley",
    "Victoria", "Nanaimo", "Kamloops", "Chilliwack"
  ],
  Alberta: [
    "Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert",
    "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove"
  ],
  Quebec: [
    "Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil",
    "Sherbrooke", "Saguenay", "Trois-Rivières", "Terrebonne", "Saint-Jean-sur-Richelieu"
  ],
  Manitoba: ["Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie"],
  Saskatchewan: ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current"],
  "Nova Scotia": ["Halifax", "Sydney", "Dartmouth", "Truro", "New Glasgow"],
  "New Brunswick": ["Moncton", "Saint John", "Fredericton", "Dieppe", "Miramichi"],
  "Newfoundland and Labrador": ["St. John's", "Mount Pearl", "Corner Brook", "Conception Bay South"],
  "Prince Edward Island": ["Charlottetown", "Summerside", "Stratford", "Cornwall"],
  "Northwest Territories": ["Yellowknife", "Hay River", "Inuvik"],
  Yukon: ["Whitehorse", "Dawson City", "Watson Lake"],
  Nunavut: ["Iqaluit", "Rankin Inlet", "Arviat"]
};

export function validateCanadianPostalCode(postalCode) {
  if (!postalCode) return { valid: false, message: "" };

  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();

  const regex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

  if (!regex.test(cleaned)) {
    return {
      valid: false,
      message: "Invalid format. Canadian postal codes should be in the format: A1A 1A1"
    };
  }

  const invalidLetters = ['D', 'F', 'I', 'O', 'Q', 'U'];
  const firstChar = cleaned[0];
  const thirdChar = cleaned[2];
  const fifthChar = cleaned[4];

  if (invalidLetters.includes(firstChar) || invalidLetters.includes(thirdChar) || invalidLetters.includes(fifthChar)) {
    return {
      valid: false,
      message: "Postal code contains invalid letters (D, F, I, O, Q, U are not used)"
    };
  }

  return {
    valid: true,
    formatted: `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
  };
}

export function formatPostalCode(postalCode) {
  if (!postalCode) return "";
  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();
  if (cleaned.length >= 3) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
  }
  return cleaned;
}

export function getProvinceFromPostalCode(postalCode) {
  if (!postalCode) return null;

  const firstChar = postalCode.trim().toUpperCase()[0];

  const mapping = {
    A: "Newfoundland and Labrador",
    B: "Nova Scotia",
    C: "Prince Edward Island",
    E: "New Brunswick",
    G: "Quebec (Eastern)",
    H: "Quebec (Montreal)",
    J: "Quebec (Western)",
    K: "Ontario (Eastern)",
    L: "Ontario (Central)",
    M: "Ontario (Toronto)",
    N: "Ontario (Southwestern)",
    P: "Ontario (Northern)",
    R: "Manitoba",
    S: "Saskatchewan",
    T: "Alberta",
    V: "British Columbia",
    X: "Northwest Territories/Nunavut",
    Y: "Yukon"
  };

  const province = mapping[firstChar];
  if (province && province.includes("(")) {
    return province.split(" (")[0];
  }
  return province || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Country-aware postal code rules
// Keyed by ISO 3166-1 alpha-2 code (what Google Places returns as short_name).
// Each entry has:
//   regex      – tests the CLEANED (no spaces) uppercased value
//   format(v)  – returns the canonical spaced form for display
//   placeholder – hint shown in the input
//   label      – field label ("Postal Code", "Postcode", "ZIP Code", etc.)
//   maxLength  – max characters INCLUDING spaces, for the <input>
//   hint       – shown in the validation error message
// ─────────────────────────────────────────────────────────────────────────────
export const POSTAL_CODE_RULES = {
  CA: {
    // Canada: A1A 1A1 — first letter excludes D F I O Q U W
    regex: /^[A-CEGHJ-NPRSTVXY]\d[A-CEGHJ-NPRSTV-Z]\d[A-CEGHJ-NPRSTV-Z]\d$/,
    format: (v) => { const c = v.replace(/\s/g, '').toUpperCase(); return c.length > 3 ? `${c.slice(0,3)} ${c.slice(3,6)}` : c; },
    placeholder: 'A1A 1A1',
    label: 'Postal Code',
    maxLength: 7,
    hint: 'Canadian format: A1A 1A1',
  },
  GB: {
    // UK: outward([A-Z]{1,2}[0-9]{1,2}[A-Z]?) + inward([0-9][A-Z]{2})
    // Covers: AN, ANN, AAN, AANN, ANA, AANA outward codes.
    // Old regex /^[A-Z]{1,2}\d[0-9A-Z]?\d[A-Z]{2}$/ was wrong: the [0-9A-Z]?
    // greedily consumed the inward sector digit (e.g. '3' in TF4 3GZ),
    // leaving the next letter with no \d slot → rejected TF4 3GZ, EC1A 1BB etc.
    regex: /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?[0-9][A-Z]{2}$/,
    format: (v) => { const c = v.replace(/\s/g, '').toUpperCase(); return c.length > 3 ? `${c.slice(0, -3)} ${c.slice(-3)}` : c; },
    placeholder: 'SW1A 2AA',
    label: 'Postcode',
    maxLength: 8,
    hint: 'UK format: TF4 3GZ or SW1A 2AA',
  },
  NL: {
    // Netherlands: 1234 AB
    regex: /^\d{4}[A-Z]{2}$/,
    format: (v) => { const c = v.replace(/\s/g, '').toUpperCase(); return c.length > 4 ? `${c.slice(0,4)} ${c.slice(4,6)}` : c; },
    placeholder: '1234 AB',
    label: 'Postcode',
    maxLength: 7,
    hint: 'Dutch format: 1234 AB',
  },
  US: {
    // USA: 12345 or 12345-6789
    regex: /^\d{5}(\d{4})?$/,
    format: (v) => { const c = v.replace(/[^\d]/g, ''); return c.length > 5 ? `${c.slice(0,5)}-${c.slice(5,9)}` : c; },
    placeholder: '90210',
    label: 'ZIP Code',
    maxLength: 10,
    hint: 'US format: 12345 or 12345-6789',
  },
  AU: {
    // Australia: 4 digits
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '2000',
    label: 'Postcode',
    maxLength: 4,
    hint: '4-digit Australian postcode',
  },
  IN: {
    // India: 6 digits (PIN code)
    regex: /^\d{6}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 6),
    placeholder: '110001',
    label: 'PIN Code',
    maxLength: 6,
    hint: '6-digit Indian PIN code',
  },
  PK: {
    // Pakistan: 5 digits
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '44000',
    label: 'Postal Code',
    maxLength: 5,
    hint: '5-digit Pakistani postal code',
  },
  BD: {
    // Bangladesh: 4 digits
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '1000',
    label: 'Postal Code',
    maxLength: 4,
    hint: '4-digit Bangladeshi postal code',
  },
  LK: {
    // Sri Lanka: 5 digits
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '00100',
    label: 'Postal Code',
    maxLength: 5,
    hint: '5-digit Sri Lankan postal code',
  },
  DE: {
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '10115',
    label: 'Postleitzahl',
    maxLength: 5,
    hint: '5-digit German PLZ',
  },
  FR: {
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '75001',
    label: 'Code Postal',
    maxLength: 5,
    hint: '5-digit French postal code',
  },
  IT: {
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '00100',
    label: 'Codice Postale',
    maxLength: 5,
    hint: '5-digit Italian CAP',
  },
  ES: {
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '28001',
    label: 'Código Postal',
    maxLength: 5,
    hint: '5-digit Spanish postal code',
  },
  NZ: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '1010',
    label: 'Postcode',
    maxLength: 4,
    hint: '4-digit NZ postcode',
  },
  IE: {
    // Ireland: A65 F4E2 (routing key + unique identifier)
    regex: /^[A-Z]\d{2}[A-Z0-9]{4}$/,
    format: (v) => { const c = v.replace(/\s/g, '').toUpperCase(); return c.length > 3 ? `${c.slice(0,3)} ${c.slice(3,7)}` : c; },
    placeholder: 'A65 F4E2',
    label: 'Eircode',
    maxLength: 8,
    hint: 'Irish Eircode: A65 F4E2',
  },
  SE: {
    // Sweden: 123 45
    regex: /^\d{5}$/,
    format: (v) => { const c = v.replace(/\D/g, '').slice(0, 5); return c.length > 3 ? `${c.slice(0,3)} ${c.slice(3)}` : c; },
    placeholder: '113 51',
    label: 'Postnummer',
    maxLength: 6,
    hint: 'Swedish format: 123 45',
  },
  NO: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '0150',
    label: 'Postnummer',
    maxLength: 4,
    hint: '4-digit Norwegian postcode',
  },
  DK: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '1050',
    label: 'Postnummer',
    maxLength: 4,
    hint: '4-digit Danish postcode',
  },
  CH: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '8001',
    label: 'Postleitzahl',
    maxLength: 4,
    hint: '4-digit Swiss PLZ',
  },
  BE: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '1000',
    label: 'Code Postal',
    maxLength: 4,
    hint: '4-digit Belgian postcode',
  },
  AT: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '1010',
    label: 'Postleitzahl',
    maxLength: 4,
    hint: '4-digit Austrian PLZ',
  },
  PT: {
    // Portugal: 1234-567
    regex: /^\d{4}\d{3}$/,
    format: (v) => { const c = v.replace(/[^\d]/g, '').slice(0, 7); return c.length > 4 ? `${c.slice(0,4)}-${c.slice(4)}` : c; },
    placeholder: '1000-001',
    label: 'Código Postal',
    maxLength: 8,
    hint: 'Portuguese format: 1234-567',
  },
  SG: {
    regex: /^\d{6}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 6),
    placeholder: '049909',
    label: 'Postal Code',
    maxLength: 6,
    hint: '6-digit Singapore postal code',
  },
  MY: {
    regex: /^\d{5}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 5),
    placeholder: '50000',
    label: 'Postcode',
    maxLength: 5,
    hint: '5-digit Malaysian postcode',
  },
  ZA: {
    regex: /^\d{4}$/,
    format: (v) => v.replace(/\D/g, '').slice(0, 4),
    placeholder: '2000',
    label: 'Postal Code',
    maxLength: 4,
    hint: '4-digit South African postal code',
  },
  BR: {
    // Brazil: 12345-678
    regex: /^\d{5}\d{3}$/,
    format: (v) => { const c = v.replace(/[^\d]/g, '').slice(0, 8); return c.length > 5 ? `${c.slice(0,5)}-${c.slice(5)}` : c; },
    placeholder: '01310-100',
    label: 'CEP',
    maxLength: 9,
    hint: 'Brazilian CEP: 12345-678',
  },
  AE: {
    // UAE has no postal codes — always valid
    regex: /^.*$/,
    format: (v) => v,
    placeholder: '—',
    label: 'Postal Code',
    maxLength: 12,
    hint: 'UAE does not use postal codes',
  },
  JP: {
    // Japan: 123-4567
    regex: /^\d{3}\d{4}$/,
    format: (v) => { const c = v.replace(/[^\d]/g, '').slice(0, 7); return c.length > 3 ? `${c.slice(0,3)}-${c.slice(3)}` : c; },
    placeholder: '100-0001',
    label: '郵便番号',
    maxLength: 8,
    hint: 'Japanese format: 123-4567',
  },
};

/**
 * Guess the country from a postal code's format when the country hasn't been
 * set via GPS or Google Places (e.g. the user types manually).
 * Only returns a value for unambiguous, fully-entered patterns.
 * Returns an ISO 3166-1 alpha-2 code or null if it can't decide.
 */
export function guessCountryFromPostalCode(postalCode) {
  if (!postalCode) return null;
  const c = postalCode.replace(/[\s-]/g, '').toUpperCase();
  if (c.length < 4) return null; // too short to decide

  // Netherlands: exactly 4 digits + 2 letters — very distinctive
  if (/^\d{4}[A-Z]{2}$/.test(c)) return 'NL';

  // Canada: letter + digit + letter + digit + letter + digit (6 chars)
  if (/^[A-CEGHJ-NPRSTVXY]\d[A-Z]\d[A-Z]\d$/.test(c)) return 'CA';

  // UK: 1-2 letters + 1-2 digits + optional letter + digit + 2 letters (5-7 chars)
  if (/^[A-Z]{1,2}[0-9]{1,2}[A-Z]?[0-9][A-Z]{2}$/.test(c)) return 'GB';

  // Ireland Eircode: letter + 2 digits + 4 alphanumeric (7 chars)
  if (/^[A-Z]\d{2}[A-Z0-9]{4}$/.test(c)) return 'IE';

  // Japan: exactly 7 digits
  if (/^\d{7}$/.test(c)) return 'JP';

  // US ZIP: exactly 5 digits OR 9 digits (not 4 or 6 — avoids NZ/AU/NL confusion)
  if (/^\d{5}$/.test(c)) return 'US';
  if (/^\d{9}$/.test(c)) return 'US';

  return null; // ambiguous (e.g. plain 4-digit or 6-digit codes)
}

/**
 * Validate a postal/zip code for a given country.
 * countryCode must be ISO 3166-1 alpha-2 (e.g. 'CA', 'GB', 'NL').
 * Returns { valid: true, formatted? } or { valid: false, message }.
 * Empty string is treated as valid (field is optional).
 */
export function validatePostalCode(postalCode, countryCode = 'CA') {
  if (!postalCode) return { valid: true };

  const code = (countryCode || 'CA').toUpperCase();
  const rule = POSTAL_CODE_RULES[code];

  if (!rule) {
    // Unknown country — accept any non-empty value
    return { valid: true, formatted: postalCode };
  }

  // Test against cleaned (no-space) uppercase value
  const cleaned = postalCode.replace(/[\s-]/g, '').toUpperCase();
  if (!rule.regex.test(cleaned)) {
    return { valid: false, message: `Invalid ${rule.label}. ${rule.hint}` };
  }

  return { valid: true, formatted: rule.format(postalCode) };
}

/** Returns the input placeholder for a country's postal/zip format. */
export function getPostalCodePlaceholder(countryCode) {
  return POSTAL_CODE_RULES[(countryCode || 'CA').toUpperCase()]?.placeholder ?? 'Postal code';
}

/** Returns the field label ("Postal Code", "ZIP Code", "Postcode", etc.) */
export function getPostalCodeLabel(countryCode) {
  return POSTAL_CODE_RULES[(countryCode || 'CA').toUpperCase()]?.label ?? 'Postal Code';
}

/** Returns the maxLength for the postal input. */
export function getPostalCodeMaxLength(countryCode) {
  return POSTAL_CODE_RULES[(countryCode || 'CA').toUpperCase()]?.maxLength ?? 12;
}

/**
 * Format a postal code string according to the country's canonical spacing.
 * Safe to call on partial input — returns the best representation so far.
 */
export function formatPostalCodeForCountry(value, countryCode = 'CA') {
  const code = (countryCode || 'CA').toUpperCase();
  const rule = POSTAL_CODE_RULES[code];
  if (!rule) return value.toUpperCase();
  return rule.format(value);
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}
