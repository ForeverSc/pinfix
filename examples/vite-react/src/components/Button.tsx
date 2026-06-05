import React from 'react'

interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 6,
        border: isPrimary ? 'none' : '1px solid #d0d0d0',
        background: isPrimary ? '#0070ea' : '#fff',
        color: isPrimary ? '#fff' : '#333',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  )
}

export default Button
