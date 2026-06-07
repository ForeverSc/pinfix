import React, { useState } from 'react'

function Card({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
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

function Button({
  onClick,
  children,
  variant = 'primary',
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
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

const kbdStyle: React.CSSProperties = {
  background: '#e8e8e8',
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 12,
  fontFamily: 'monospace',
}

function Step({ num, text }: { num: number; text: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: '1 1 200px' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#0070ea',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <p style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafafa',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header style={{ background: '#1a1a2e', color: '#fff', padding: '32px 40px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 960,
            margin: '0 auto',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#0070ea' }}>Pin</span>Fix
          </h1>
          <span
            style={{
              background: '#0070ea22',
              color: '#0070ea',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            React + Rspack
          </span>
        </div>
        <p style={{ maxWidth: 960, margin: '12px auto 0', color: '#a0a0b0', fontSize: 15 }}>
          Point at any component. Tell AI what to change. See it live.
        </p>
      </header>

      <section style={{ maxWidth: 960, margin: '0 auto', padding: '32px 40px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#333' }}>
          Try it now
        </h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Step
            num={1}
            text={
              <>
                Press <kbd style={kbdStyle}>Alt</kbd> + <kbd style={kbdStyle}>Shift</kbd> +{' '}
                <kbd style={kbdStyle}>Z</kbd> to enter edit mode
              </>
            }
          />
          <Step num={2} text="Click any element below to place a pin" />
          <Step num={3} text="Describe your change — AI does the rest" />
        </div>
      </section>

      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px 40px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          <Card title="Counter" hint='Try: "make the button blue with rounded corners"'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button onClick={() => setCount((c) => c + 1)}>Count is {count}</Button>
              <Button variant="secondary" onClick={() => setCount(0)}>
                Reset
              </Button>
            </div>
          </Card>

          <Card title="Profile" hint='Try: "add a border and change layout to horizontal"'>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0070ea, #00c6ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                P
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>PinFix User</p>
              <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Frontend Developer</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
