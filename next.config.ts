import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactStrictMode: true,
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: '/desktop',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{
						key: 'Cache-Control',
						value: 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
					},
					{ key: 'Content-Type', value: 'application/json; charset=utf-8' },
				],
			},
			{
				source: '/desktop/:channel(beta|stable)/:feed*.json',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{
						key: 'Cache-Control',
						value: 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
					},
					{ key: 'Content-Type', value: 'application/json; charset=utf-8' },
				],
			},
			{
				source: '/desktop/releases/:asset*',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
		];
	},
	async rewrites() {
		return [
			{
				source: '/desktop',
				destination: '/desktop/beta/darwin-arm64.json',
			},
		];
	},
};

export default nextConfig;
