'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Props {
  content: string
  className?: string
}

function cleanMarkdown(raw: string): string {
  return raw
    .replace(/^```[\w]*\n?/m, '')
    .replace(/\n?```$/m, '')
    .replace(/<callout([^>]*)>/gi, '<blockquote$1>')
    .replace(/<\/callout>/gi, '</blockquote>')
    .trim()
}

export default function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={className || 'md-render'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {cleanMarkdown(content)}
      </ReactMarkdown>
    </div>
  )
}
