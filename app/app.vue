<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'p2h-service'
const description = 'Self-hosted PDF conversion service powered by Apache Tika and PDFBox. Converts PDFs to HTML, text, thumbnails, and more via a secure REST API.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-file-code-2" class="size-5 text-primary" />
          p2h-service
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
        <UButton
          to="https://github.com/shebinleo/pdf2html"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="pdf2html on GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          p2h-service — powered by Apache Tika &amp; PDFBox
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
