import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Parse content to identify code blocks
  const parseContent = (text: string) => {
    const parts = []
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index).trim()
        if (beforeText) {
          parts.push({
            type: 'text',
            content: beforeText
          })
        }
      }

      // Add code block
      const language = match[1] || 'text'
      const code = match[2].trim()
      parts.push({
        type: 'code',
        language,
        content: code
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex).trim()
      if (remainingText) {
        parts.push({
          type: 'text',
          content: remainingText
        })
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }]
  }

  const parts = parseContent(content)

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div key={index} className="my-4">
              <SyntaxHighlighter
                language={part.language}
                style={oneDark}
                customStyle={{
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
                wrapLongLines={true}
              >
                {part.content}
              </SyntaxHighlighter>
            </div>
          )
        } else {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.content}
            </div>
          )
        }
      })}
    </div>
  )
}
