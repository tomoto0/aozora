export function parseAozoraText(text: string): string;
export function extractTextFromZip(zipUrl: string): Promise<string>;
export function fetchAozoraTextFromHTML(bookUrl: string): Promise<string>;
export function getAozoraBookList(): Promise<Array<{
  id: number;
  title: string;
  author: string;
  year?: number;
  characterCount?: number;
  description?: string;
  textFileUrl?: string;
}>>;

