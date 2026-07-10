/**
 * Vietnam contact strings as Unicode escapes so source files stay ASCII-safe
 * (avoids Windows editor / git encoding corrupting Vietnamese diacritics).
 */
export const LEGAL_HCMC = 'H\u1ed3 Ch\u00ed Minh City';

export const LEGAL_STREET_ADDRESS =
  '184 L\u00ea \u0110\u1ea1i H\u00e0nh, Ph\u00fa Th\u1ecd';

export const LEGAL_POSTAL_NEXORA = `Nexora, ${LEGAL_STREET_ADDRESS}, ${LEGAL_HCMC}`;
