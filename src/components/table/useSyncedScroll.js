import { useRef, useEffect, useCallback } from 'react'

/**
 * Drives a horizontal scrollbar rendered ABOVE a wide table.
 *
 * The strip is an empty scroll container holding a 1px-tall spacer whose width
 * mirrors the table's scrollWidth; scroll positions are synced both ways. The
 * table's own bottom scrollbar is hidden via the .hide-h-scrollbar class.
 */
export function useSyncedScroll() {
  const topRef = useRef(null)
  const innerRef = useRef(null)
  const bodyRef = useRef(null)
  // Guards the two scroll handlers against re-entering each other.
  const syncing = useRef(false)

  const measure = useCallback(() => {
    if (bodyRef.current && innerRef.current) {
      innerRef.current.style.width = bodyRef.current.scrollWidth + 'px'
    }
  }, [])

  useEffect(() => {
    measure()
    if (!bodyRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(bodyRef.current)
    if (bodyRef.current.firstElementChild) observer.observe(bodyRef.current.firstElementChild)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const onTopScroll = useCallback(() => {
    if (syncing.current || !topRef.current || !bodyRef.current) return
    syncing.current = true
    bodyRef.current.scrollLeft = topRef.current.scrollLeft
    syncing.current = false
  }, [])

  const onBodyScroll = useCallback(() => {
    measure()
    if (syncing.current || !topRef.current || !bodyRef.current) return
    syncing.current = true
    topRef.current.scrollLeft = bodyRef.current.scrollLeft
    syncing.current = false
  }, [measure])

  return { topRef, innerRef, bodyRef, onTopScroll, onBodyScroll }
}
