import { z } from 'zod';

export const bookLicenceSchema = z.string().trim().min(2).max(100);
export const bookDetailsSchema = z.object({
  title: z.string().trim().min(1).max(300),
  authors: z.array(z.string().trim().min(1).max(255)).min(1).max(20),
  year: z.number().int().min(1).max(new Date().getFullYear()),
  licence: bookLicenceSchema,
  sourceUrl: z.string().url().max(2000).optional().or(z.literal('')),
  publisher: z.string().trim().max(255).optional(),
  edition: z.string().trim().max(100).optional(),
  isbn: z.string().trim().max(32).optional(),
  description: z
    .string()
    .max(5000)
    .refine((value) => !/<[^>]*>/.test(value), 'Description must be plain text')
    .optional(),
  keywords: z.array(z.string().trim().min(1).max(50)).max(10),
});
export const publicBookSchema = bookDetailsSchema.extend({
  publicId: z.string(),
  sourceUrl: z.string().optional(),
  description: z.string().optional(),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  isbn: z.string().optional(),
});
export const getPublicBookContract = {
  method: 'GET' as const,
  path: '/books/get/:publicId' as const,
  response: publicBookSchema,
};
export const listBooksContract = {
  method: 'GET' as const,
  path: '/books/catalog' as const,
  response: z.array(publicBookSchema),
};
export const createBookContract = {
  method: 'POST' as const,
  path: '/books/create' as const,
  request: bookDetailsSchema,
  response: publicBookSchema,
};
export const getBookContentContract = {
  method: 'GET' as const,
  path: '/books/content/:publicId' as const,
};
export const getBookDownloadContract = {
  method: 'GET' as const,
  path: '/books/download/:publicId' as const,
};
export type BookDetails = z.infer<typeof bookDetailsSchema>;
export type PublicBook = z.infer<typeof publicBookSchema>;

export function formatBookCitations(book: PublicBook, url: string) {
  const authors = book.authors.join(', ');
  const edition = book.edition ? ` (${book.edition})` : '';
  const isbn = book.isbn ? ` ISBN ${book.isbn}.` : '';
  const publisher = book.publisher ? `${book.publisher}.` : '';
  const details = `${book.title}${edition}. ${publisher}${isbn}`;
  const apa = `${authors ? `${authors} ` : ''}(${book.year}). ${details} ${url}`;
  const ieee = `${authors ? `${authors}, ` : ''}“${book.title},”${edition}, ${book.year}${publisher ? `, ${book.publisher}` : ''}${isbn} ${url}`;
  const escape = (value: string) =>
    value
      .replaceAll('\\', '\\\\')
      .replaceAll('{', '\\{')
      .replaceAll('}', '\\}');
  const bibtex = `@book{${book.publicId},\n  author = {${book.authors.map((author) => `{${escape(author)}}`).join(' and ')}},\n  title = {${escape(book.title)}},\n  year = {${book.year}},\n${book.edition ? `  edition = {${escape(book.edition)}},\n` : ''}${book.publisher ? `  publisher = {${escape(book.publisher)}},\n` : ''}${book.isbn ? `  isbn = {${escape(book.isbn)}},\n` : ''}  url = {${escape(url)}}\n}`;
  return {
    apa,
    ieee,
    bibtex,
    warnings: book.publisher ? [] : ['Missing publisher.'],
  };
}
