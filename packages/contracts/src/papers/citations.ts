import type { PublicPaper } from './draft.contract.js';

type Author = PublicPaper['authors'][number] & { suffix?: string };

function name(author: Author, style: 'apa' | 'ieee') {
  if (author.kind === 'organization') return author.displayName;
  const suffix = author.suffix ? `, ${author.suffix}` : '';
  if (!author.givenName || !author.familyName)
    return `${author.displayName}${suffix}`;
  if (style === 'ieee')
    return `${author.givenName
      .split(/\s+/)
      .map((part) => `${part[0]}.`)
      .join(' ')} ${author.familyName}${suffix}`;
  const initials = author.givenName
    .split(/\s+/)
    .map((part) => `${part[0]}.`)
    .join(' ');
  return `${author.familyName}, ${initials}${suffix}`;
}

function apaAuthors(authors: Author[]) {
  const names = authors.map((author) => name(author, 'apa'));
  return names.length > 20
    ? `${names.slice(0, 19).join(', ')}, … ${names.at(-1)}`
    : names.length === 2
      ? `${names[0]} & ${names[1]}`
      : names.length > 2
        ? `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`
        : (names[0] ?? '');
}

export function formatPaperCitations(paper: PublicPaper, url: string) {
  const authors = paper.authors as Author[];
  const missing = [
    ...(authors.length ? [] : ['Authors']),
    ...(paper.institutionName.trim() ? [] : ['institution name']),
  ];
  const type = (
    {
      THESIS: 'Thesis',
      CAPSTONE: 'Capstone',
      RESEARCH_PAPER: 'Research paper',
      PROJECT_REPORT: 'Project report',
    } as const
  )[paper.researchType];
  const authorText = apaAuthors(authors);
  const apa = `${authorText ? `${authorText} ` : ''}(${paper.year}). ${paper.title} [${type}]. ${paper.institutionName ? `${paper.institutionName}. ` : ''}${url}`;
  const ieeeAuthors =
    authors.length > 6
      ? `${authors
          .slice(0, 6)
          .map((author) => name(author, 'ieee'))
          .join(', ')}, et al.`
      : authors.map((author) => name(author, 'ieee')).join(', ');
  const ieee = `${ieeeAuthors ? `${ieeeAuthors}, ` : ''}“${paper.title},” ${type}${paper.institutionName ? `, ${paper.institutionName}` : ''}, ${paper.year}. ${url}`;
  const escapeBibtex = (value: string) =>
    value
      .replaceAll('\\', '\\\\')
      .replaceAll('{', '\\{')
      .replaceAll('}', '\\}');
  const bibtexAuthors = authors.map((author) => {
    if (author.kind === 'organization') return `{${author.displayName}}`;
    if (author.givenName && author.familyName)
      return escapeBibtex(
        `${author.familyName}, ${author.givenName}${author.suffix ? `, ${author.suffix}` : ''}`,
      );
    return escapeBibtex(author.displayName);
  });
  const bibtex = `@misc{${paper.publicId},\n  author = {${bibtexAuthors.join(' and ')}},\n  title = {${escapeBibtex(paper.title)}},\n  year = {${paper.year}},\n  howpublished = {${escapeBibtex(`${type}${paper.institutionName ? `, ${paper.institutionName}` : ''}`)}},\n  url = {${escapeBibtex(url)}}\n}`;
  return {
    apa,
    ieee,
    bibtex,
    warnings: missing.length ? [`Missing ${missing.join(' and ')}.`] : [],
  };
}
