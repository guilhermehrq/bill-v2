import raw from "../../artefatos/instituicoes.json";

export type Institution = {
  slug: string;
  name: string;
  logoUrl: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Build the institution list once at module load. Slugs are deterministic so
// `inst:nubank` resolves the same logo across sessions.
export const INSTITUTIONS: Institution[] = (() => {
  const seen = new Set<string>();
  const list: Institution[] = [];
  for (const item of raw as Array<{ nome: string; link: string }>) {
    let slug = slugify(item.nome);
    if (!slug) continue;
    // De-dupe slugs (very unlikely with this dataset, but defensive).
    let candidate = slug;
    let i = 2;
    while (seen.has(candidate)) {
      candidate = `${slug}-${i++}`;
    }
    slug = candidate;
    seen.add(slug);
    list.push({ slug, name: item.nome, logoUrl: item.link });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
})();

const BY_SLUG = new Map<string, Institution>(INSTITUTIONS.map((i) => [i.slug, i]));

export function getInstitution(slug: string): Institution | null {
  return BY_SLUG.get(slug) ?? null;
}

const INSTITUTION_PREFIX = "inst:";

export function isInstitutionIcon(icon: string | null | undefined): boolean {
  return typeof icon === "string" && icon.startsWith(INSTITUTION_PREFIX);
}

export function institutionSlugFromIcon(icon: string | null | undefined): string | null {
  if (!icon || !isInstitutionIcon(icon)) return null;
  return icon.slice(INSTITUTION_PREFIX.length);
}

export function buildInstitutionIcon(slug: string): string {
  return `${INSTITUTION_PREFIX}${slug}`;
}
