import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const stripEmojis = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{200D}\u{FE0F}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ');
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const cleanContent = stripEmojis(content);

  return (
    <div className={`markdown-content space-y-4 text-sm leading-relaxed text-[#262626] dark:text-[#D4D4D4] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] mt-6 mb-3 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA] mt-6 mb-3 pb-1 border-b border-[#F0F0F0] dark:border-[#262626]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[#0A0A0A] dark:text-[#FAFAFA] mt-5 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] dark:bg-[#FAFAFA]" />
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#525252] dark:text-[#A3A3A3] mt-4 mb-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-[#262626] dark:text-[#D4D4D4] leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#0A0A0A] dark:text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#525252] dark:text-[#A3A3A3]">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-2 list-none pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 list-decimal list-outside pl-5 marker:font-semibold marker:text-[#0A0A0A] dark:marker:text-[#FAFAFA] text-sm text-[#262626] dark:text-[#D4D4D4]">
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => {
            if (props.ordered) {
              return <li className="pl-1 leading-relaxed text-[#262626] dark:text-[#D4D4D4]">{children}</li>;
            }
            return (
              <li className="flex items-start gap-2.5 text-sm leading-relaxed text-[#262626] dark:text-[#D4D4D4]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] dark:bg-[#FAFAFA] mt-2 shrink-0" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-3 border-[#0A0A0A] dark:border-[#FAFAFA] bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-r-lg px-4 py-2 text-sm text-[#525252] dark:text-[#A3A3A3] italic">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#333333] font-mono text-[13px] text-[#0A0A0A] dark:text-[#FAFAFA] font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-4 rounded-xl border border-[#262626] dark:border-[#333333] bg-[#0A0A0A] dark:bg-[#111111] text-[#FAFAFA] p-4 overflow-x-auto shadow-sm">
                <code className="font-mono text-xs leading-relaxed block" {...props}>
                  {children}
                </code>
              </div>
            );
          },
          hr: () => <hr className="my-6 border-t border-[#E5E5E5] dark:border-[#262626]" />,
          table: ({ children }) => (
            <div className="my-6 w-full overflow-x-auto rounded-xl border border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#141414] shadow-xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F8F9FA] dark:bg-[#1C1C1C] border-b border-[#E5E5E5] dark:border-[#262626] text-[#0A0A0A] dark:text-[#FAFAFA]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-semibold text-xs text-[#0A0A0A] dark:text-[#FAFAFA] tracking-wider whitespace-nowrap bg-[#F8F9FA] dark:bg-[#1C1C1C] border-r border-[#EBEBEB] dark:border-[#262626] last:border-r-0">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#EBEBEB] dark:divide-[#262626] bg-white dark:bg-[#141414]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F] transition-colors even:bg-[#FAFAFA]/70 dark:even:bg-[#181818]/70">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-xs sm:text-sm text-[#262626] dark:text-[#D4D4D4] leading-relaxed align-top border-r border-[#F0F0F0] dark:border-[#262626] last:border-r-0">
              {children}
            </td>
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
