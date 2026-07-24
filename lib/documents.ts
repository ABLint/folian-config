import capabilities from '../data/capabilities.json';
import features from '../data/features.json';
import models from '../data/models.json';
import providers from '../data/providers.json';
import releaseNotes from '../data/release-notes.json';
import releases from '../data/releases.json';
import type {
	CapabilitiesDocument,
	FeaturesDocument,
	ModelsDocument,
	ProvidersDocument,
	ReleaseNotesDocument,
	ReleasesDocument,
} from './schemas';

export const modelsDocument = models as ModelsDocument;
export const providersDocument = providers as ProvidersDocument;
export const releasesDocument = releases as ReleasesDocument;
export const featuresDocument = features as FeaturesDocument;
export const releaseNotesDocument = releaseNotes as ReleaseNotesDocument;
export const capabilitiesDocument = capabilities as CapabilitiesDocument;
