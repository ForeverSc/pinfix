import React from 'react'

interface CardProps {
  title: string
  hint?: string
  children: React.ReactNode
}

function Card({ title, hint, children }: CardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#333' }}>{title}</h3>
      {children}
      {hint && (
        <p style={{ margin: 0, fontSize: 12, color: '#999', fontStyle: 'italic' }}>{hint}</p>
      )}
    </div>
  )
}

export default Card
