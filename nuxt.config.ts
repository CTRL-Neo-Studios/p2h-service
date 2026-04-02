// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/ui", "@nuxt/image"],

	devtools: {
		enabled: true,
	},

	css: ["~/assets/css/main.css"],

	routeRules: {
		"/api/**": { cors: false },
	},

	compatibilityDate: "2025-01-15",
});
