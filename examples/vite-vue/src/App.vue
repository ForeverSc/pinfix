<template>
  <div :style="{ minHeight: '100vh', background: '#fafafa', fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` }">
    <header :style="{ background: '#1a1a2e', color: '#fff', padding: '32px 40px' }">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '960px', margin: '0 auto' }">
        <h1 :style="{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }">
          <span style="color: #0070ea">Pin</span>Fix
        </h1>
        <span :style="{ background: '#0070ea22', color: '#0070ea', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }">
          Vue + Vite
        </span>
      </div>
      <p :style="{ maxWidth: '960px', margin: '12px auto 0', color: '#a0a0b0', fontSize: '15px' }">
        Point at any component. Tell AI what to change. See it live.
      </p>
    </header>

    <section :style="{ maxWidth: '960px', margin: '0 auto', padding: '32px 40px' }">
      <h2 :style="{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px', color: '#333' }">Try it now</h2>
      <div :style="{ display: 'flex', gap: '24px', flexWrap: 'wrap' }">
        <div :style="stepStyle">
          <div :style="numStyle">1</div>
          <p :style="stepTextStyle">Press <kbd :style="kbdStyle">Alt</kbd> + <kbd :style="kbdStyle">Shift</kbd> + <kbd :style="kbdStyle">Z</kbd> to enter edit mode</p>
        </div>
        <div :style="stepStyle">
          <div :style="numStyle">2</div>
          <p :style="stepTextStyle">Click any element below to place a pin</p>
        </div>
        <div :style="stepStyle">
          <div :style="numStyle">3</div>
          <p :style="stepTextStyle">Describe your change — AI does the rest</p>
        </div>
      </div>
    </section>

    <section :style="{ maxWidth: '960px', margin: '0 auto', padding: '0 40px 40px' }">
      <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }">
        <Card title="Counter" hint="Try: make the button blue with rounded corners">
          <div :style="{ display: 'flex', alignItems: 'center', gap: '12px' }">
            <Button @click="count++">Count is {{ count }}</Button>
            <Button variant="secondary" @click="count = 0">Reset</Button>
          </div>
        </Card>

        <Card title="Profile" hint="Try: add a border and change layout to horizontal">
          <div :style="{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }">
            <div :style="{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #0070ea, #00c6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 600 }">P</div>
            <p :style="{ margin: 0, fontWeight: 600, color: '#333' }">PinFix User</p>
            <p :style="{ margin: 0, fontSize: '13px', color: '#666' }">Frontend Developer</p>
          </div>
        </Card>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Card from './components/Card.vue'
import Button from './components/Button.vue'

const count = ref(0)

const kbdStyle = { background: '#e8e8e8', border: '1px solid #d0d0d0', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', fontFamily: 'monospace' }
const stepStyle = { display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 200px' }
const numStyle = { width: '28px', height: '28px', borderRadius: '50%', background: '#0070ea', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, flexShrink: 0 }
const stepTextStyle = { margin: '0', fontSize: '14px', color: '#555', lineHeight: '1.6' }
</script>
