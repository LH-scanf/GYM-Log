import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlaceholderPage } from './placeholder-page'

describe('PlaceholderPage', () => {
  it('renders the supplied page heading and description', () => {
    render(<PlaceholderPage description="训练历史将显示在这里。" title="训练" />)

    expect(screen.getByRole('heading', { name: '训练' })).toBeInTheDocument()
    expect(screen.getByText('训练历史将显示在这里。')).toBeInTheDocument()
  })
})
