import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ImageUploader } from '@/components/analysis/ImageUploader'
import { renderWithProviders } from '@/test/utils'

const jpeg = (name = 'room.jpg', size = 1024) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' })

describe('ImageUploader', () => {
  it('renders an accessible drop zone with the configured limit', () => {
    renderWithProviders(<ImageUploader file={null} onSelect={vi.fn()} maxMb={10} />)
    expect(screen.getByRole('button', { name: /upload a room photograph/i })).toBeInTheDocument()
    expect(screen.getByText(/up to 10 MB/i)).toBeInTheDocument()
  })

  it('accepts a valid JPEG', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <ImageUploader file={null} onSelect={onSelect} maxMb={10} />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, jpeg())
    await waitFor(() => expect(onSelect).toHaveBeenCalled())
  })

  it('rejects an unsupported file type', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <ImageUploader file={null} onSelect={onSelect} maxMb={10} />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'notes.pdf', { type: 'application/pdf' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/not supported/i)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('rejects an oversized image', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <ImageUploader file={null} onSelect={onSelect} maxMb={1} />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, jpeg('big.jpg', 2 * 1024 * 1024))

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit is 1 MB/i)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
