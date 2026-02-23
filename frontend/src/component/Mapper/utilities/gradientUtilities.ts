import { TEMP_COLORS } from "./mapDataUtils";

interface ExtremePoints {
	min: number;
	max: number;
}

interface RGBColor {
	r: number;
	g: number;
	b: number;
}

function hexToRgb(hex: string): RGBColor {
	const cleanHex = hex.replace("#", "").toUpperCase();

	if (!/^[0-9A-F]{6}$/.test(cleanHex)) {
		throw new Error(`Invalid hex color format: ${hex}`);
	}

	return {
		r: Number.parseInt(cleanHex.slice(0, 2), 16),
		g: Number.parseInt(cleanHex.slice(2, 4), 16),
		b: Number.parseInt(cleanHex.slice(4, 6), 16),
	};
}

function rgbToHex(rgb: RGBColor): string {
	const toHex = (value: number): string => {
		const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};

	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export const getColorFromGradient = (
	value: number,
	extremePoints: ExtremePoints,
	minColor?: string,
	maxColor?: string,
): string => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error("Value must be a finite number");
	}

	if (
		!extremePoints ||
		typeof extremePoints.min !== "number" ||
		typeof extremePoints.max !== "number"
	) {
		throw new Error("ExtremePoints must contain valid min and max numbers");
	}

	const { min, max } = extremePoints;

	if (min === max) {
		return minColor || TEMP_COLORS[0];
	}

	// Clamp the value to the range [min, max]
	const clampedValue = Math.max(min, Math.min(max, value));

	const factor = (clampedValue - min) / (max - min);

	// If custom colors are provided, use them
	if (minColor && maxColor) {
		const minRgb = hexToRgb(minColor);
		const maxRgb = hexToRgb(maxColor);

		const interpolatedRgb: RGBColor = {
			r: minRgb.r + (maxRgb.r - minRgb.r) * factor,
			g: minRgb.g + (maxRgb.g - minRgb.g) * factor,
			b: minRgb.b + (maxRgb.b - minRgb.b) * factor,
		};

		return rgbToHex(interpolatedRgb);
	}

	// Use the temperature color palette
	const segmentSize = 1 / (TEMP_COLORS.length - 1);
	const segmentIndex = Math.min(
		Math.floor(factor / segmentSize),
		TEMP_COLORS.length - 2,
	);
	const localFactor = (factor - segmentIndex * segmentSize) / segmentSize;

	const startColor = hexToRgb(TEMP_COLORS[segmentIndex]);
	const endColor = hexToRgb(TEMP_COLORS[segmentIndex + 1]);

	const interpolatedRgb: RGBColor = {
		r: startColor.r + (endColor.r - startColor.r) * localFactor,
		g: startColor.g + (endColor.g - startColor.g) * localFactor,
		b: startColor.b + (endColor.b - startColor.b) * localFactor,
	};

	const finalColor = rgbToHex(interpolatedRgb);

	return finalColor;
};
