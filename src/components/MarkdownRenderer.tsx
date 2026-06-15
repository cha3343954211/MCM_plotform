'use client';

import { useEffect, useState } from 'react';
import { marked } from 'marked';
import katex from 'katex';

// Block math block tokenizer and renderer: $$ ... $$
const blockMath = {
  name: 'blockMath',
  level: 'block' as const,
  start(src: string) { return src.indexOf('$$'); },
  tokenizer(src: string) {
    const match = /^\$\$\n?([\s\S]+?)\n?\$\$(?:\n|$)/.exec(src);
    if (match) {
      return {
        type: 'blockMath',
        raw: match[0],
        text: match[1]
      };
    }
  },
  renderer(token: any) {
    try {
      return `<div class="math-block py-4 overflow-x-auto flex justify-center">${katex.renderToString(token.text, { displayMode: true, throwOnError: false })}</div>`;
    } catch (e) {
      return `<div class="math-block text-red-500 py-4 overflow-x-auto">${token.raw}</div>`;
    }
  }
};

// Inline math tokenizer and renderer: $ ... $
const inlineMath = {
  name: 'inlineMath',
  level: 'inline' as const,
  start(src: string) { return src.indexOf('$'); },
  tokenizer(src: string) {
    const match = /^\$([^$\n]+?)\$/.exec(src);
    if (match) {
      const content = match[1].trim();
      if (content && !/^\s+$/.test(content)) {
        return {
          type: 'inlineMath',
          raw: match[0],
          text: content
        };
      }
    }
  },
  renderer(token: any) {
    try {
      return `<span class="math-inline px-0.5">${katex.renderToString(token.text, { displayMode: false, throwOnError: false })}</span>`;
    } catch (e) {
      return `<span class="math-inline text-red-500">${token.raw}</span>`;
    }
  }
};

marked.use({
  gfm: true,
  breaks: true,
  extensions: [blockMath, inlineMath]
});

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import('dompurify');
        const DOMPurify = (mod as any).default ?? mod;
        const raw = marked.parse(content || '', { async: false }) as string;
        // Use profiles to ensure MathML and SVG classes/styles pass through DOMPurify
        const safe = DOMPurify.sanitize(raw, {
          USE_PROFILES: { html: true, mathMl: true, svg: true },
          ADD_ATTR: ['target']
        });
        if (active) setHtml(safe);
      } catch {
        if (active) setHtml('');
      }
    })();
    return () => {
      active = false;
    };
  }, [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
