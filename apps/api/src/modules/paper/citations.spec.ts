import { formatPaperCitations, type PublicPaper } from '@repo/contracts';

const paper = (authors: PublicPaper['authors']): PublicPaper => ({
  publicId: 'abc123',
  title: 'A Study of Systems',
  authors,
  abstract: '',
  keywords: [],
  program: 'Computer Science',
  year: 2025,
  researchType: 'THESIS',
  publishedAt: '2025-01-01T00:00:00.000Z',
  institutionName: 'Naga College Foundation',
});

describe('Paper citation formatting', () => {
  it('formats mononyms and organisational Authors in each style', () => {
    const citations = formatPaperCitations(
      paper([
        { displayName: 'Madonna', kind: 'person' },
        { displayName: 'World Health Organization', kind: 'organization' },
      ]),
      'https://example.edu/papers/abc123',
    );
    expect(citations.apa).toContain('Madonna & World Health Organization');
    expect(citations.ieee).toContain('Madonna, World Health Organization');
    expect(citations.bibtex).toContain('{World Health Organization}');
  });

  it('preserves suffixes and abbreviates long author lists for both styles', () => {
    const authors = Array.from({ length: 21 }, (_, i) => ({
      displayName: `Author ${i + 1}`,
      kind: 'person' as const,
      givenName: `Given${i + 1}`,
      familyName: `Family${i + 1}`,
      ...(i === 0 ? { suffix: 'Jr.' } : {}),
    }));
    const citations = formatPaperCitations(
      paper(authors),
      'https://example.edu/papers/abc123',
    );
    expect(citations.apa).toContain('Family1, G., Jr.');
    expect(citations.apa).toContain('… Family21, G.');
    expect(citations.ieee).toContain('et al.');
  });

  it('warns when citation metadata is missing instead of inventing it', () => {
    const citations = formatPaperCitations(
      { ...paper([]), institutionName: '' },
      'https://example.edu/papers/abc123',
    );
    expect(citations.warnings).toEqual([
      'Missing Authors and institution name.',
    ]);
  });
});
