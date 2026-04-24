'use client';

import { useState } from 'react';
import { Eye, Edit3, HelpCircle } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

const HELP = `**粗体**  *斜体*  ~~删除线~~
# 一级标题    ## 二级标题
- 列表项
1. 有序列表
[链接文字](https://...)
![图片描述](https://.../a.png)
\`行内代码\`
\`\`\`
代码块
\`\`\`
> 引用
| 表头 | 表头 |
| --- | --- |
| 单元 | 单元 |`;

export default function MarkdownEditor({ value, onChange, rows = 8, placeholder, required }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="rounded-xl border border-gray-300 overflow-hidden bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-1">
          {[
            { k: 'edit' as const, label: '编辑', icon: Edit3 },
            { k: 'split' as const, label: '分屏', icon: null },
            { k: 'preview' as const, label: '预览', icon: Eye },
          ].map((m) => (
            <button key={m.k} type="button" onClick={() => setMode(m.k)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                mode === m.k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}>
              {m.icon && <m.icon className="w-3 h-3" />}{m.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
          title="Markdown 语法帮助">
          <HelpCircle className="w-3.5 h-3.5" />语法
        </button>
      </div>

      {showHelp && (
        <div className="px-3 py-2 text-[11px] text-gray-600 bg-amber-50/70 border-b border-amber-100 font-mono whitespace-pre-wrap leading-relaxed">
          {HELP}
        </div>
      )}

      {/* 内容区 */}
      <div className={mode === 'split' ? 'grid grid-cols-2 divide-x divide-gray-200' : ''}>
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            required={required}
            placeholder={placeholder || '支持 Markdown 语法...'}
            className="w-full px-3 py-3 text-sm outline-none resize-y font-mono leading-relaxed"
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="px-4 py-3 overflow-auto bg-gray-50/30" style={{ minHeight: `${rows * 1.75}em` }}>
            {value.trim() ? (
              <MarkdownRenderer content={value} className="compact" />
            ) : (
              <p className="text-xs text-gray-400 italic">预览区（输入内容后显示）</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
