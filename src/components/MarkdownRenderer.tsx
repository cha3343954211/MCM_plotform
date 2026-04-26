'use client';

import { useEffect, useState } from 'react';
import { marked } from 'marked';

marked.use({
  gfm: true,
  breaks: true,
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
        const safe = DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
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
