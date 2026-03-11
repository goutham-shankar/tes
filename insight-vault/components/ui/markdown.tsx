"use client";
import { cn } from "@/lib/utils";

/**
 * Lightweight markdown renderer — handles the most common patterns
 * without pulling in react-markdown + remark + rehype (~30KB).
 *
 * Supports: **bold**, *italic*, `code`, ```code blocks```,
 * - lists, > blockquotes, [links](url), # headings, ---
 */

interface MarkdownProps {
  content: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseInline(text: string): string {
  let result = escapeHtml(text);

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');

  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");

  // Inline code: `code`
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'
  );

  // Links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">$1</a>'
  );

  return result;
}

function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(
          `<pre class="bg-muted/70 border border-border rounded-lg p-3 overflow-x-auto my-2"><code class="text-xs font-mono leading-relaxed">${escapeHtml(
            codeBlockContent.join("\n")
          )}</code></pre>`
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      html.push("<br />");
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = {
        1: "text-lg font-bold mt-4 mb-2",
        2: "text-base font-semibold mt-3 mb-1.5",
        3: "text-sm font-semibold mt-2 mb-1",
        4: "text-xs font-semibold mt-2 mb-1",
      };
      html.push(
        `<h${level} class="${sizes[level]}">${parseInline(headingMatch[2])}</h${level}>`
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      html.push('<hr class="border-border my-3" />');
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      html.push(
        `<blockquote class="border-l-2 border-primary/30 pl-3 text-muted-foreground italic my-1">${parseInline(
          line.slice(2)
        )}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s/.test(line)) {
      const text = line.replace(/^\s*[-*+]\s/, "");
      html.push(
        `<li class="ml-4 list-disc text-sm leading-relaxed">${parseInline(text)}</li>`
      );
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\s*(\d+)\.\s(.+)$/);
    if (olMatch) {
      html.push(
        `<li class="ml-4 list-decimal text-sm leading-relaxed" value="${olMatch[1]}">${parseInline(
          olMatch[2]
        )}</li>`
      );
      continue;
    }

    // Regular paragraph
    html.push(`<p class="leading-relaxed">${parseInline(line)}</p>`);
  }

  // Close unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    html.push(
      `<pre class="bg-muted/70 border border-border rounded-lg p-3 overflow-x-auto my-2"><code class="text-xs font-mono leading-relaxed">${escapeHtml(
        codeBlockContent.join("\n")
      )}</code></pre>`
    );
  }

  return html.join("\n");
}

export function Markdown({ content, className }: MarkdownProps) {
  const html = renderMarkdown(content);

  return (
    <div
      className={cn("prose-vault text-sm", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
