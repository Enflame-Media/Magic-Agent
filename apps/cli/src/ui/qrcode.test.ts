/**
 * Tests for the QR code utility
 *
 * These tests verify the QR code generation functionality works correctly
 * and handles edge cases gracefully.
 */

import { describe, it, expect } from 'vitest'

import { displayQRCode } from './qrcode.js'

describe('QR Code Utility', () => {
  it('should render a small QR code without throwing for valid data', () => {
    const testUrl = 'handy://test'
    expect(() => displayQRCode(testUrl)).not.toThrow()
  })

  it('should throw an error for empty string', () => {
    expect(() => displayQRCode('')).toThrow('Cannot display QR code: data is empty or invalid')
  })

  it('should throw an error for whitespace-only string', () => {
    expect(() => displayQRCode('   ')).toThrow('Cannot display QR code: data is empty or invalid')
  })

  it('should throw an error for data exceeding QR code capacity', () => {
    const oversizedData = 'x'.repeat(3000) // Exceeds 2953 byte limit
    expect(() => displayQRCode(oversizedData)).toThrow('QR code data exceeds maximum capacity')
  })

  it('should accept data at exactly the capacity limit', () => {
    const maxSizeData = 'a'.repeat(2953) // Exactly at limit
    expect(() => displayQRCode(maxSizeData)).not.toThrow()
  })

  it('should handle URLs with special characters that are already encoded', () => {
    // This simulates the actual use case: happy:// URL with base64url-encoded data
    const authUrl = 'happy://terminal?dGVzdC1wdWJsaWMta2V5LWRhdGE'
    expect(() => displayQRCode(authUrl)).not.toThrow()
  })
})
