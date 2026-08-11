import Image from 'next/image'

/** Intrinsic pixel size of the exact `/public/logo.png` copy (do not resize the source asset). */
export const ALIASARR_LOGO = {
  src: '/logo.png',
  width: 1024,
  height: 682,
} as const

export interface BrandLogoProps {
  /** Display height in CSS pixels; width follows the intrinsic aspect ratio. */
  height?: number
  className?: string
  priority?: boolean
  alt?: string
}

/**
 * Brand mark served from `/logo.png` (byte-identical public copy).
 * `unoptimized` keeps Next from re-encoding the asset.
 */
export function BrandLogo({ height = 36, className = '', priority = false, alt = 'Aliasarr' }: BrandLogoProps) {
  const width = Math.round((height * ALIASARR_LOGO.width) / ALIASARR_LOGO.height)
  return (
    <Image
      src={ALIASARR_LOGO.src}
      alt={alt}
      width={ALIASARR_LOGO.width}
      height={ALIASARR_LOGO.height}
      priority={priority}
      unoptimized
      className={`max-w-none object-contain ${className}`}
      style={{ width, height }}
    />
  )
}
