import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content space-y-4 text-sm leading-relaxed text-[#262626] ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] mt-6 mb-3 pb-2 border-b border-[#E5E5E5]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight text-[#0A0A0A] mt-6 mb-3 pb-1 border-b border-[#F0F0F0]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[#0A0A0A] mt-5 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[#525252] mt-4 mb-1.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-[#262626] leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#0A0A0A]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#525252]">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-2 list-none pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 list-decimal list-outside pl-5 marker:font-semibold marker:text-[#0A0A0A] text-sm text-[#262626]">
              {children}
            </ol>
          ),
          li: ({ children, ...props }: any) => {
            if (props.ordered) {
              return <li className="pl-1 leading-relaxed text-[#262626]">{children}</li>;
            }
            return (
              <li className="flex items-start gap-2.5 text-sm leading-relaxed text-[#262626]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] mt-2 shrink-0" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-3 border-[#0A0A0A] bg-[#F5F5F5] rounded-r-lg px-4 py-2 text-sm text-[#525252] italic">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono text-[13px] text-[#0A0A0A] font-medium"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-4 rounded-xl border border-[#262626] bg-[#0A0A0A] text-[#FAFAFA] p-4 overflow-x-auto shadow-sm">
                <code className="font-mono text-xs leading-relaxed block" {...props}>
                  {children}
                </code>
              </div>
            );
          },
          hr: () => <hr className="my-6 border-t border-[#E5E5E5]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
