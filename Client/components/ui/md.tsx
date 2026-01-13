import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Pre-process content to fix LaTeX rendering issues caused by string corruption
  // We only restore the control characters to their string representation (e.g. \f -> \\f)
  // We let remark-math handle the parsing of $...$ blocks naturally.
  const processedContent = React.useMemo(() => {
    if (!content) return ""
    
    return content
      .replace(/\f/g, '\\f') // Restores \frac if it became \f + rac
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
  }, [content])

  return (
    <div className={className}>
      <style>{`
        .katex { font-size: 1.3em !important; }
        .katex-display { font-size: 1.5em !important; margin: 1em 0; }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !String(children).includes('\n')
            
            return !isInline && match ? (
              <SyntaxHighlighter
                {...props}
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  margin: '1em 0'
                }}
                wrapLongLines={true}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code {...props} className={className}>
                {children}
              </code>
            )
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
