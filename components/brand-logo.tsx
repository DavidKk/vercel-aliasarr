import Image from 'next/image'

/** Intrinsic pixel size of `/public/logo.png` (do not resize the source asset). */
export const ALIASARR_LOGO = {
  src: '/logo.png',
  width: 1024,
  height: 682,
} as const

export interface BrandLogoProps {
  /** Square edge length in CSS pixels. */
  size?: number
  /** @deprecated Use `size`. Kept as an alias for the square edge. */
  height?: number
  className?: string
  priority?: boolean
  alt?: string
}

/**
 * Brand mark served from `/logo.png`.
 * Always rendered as a square; `unoptimized` keeps Next from re-encoding the asset.
 */
export function BrandLogo({ size, height = 36, className = '', priority = false, alt = 'Aliasarr' }: BrandLogoProps) {
  const edge = size ?? height
  return (
    <Image
      src={ALIASARR_LOGO.src}
      alt={alt}
      width={ALIASARR_LOGO.width}
      height={ALIASARR_LOGO.height}
      priority={priority}
      unoptimized
      className={`max-w-none object-contain ${className}`}
      style={{ width: edge, height: edge }}
    />
  )
}
