import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { format, resolveConfig } from 'prettier'

const TEMPLATE_PATH = 'docs/landing.template.html'
const LOCALE_PATHS = ['docs/locales/en.json', 'docs/locales/zh-CN.json']
const OUTPUT_DIR = 'docs-dist'
const SITE_BASE_URL = 'https://foreversc.github.io/pinfix'
const TODAY = '2026-07-05'
const RAW_HTML_KEYS = new Set(['heroTitle'])

const checkOnly = process.argv.includes('--check')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function normalizeOutput(value) {
  return `${value.trimEnd()}\n`
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function assertLocale(locale, template) {
  const tokens = [...template.matchAll(/{{(?:json )?([a-zA-Z0-9]+)}}/g)].map((match) => match[1])
  const missing = [...new Set(tokens)].filter((token) => !(token in locale))

  if (missing.length > 0) {
    throw new Error(`${locale.outputPath}: missing locale keys: ${missing.join(', ')}`)
  }
}

async function renderTemplate(template, locale) {
  assertLocale(locale, template)

  const html = template.replace(/{{(json )?([a-zA-Z0-9]+)}}/g, (_match, jsonPrefix, key) => {
    const value = locale[key]
    if (jsonPrefix) {
      return JSON.stringify(value)
    }

    return RAW_HTML_KEYS.has(key) ? String(value) : escapeHtml(value)
  })

  const prettierConfig = (await resolveConfig(locale.outputPath)) ?? {}
  return normalizeOutput(await format(html, { ...prettierConfig, parser: 'html' }))
}

function renderSitemap(locales) {
  const alternateLinks = locales
    .map(
      (locale) =>
        `    <xhtml:link rel="alternate" hreflang="${locale.htmlLang === 'zh-CN' ? 'zh-CN' : 'en'}" href="${locale.canonicalUrl}" />`,
    )
    .join('\n')
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_BASE_URL}/" />`

  const urls = locales
    .map(
      (locale) => `  <url>
    <loc>${locale.canonicalUrl}</loc>
    <lastmod>${TODAY}</lastmod>
${alternateLinks}
${xDefault}
  </url>`,
    )
    .join('\n')

  return normalizeOutput(`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls}
</urlset>`)
}

function renderLlms() {
  return normalizeOutput(`# PinFix

> PinFix is a dev-only browser overlay for Claude Code-powered visual frontend editing.

## Core Pages

- English homepage: ${SITE_BASE_URL}/
- Chinese homepage: ${SITE_BASE_URL}/zh/
- GitHub repository: https://github.com/ForeverSc/pinfix
- npm package: https://www.npmjs.com/package/@pinfix/plugin

## What It Does

PinFix lets developers click UI elements in a local dev server, attach visual change requests, and send Claude Code the exact source location and design intent. It is designed for development-time frontend editing, not production user sessions.

## Supported Stacks

- Vite
- Webpack
- Rspack
- React
- Vue
- JSX and TSX component code

## Key Concepts

- Browser overlay: PinFix injects a dev-only UI into the page.
- Visual selection: developers click the UI element they want to change.
- Source mapping: build-time transforms attach source file, line, and column metadata.
- Claude Code handoff: PinFix sends the selected source location and visual intent to Claude Code.
- HMR feedback: source edits appear in the browser through the app's dev server.

## Chinese Summary

PinFix 是面向 Claude Code 的开发期浏览器可视化前端编辑工具。开发者可以在本地页面上点击任意 UI 元素，描述修改需求，或使用检查器式控件调整视觉细节。PinFix 会把精确源码位置和视觉意图发送给 Claude Code，让修改直接落到源文件中，并通过 HMR 即时反馈。`)
}

function renderRobots() {
  return normalizeOutput(`# On GitHub project Pages this file is published at /pinfix/robots.txt.
# Crawler-wide robots rules are only auto-read from the origin root, for example:
# https://foreversc.github.io/robots.txt
# This file becomes authoritative if PinFix is served from a custom domain root.

User-agent: *
Allow: /

Sitemap: ${SITE_BASE_URL}/sitemap.xml`)
}

async function writeOrCheck(path, nextContent) {
  if (checkOnly) {
    return
  }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, nextContent)
}

async function main() {
  const template = await readFile(TEMPLATE_PATH, 'utf8')
  const locales = await Promise.all(LOCALE_PATHS.map(readJson))

  for (const locale of locales) {
    await writeOrCheck(locale.outputPath, await renderTemplate(template, locale))
  }

  await writeOrCheck(`${OUTPUT_DIR}/sitemap.xml`, renderSitemap(locales))
  await writeOrCheck(`${OUTPUT_DIR}/llms.txt`, renderLlms())
  await writeOrCheck(`${OUTPUT_DIR}/robots.txt`, renderRobots())
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
