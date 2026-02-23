const DEFAULT_NUTS_API_BASE = "http://127.0.0.1:8000";
const NUTS_API_BASE = (
	import.meta.env.VITE_NUTS_API_BASE || DEFAULT_NUTS_API_BASE
).replace(/\/$/, "");

export const nutsApiUrl = (
	path: string,
	queryParams?: Record<string, string | undefined>,
): string => {
	const url = new URL(
		path.startsWith("/") ? path : `/${path}`,
		`${NUTS_API_BASE}/`,
	);

	if (queryParams) {
		for (const [key, value] of Object.entries(queryParams)) {
			if (value) url.searchParams.set(key, value);
		}
	}

	return url.toString();
};
