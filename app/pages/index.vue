<script setup lang="ts">
import DOMPurify from "dompurify";

const OPERATIONS = [
	{
		label: "HTML Conversion",
		value: "html",
		icon: "i-lucide-code",
		description: "Convert PDF to a full HTML string",
	},
	{
		label: "Text Extraction",
		value: "text",
		icon: "i-lucide-file-text",
		description: "Extract plain text content",
	},
	{
		label: "Pages (per-page)",
		value: "pages",
		icon: "i-lucide-layout",
		description: "Get HTML or text per page",
	},
	{
		label: "Metadata",
		value: "meta",
		icon: "i-lucide-info",
		description: "Extract title, author, dates, etc.",
	},
	{
		label: "Thumbnail",
		value: "thumbnail",
		icon: "i-lucide-image",
		description: "Generate a page preview image",
	},
	{
		label: "Extract Images",
		value: "images",
		icon: "i-lucide-images",
		description: "Extract all embedded images",
	},
] as const;

type Operation = (typeof OPERATIONS)[number]["value"];

// Form state
const apiKey = ref("");
const files = ref<File | null>(null);
const operation = ref<Operation>("html");
const textMode = ref(false);
const thumbnailPage = ref(1);
const thumbnailImageType = ref<"png" | "jpg">("png");
const thumbnailWidth = ref<number | undefined>(undefined);
const thumbnailHeight = ref<number | undefined>(undefined);

// Result state
const loading = ref(false);
const result = ref<Record<string, unknown> | null>(null);
const error = ref<string | null>(null);

const toast = useToast();

const selectedFile = computed(() => files.value);

const selectedOp = computed(() => OPERATIONS.find((o) => o.value === operation.value)!);

async function submit() {
	if (!selectedFile.value) {
		toast.add({
			title: "No file selected",
			description: "Please upload a PDF file first.",
			color: "error",
			icon: "i-lucide-alert-circle",
		});
		return;
	}
	if (!apiKey.value.trim()) {
		toast.add({
			title: "No API key",
			description: "Enter an API key to authenticate.",
			color: "error",
			icon: "i-lucide-key",
		});
		return;
	}

	loading.value = true;
	result.value = null;
	error.value = null;

	try {
		const formData = new FormData();
		formData.append("file", selectedFile.value as File);

		let url = `/api/convert/${operation.value}`;
		const params = new URLSearchParams();

		if (operation.value === "pages" && textMode.value) params.set("text", "true");
		if (operation.value === "thumbnail") {
			params.set("page", String(thumbnailPage.value));
			params.set("imageType", thumbnailImageType.value);
			if (thumbnailWidth.value) params.set("width", String(thumbnailWidth.value));
			if (thumbnailHeight.value) params.set("height", String(thumbnailHeight.value));
		}

		if (params.toString()) url += `?${params.toString()}`;

		const res = await $fetch<{ success: boolean; data?: unknown; error?: string }>(url, {
			method: "POST",
			body: formData,
			headers: { "X-API-Key": apiKey.value.trim() },
		});

		if (res.success) {
			result.value = res.data as Record<string, unknown>;
			toast.add({
				title: "Success",
				description: `${selectedOp.value.label} completed.`,
				color: "success",
				icon: "i-lucide-check-circle",
			});
		} else {
			error.value = (res.error as string) ?? "Unknown error";
		}
	} catch (err: unknown) {
		const msg =
			(err as { data?: { error?: string }; message?: string })?.data?.error ??
			(err as { message?: string })?.message ??
			"Request failed";
		error.value = msg;
	} finally {
		loading.value = false;
	}
}

function reset() {
	files.value = null;
	result.value = null;
	error.value = null;
}

/**
 * Sanitize HTML with DOMPurify before putting it into an iframe srcdoc.
 * WHOLE_DOCUMENT: true so the full <html>/<head>/<body> structure is preserved.
 */
function sanitize(html: string, wholeDocument = true): string {
	return DOMPurify.sanitize(html, {
		WHOLE_DOCUMENT: wholeDocument,
		FORCE_BODY: false,
		ADD_TAGS: ["meta"],
		ADD_ATTR: ["content", "name", "xmlns", "http-equiv"],
	});
}

/**
 * Wrap a body fragment in a minimal HTML shell so it can be used as iframe srcdoc.
 */
function wrapFragment(html: string): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:14px;line-height:1.6;padding:12px;margin:0}</style></head><body>${sanitize(html, false)}</body></html>`;
}

/** Full sanitized document string for the html operation result. */
const sanitizedFullHtml = computed((): string => {
	if (operation.value !== "html" || !result.value?.html) return "";
	return sanitize(result.value.html as string, true);
});
</script>

<template>
	<UContainer class="py-10 max-w-4xl">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-highlighted mb-1">p2h-service</h1>
			<p class="text-muted text-base">
				PDF conversion test console — powered by Apache Tika & PDFBox
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
			<!-- Left: Form -->
			<div class="lg:col-span-2 flex flex-col gap-4">
				<!-- API Key -->
				<UCard>
					<template #header>
						<div class="flex items-center gap-2">
							<UIcon name="i-lucide-key" class="size-4 text-muted" />
							<span class="text-sm font-medium">API Key</span>
						</div>
					</template>
					<UInput
						v-model="apiKey"
						type="password"
						placeholder="Enter your API key"
						autocomplete="off"
					/>
				</UCard>

				<!-- File Upload -->
				<UCard>
					<template #header>
						<div class="flex items-center gap-2">
							<UIcon name="i-lucide-upload" class="size-4 text-muted" />
							<span class="text-sm font-medium">PDF File</span>
						</div>
					</template>
					<UFileUpload v-model="files" accept=".pdf,application/pdf" class="w-full">
						<template #default="{ open }">
							<div
								class="border-2 border-dashed border-default rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
								@click="open()"
							>
								<template v-if="selectedFile">
									<UIcon
										name="i-lucide-file-check"
										class="size-8 text-success mx-auto mb-2"
									/>
									<p
										class="text-sm font-medium text-highlighted truncate max-w-full"
									>
										{{ selectedFile.name }}
									</p>
									<p class="text-xs text-muted mt-1">
										{{ (selectedFile.size / 1024).toFixed(1) }} KB
									</p>
								</template>
								<template v-else>
									<UIcon
										name="i-lucide-file-up"
										class="size-8 text-muted mx-auto mb-2"
									/>
									<p class="text-sm text-muted">Click to upload a PDF</p>
								</template>
							</div>
						</template>
					</UFileUpload>
					<UButton
						v-if="selectedFile"
						variant="ghost"
						color="neutral"
						size="xs"
						icon="i-lucide-x"
						class="mt-2"
						@click="reset()"
					>
						Clear
					</UButton>
				</UCard>

				<!-- Operation -->
				<UCard>
					<template #header>
						<div class="flex items-center gap-2">
							<UIcon name="i-lucide-settings-2" class="size-4 text-muted" />
							<span class="text-sm font-medium">Operation</span>
						</div>
					</template>
					<div class="flex flex-col gap-2">
						<div
							v-for="op in OPERATIONS"
							:key="op.value"
							class="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors"
							:class="
								operation === op.value
									? 'bg-primary/10 text-primary'
									: 'hover:bg-elevated'
							"
							@click="operation = op.value"
						>
							<UIcon :name="op.icon" class="size-4 shrink-0" />
							<div class="min-w-0">
								<p class="text-sm font-medium">{{ op.label }}</p>
								<p class="text-xs text-muted">{{ op.description }}</p>
							</div>
						</div>
					</div>
				</UCard>

				<!-- Operation-specific options -->
				<UCard v-if="operation === 'pages' || operation === 'thumbnail'">
					<template #header>
						<div class="flex items-center gap-2">
							<UIcon name="i-lucide-sliders-horizontal" class="size-4 text-muted" />
							<span class="text-sm font-medium">Options</span>
						</div>
					</template>

					<!-- Pages options -->
					<div v-if="operation === 'pages'" class="flex items-center gap-3">
						<USwitch v-model="textMode" />
						<span class="text-sm">Extract text instead of HTML</span>
					</div>

					<!-- Thumbnail options -->
					<div v-if="operation === 'thumbnail'" class="flex flex-col gap-3">
						<div class="flex items-center gap-3">
							<span class="text-sm w-24 shrink-0">Page</span>
							<UInputNumber v-model="thumbnailPage" :min="1" class="flex-1" />
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm w-24 shrink-0">Image type</span>
							<USelect
								v-model="thumbnailImageType"
								:items="[
									{ label: 'PNG', value: 'png' },
									{ label: 'JPG', value: 'jpg' },
								]"
								value-key="value"
								class="flex-1"
							/>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm w-24 shrink-0">Width (px)</span>
							<UInputNumber
								v-model="thumbnailWidth"
								:min="1"
								placeholder="Default"
								class="flex-1"
							/>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-sm w-24 shrink-0">Height (px)</span>
							<UInputNumber
								v-model="thumbnailHeight"
								:min="1"
								placeholder="Default"
								class="flex-1"
							/>
						</div>
					</div>
				</UCard>

				<!-- Submit -->
				<UButton
					:loading="loading"
					:disabled="!selectedFile || !apiKey"
					size="lg"
					icon="i-lucide-play"
					class="w-full justify-center"
					@click="submit()"
				>
					Run {{ selectedOp.label }}
				</UButton>
			</div>

			<!-- Right: Results -->
			<div class="lg:col-span-3">
				<UCard class="h-full min-h-96">
					<template #header>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<UIcon name="i-lucide-terminal" class="size-4 text-muted" />
								<span class="text-sm font-medium">Result</span>
							</div>
							<UBadge
								v-if="result"
								color="success"
								variant="subtle"
								icon="i-lucide-check"
								label="OK"
							/>
							<UBadge
								v-else-if="error"
								color="error"
								variant="subtle"
								icon="i-lucide-alert-circle"
								label="Error"
							/>
						</div>
					</template>

					<!-- Loading -->
					<div
						v-if="loading"
						class="flex flex-col items-center justify-center py-16 gap-3"
					>
						<UIcon
							name="i-lucide-loader-circle"
							class="size-8 text-primary animate-spin"
						/>
						<p class="text-sm text-muted">Processing PDF...</p>
					</div>

					<!-- Error -->
					<UAlert
						v-else-if="error"
						color="error"
						variant="subtle"
						icon="i-lucide-alert-circle"
						title="Conversion failed"
						:description="error"
					/>

					<!-- Empty state -->
					<UEmpty
						v-else-if="!result"
						icon="i-lucide-file-search"
						title="No results yet"
						description="Upload a PDF, choose an operation, and click Run."
					/>

					<!-- Results -->
					<div v-else class="space-y-4">
						<!-- HTML result -->
						<template v-if="operation === 'html' && result.html">
							<div class="text-xs text-muted mb-2">Rendered HTML output</div>
							<iframe
								:srcdoc="sanitizedFullHtml"
								sandbox="allow-same-origin"
								class="w-full rounded-md border border-default bg-white"
								style="height: 600px;"
								title="PDF HTML preview"
							/>
						</template>

						<!-- Text result -->
						<template v-else-if="operation === 'text' && result.text">
							<div class="text-xs text-muted mb-2">Extracted text</div>
							<pre
								class="p-4 bg-elevated rounded-md text-sm max-h-[600px] overflow-auto whitespace-pre-wrap border border-default"
								>{{ result.text }}</pre
							>
						</template>

						<!-- Pages result -->
						<template v-else-if="operation === 'pages' && Array.isArray(result.pages)">
							<div class="text-xs text-muted mb-2">
								{{ (result.pages as string[]).length }} page(s) — mode:
								{{ result.mode }}
							</div>
							<UAccordion
								:items="
									(result.pages as string[]).map((page, i) => ({
										label: `Page ${i + 1}`,
										content: page,
									}))
								"
								type="multiple"
							>
								<template #content="{ item }">
									<iframe
										v-if="result.mode === 'html'"
										:srcdoc="wrapFragment(item.content)"
										sandbox="allow-same-origin"
										class="w-full rounded-md border border-default bg-white"
										style="height: 400px;"
										title="PDF page preview"
									/>
									<pre v-else class="p-3 text-sm whitespace-pre-wrap">{{
										item.content
									}}</pre>
								</template>
							</UAccordion>
						</template>

						<!-- Meta result -->
						<template v-else-if="operation === 'meta' && result.meta">
							<div class="text-xs text-muted mb-2">Document metadata</div>
							<div
								class="divide-y divide-default rounded-md border border-default overflow-hidden"
							>
								<div
									v-for="[k, v] in Object.entries(
										result.meta as Record<string, unknown>,
									)"
									:key="k"
									class="flex gap-3 px-3 py-2 text-sm hover:bg-elevated"
								>
									<span
										class="font-mono text-xs text-muted w-48 shrink-0 truncate pt-0.5"
										>{{ k }}</span
									>
									<span class="text-highlighted break-all">{{ v }}</span>
								</div>
							</div>
						</template>

						<!-- Thumbnail result -->
						<template v-else-if="operation === 'thumbnail' && result.image">
							<div class="text-xs text-muted mb-2">
								Thumbnail — {{ result.mimeType }}
							</div>
							<img
								:src="`data:${result.mimeType};base64,${result.image}`"
								alt="PDF thumbnail"
								class="rounded-md border border-default max-w-full"
							/>
						</template>

						<!-- Images result -->
						<template
							v-else-if="operation === 'images' && Array.isArray(result.images)"
						>
							<div class="text-xs text-muted mb-2">
								{{ (result.images as unknown[]).length }} embedded image(s)
							</div>
							<div
								v-if="(result.images as unknown[]).length === 0"
								class="text-sm text-muted"
							>
								No embedded images found in this PDF.
							</div>
							<div v-else class="grid grid-cols-2 gap-3">
								<div
									v-for="(img, i) in result.images as {
										data: string;
										mimeType: string;
									}[]"
									:key="i"
									class="rounded-md border border-default overflow-hidden"
								>
									<img
										:src="`data:${img.mimeType};base64,${img.data}`"
										:alt="`Image ${i + 1}`"
										class="w-full object-contain"
									/>
									<p class="text-xs text-muted px-2 py-1 bg-elevated">
										{{ img.mimeType }}
									</p>
								</div>
							</div>
						</template>
					</div>
				</UCard>
			</div>
		</div>
	</UContainer>
</template>
