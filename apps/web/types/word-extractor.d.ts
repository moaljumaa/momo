declare module "word-extractor" {
  export default class WordExtractor {
    extract(source: Buffer | string): Promise<{
      getBody(): string;
      getFootnotes(): string;
      getEndnotes(): string;
      getHeaders(includeFooters?: boolean): string;
      getFooters(): string;
      getAnnotations(): string;
      getTextboxes(includeHeadersAndFooters?: boolean): string;
    }>;
  }
}
