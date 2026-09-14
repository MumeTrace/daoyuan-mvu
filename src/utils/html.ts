const ENTITY_PREFIX = String.fromCharCode(38);

const HTML_TEXT_ENTITIES: Record<string, string> = {
  "&": `${ENTITY_PREFIX}amp;`,
  "<": `${ENTITY_PREFIX}lt;`,
  ">": `${ENTITY_PREFIX}gt;`,
};

const HTML_ATTRIBUTE_ENTITIES: Record<string, string> = {
  ...HTML_TEXT_ENTITIES,
  '"': `${ENTITY_PREFIX}quot;`,
  "'": `${ENTITY_PREFIX}#39;`,
};

/**
 * Escape untrusted text for hand-built HTML. Entity names are assembled at
 * runtime because SillyTavern decodes literal entities once while parsing an
 * iframe srcdoc attribute.
 */
export function escapeHtmlText(value: unknown): string {
  return String(value ?? "").replace(/[&<>]/g, character => HTML_TEXT_ENTITIES[character] ?? character);
}

/** Escape a value placed between quotes in a hand-built HTML attribute. */
export function escapeHtmlAttribute(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => HTML_ATTRIBUTE_ENTITIES[character] ?? character,
  );
}
