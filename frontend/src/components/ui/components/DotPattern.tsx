import type { SVGProps } from 'react'

export function DotPattern({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden className={className} {...props}>
      <pattern id="dot-pattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="currentColor" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
    </svg>
  )
}
