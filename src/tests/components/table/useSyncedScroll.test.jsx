import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useSyncedScroll } from '@/components/table/useSyncedScroll'

function Harness() {
  const { topRef, innerRef, bodyRef, onTopScroll, onBodyScroll } = useSyncedScroll()
  return (
    <div>
      <div data-testid="strip" ref={topRef} onScroll={onTopScroll}>
        <div data-testid="inner" ref={innerRef} />
      </div>
      <div data-testid="body" ref={bodyRef} onScroll={onBodyScroll}>
        <table><tbody><tr><td>wide</td></tr></tbody></table>
      </div>
    </div>
  )
}

describe('useSyncedScroll', () => {
  it('mirrors the body scrollWidth onto the strip spacer', () => {
    render(<Harness />)
    const body = screen.getByTestId('body')
    Object.defineProperty(body, 'scrollWidth', { value: 1800, configurable: true })
    fireEvent.scroll(body)
    expect(screen.getByTestId('inner').style.width).toBe('1800px')
  })

  it('scrolling the strip scrolls the body', () => {
    render(<Harness />)
    const strip = screen.getByTestId('strip')
    const body = screen.getByTestId('body')
    strip.scrollLeft = 240
    fireEvent.scroll(strip)
    expect(body.scrollLeft).toBe(240)
  })

  it('scrolling the body scrolls the strip', () => {
    render(<Harness />)
    const strip = screen.getByTestId('strip')
    const body = screen.getByTestId('body')
    body.scrollLeft = 120
    fireEvent.scroll(body)
    expect(strip.scrollLeft).toBe(120)
  })
})
