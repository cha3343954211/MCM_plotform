'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// 全局 marked 配置
marked.setOptions({
  gfm: true,
  breaks: true, // 单回车换行
});

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  const html = useMemo(() => {
    try {
      const raw = marked.parse(content || '', { async: false }) as string;
      return DOMPurify.sanitize(raw, {
        ADD_ATTR: ['target'],
      });
    } catch {
      return '';
    }
  }, [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
