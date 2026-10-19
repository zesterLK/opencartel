export function mountMarkdownPanel(root: HTMLElement, options: {
  url: string;
  filename: string;
  validate?: (text: string) => boolean;
}): { load(): Promise<void>; dispose(): void };
