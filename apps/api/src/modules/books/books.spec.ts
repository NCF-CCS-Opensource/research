import { formatBookCitations, type PublicBook } from '@repo/contracts';
import { parseBookRange } from './books.use-cases.js';

const book: PublicBook = {
  publicId: 'book-1',
  title: 'Open Book',
  authors: ['A. Author', 'Research Group'],
  year: 2024,
  licence: 'CC BY 4.0',
  keywords: ['open'],
};

describe('Book public behavior', () => {
  it('includes supplied citation fields and warns about a missing publisher', () => {
    const citation = formatBookCitations(
      { ...book, edition: '2nd ed.', isbn: '123' },
      'https://example.test/books/book-1',
    );
    expect(citation.apa).toContain('(2024)');
    expect(citation.apa).toContain('2nd ed.');
    expect(citation.bibtex).toContain('isbn = {123}');
    expect(citation.warnings).toEqual(['Missing publisher.']);
  });

  it('parses one range and rejects malformed or multipart ranges', () => {
    expect(parseBookRange('bytes=2-5', 10)).toEqual({ start: 2, end: 5 });
    expect(parseBookRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
    expect(parseBookRange('bytes=0-1,4-5', 10)).toBeNull();
    expect(parseBookRange('bytes=10-', 10)).toBeNull();
  });
});
