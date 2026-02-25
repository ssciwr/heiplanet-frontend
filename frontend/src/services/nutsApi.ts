const DEFAULT_API_BASE = "/api";
const API_BASE = (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE).replace(
	/\/+$/,
	"",
);

export const nutsApiUrl = (
	path: string,
	queryParams?: Record<string, string | undefined>,
): string => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const urlWithoutQuery = `${API_BASE}${normalizedPath}`;

	const searchParams = new URLSearchParams();
	if (queryParams) {
		for (const [key, value] of Object.entries(queryParams)) {
			if (value) searchParams.set(key, value);
		}
	}

	const queryString = searchParams.toString();
	return queryString ? `${urlWithoutQuery}?${queryString}` : urlWithoutQuery;
};
