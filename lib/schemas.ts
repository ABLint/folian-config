import { z } from 'zod';

export const configurationEnvelopeSchema = z.object({
	configurationVersion: z.number().int().nonnegative(),
	publishedAt: z.string().datetime(),
	schemaVersion: z.string().min(1),
});

export const modelCapabilitiesSchema = z.object({
	streaming: z.boolean(),
	vision: z.boolean(),
	reasoning: z.boolean(),
	toolCalling: z.boolean(),
	jsonMode: z.boolean(),
	promptCaching: z.boolean(),
	contextWindow: z.number().int().positive(),
	maxOutputTokens: z.number().int().positive(),
	temperature: z.boolean(),
	mcpCompatible: z.boolean(),
});

export const modelSchema = z.object({
	id: z.string().min(1).max(160),
	provider: z.string().min(1).max(80),
	displayName: z.string().min(1).max(180),
	recommended: z.boolean(),
	deprecated: z.boolean(),
	capabilities: modelCapabilitiesSchema,
	tags: z.array(z.string().min(1).max(80)).default([]),
});

export const providerSchema = z.object({
	id: z.string().min(1).max(80),
	displayName: z.string().min(1).max(120),
	status: z.enum(['available', 'degraded', 'deprecated', 'hidden']),
	models: z.array(modelSchema).default([]),
});

export const modelsDocumentSchema = configurationEnvelopeSchema.extend({
	providers: z.array(providerSchema),
});

export const providersDocumentSchema = configurationEnvelopeSchema.extend({
	providers: z.array(
		z.object({
			id: z.string().min(1).max(80),
			displayName: z.string().min(1).max(120),
			status: z.enum(['available', 'degraded', 'deprecated', 'hidden']),
			authMode: z.enum(['api_key', 'optional_api_key', 'none']),
			endpointType: z.enum(['hosted', 'aggregator', 'custom', 'local']),
			publicDocsUrl: z.string().url().optional(),
			supportsCustomModelId: z.boolean(),
		})
	),
});

export const releasesDocumentSchema = configurationEnvelopeSchema.extend({
	desktop: z.object({
		stable: z.object({
			version: z.string(),
			minimumVersion: z.string(),
			publishedAt: z.string().datetime(),
			mandatory: z.boolean(),
			manifestUrl: z.string().url(),
		}),
		beta: z.object({
			version: z.string(),
			minimumVersion: z.string(),
			publishedAt: z.string().datetime(),
			mandatory: z.boolean(),
			manifestUrl: z.string().url(),
		}),
	}),
});

export const featuresDocumentSchema = configurationEnvelopeSchema.extend({
	features: z.record(
		z.string(),
		z.object({
			enabled: z.boolean(),
			description: z.string(),
			channels: z.array(z.enum(['stable', 'beta', 'development'])),
		})
	),
});

export const releaseNotesDocumentSchema = configurationEnvelopeSchema.extend({
	notes: z.array(
		z.object({
			version: z.string(),
			publishedAt: z.string().datetime(),
			channel: z.enum(['stable', 'beta', 'development']),
			title: z.string(),
			items: z.array(z.string()),
		})
	),
});

export const capabilitiesDocumentSchema = configurationEnvelopeSchema.extend({
	capabilities: z.record(
		z.string(),
		z.object({
			displayName: z.string(),
			description: z.string(),
		})
	),
});

export type ModelsDocument = z.infer<typeof modelsDocumentSchema>;
export type ProvidersDocument = z.infer<typeof providersDocumentSchema>;
export type ReleasesDocument = z.infer<typeof releasesDocumentSchema>;
export type FeaturesDocument = z.infer<typeof featuresDocumentSchema>;
export type ReleaseNotesDocument = z.infer<typeof releaseNotesDocumentSchema>;
export type CapabilitiesDocument = z.infer<typeof capabilitiesDocumentSchema>;
