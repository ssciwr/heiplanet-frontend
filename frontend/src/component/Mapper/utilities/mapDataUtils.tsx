/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import type { DataExtremes, ModelOutputDataPoint } from "../types.ts";
import { getVariableDisplayName } from "./monthUtils";

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 10;

export const TEMP_COLORS = [
	"#4c1d4b", // Deep purple
	"#663399", // Purple
	"#7b4397", // Purple-blue
	"#2e86ab", // Blue
	"#39a97e", // Teal-green
	"#56c579", // Light green
	"#a7d88f", // Pale green
	"#e2fba2", // Very light green/yellow
];

export const Legend = ({
	extremes,
	unit = "R0",
}: { extremes: DataExtremes; unit?: string }) => {
	const [desktopOffsets, setDesktopOffsets] = useState({
		top: 136,
		bottom: 144,
	});

	useEffect(() => {
		if (isMobile || typeof window === "undefined") return;

		const updateLegendOffsets = () => {
			const headerEl = document.querySelector(".map-header");
			const timelineEl = document.querySelector(
				"[data-testid='timeline-selector']",
			);
			const headerHeight =
				headerEl instanceof HTMLElement
					? headerEl.getBoundingClientRect().height
					: 120;
			const timelineHeight =
				timelineEl instanceof HTMLElement
					? timelineEl.getBoundingClientRect().height
					: 128;

			setDesktopOffsets({
				top: Math.round(headerHeight + 16),
				bottom: Math.round(timelineHeight + 16),
			});
		};

		updateLegendOffsets();

		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => updateLegendOffsets());

			const headerEl = document.querySelector(".map-header");
			const timelineEl = document.querySelector(
				"[data-testid='timeline-selector']",
			);

			if (headerEl instanceof HTMLElement) resizeObserver.observe(headerEl);
			if (timelineEl instanceof HTMLElement) resizeObserver.observe(timelineEl);
		}

		window.addEventListener("resize", updateLegendOffsets);
		return () => {
			window.removeEventListener("resize", updateLegendOffsets);
			resizeObserver?.disconnect();
		};
	}, []);

	if (!extremes) return null;

	const totalRange = extremes.max - extremes.min;
	const displayUnit = getVariableDisplayName(unit);

	// Mobile timeline styles - full width, integrated with timeline
	if (isMobile) {
		const roundedMin = Math.round(extremes.min * 100) / 100;
		const roundedMax = Math.round(extremes.max * 100) / 100;
		const minLabel = Number.isInteger(roundedMin)
			? `${roundedMin}`
			: roundedMin.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
		const maxLabel = Number.isInteger(roundedMax)
			? `${roundedMax}`
			: roundedMax.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
		const oneThirdValue = extremes.min + totalRange / 3;
		const twoThirdValue = extremes.min + (totalRange * 2) / 3;
		const oneThirdApprox =
			oneThirdValue < 0
				? Math.ceil(oneThirdValue * 100) / 100
				: Math.floor(oneThirdValue * 100) / 100;
		const twoThirdApprox =
			twoThirdValue < 0
				? Math.ceil(twoThirdValue * 100) / 100
				: Math.floor(twoThirdValue * 100) / 100;
		const oneThirdLabel = Number.isInteger(oneThirdApprox)
			? `${oneThirdApprox}`
			: oneThirdApprox.toFixed(2);
		const twoThirdLabel = Number.isInteger(twoThirdApprox)
			? `${twoThirdApprox}`
			: twoThirdApprox.toFixed(2);

		const containerStyle: React.CSSProperties = {
			width: "100%",
			padding: "12px 10px 10px",
			backgroundColor: "transparent",
			display: "flex",
			flexDirection: "column",
			gap: "8px",
			margin: 0,
		};

		const barWrapperStyle: React.CSSProperties = {
			position: "relative",
			width: "100%",
			paddingBottom: "8px",
		};

		const barStyle: React.CSSProperties = {
			height: "24px",
			width: "100%",
			borderRadius: "12px",
			position: "relative",
			display: "flex",
			flexDirection: "row",
			overflow: "hidden",
		};

		const labelsStyle: React.CSSProperties = {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "flex-start",
			width: "100%",
			position: "relative",
			marginTop: "0",
		};

		const tickerStyle: React.CSSProperties = {
			position: "absolute",
			top: "24px",
			width: "1px",
			height: "8px",
			backgroundColor: "rgba(60,60,60,0.6)",
		};

		const inlineMarkerStyle: React.CSSProperties = {
			position: "absolute",
			top: "50%",
			transform: "translate(-50%, -50%)",
			fontSize: "0.5em",
			fontWeight: "600",
			color: "rgba(255,255,255,0.95)",
			lineHeight: 1,
			textShadow: "0 1px 2px rgba(0,0,0,0.2)",
			pointerEvents: "none",
		};

		const renderMobileColorBlocks = () =>
			TEMP_COLORS.map((color, i) => {
				const isFirst = i === 0;
				const isLast = i === TEMP_COLORS.length - 1;
				const borderRadius = isFirst
					? "12px 0 0 12px"
					: isLast
						? "0 12px 12px 0"
						: "0";

				return (
					<div
						key={color}
						style={{
							width: `${100 / TEMP_COLORS.length}%`,
							height: "100%",
							backgroundColor: color,
							borderRadius,
						}}
					/>
				);
			});

		const renderMobileLabels = () => {
			const variableLabelStyle = {
				fontSize: "12px",
				fontWeight: "600",
				color: "rgb(60,60,60)",
			};
			const valueStyle = {
				fontSize: "24px",
				fontWeight: "700",
				color: "rgb(60,60,60)",
				lineHeight: 1,
			};
			const extremeStyle = {
				display: "flex",
				alignItems: "baseline",
				gap: "4px",
			};

			return (
				<>
					<span style={{ ...extremeStyle, marginLeft: "-2px" }}>
						<span style={valueStyle}>{minLabel}</span>
						<span style={variableLabelStyle}>{displayUnit}</span>
					</span>
					<span
						style={{
							...extremeStyle,
							justifyContent: "flex-end",
							marginRight: "-2px",
						}}
					>
						<span style={variableLabelStyle}>{displayUnit}</span>
						<span style={valueStyle}>{maxLabel}</span>
					</span>
				</>
			);
		};

		return (
			<div style={containerStyle}>
				<div style={barWrapperStyle}>
					<div style={barStyle}>{renderMobileColorBlocks()}</div>
					<span style={{ ...tickerStyle, left: 0 }} />
					<span style={{ ...tickerStyle, right: 0 }} />
					<span style={{ ...inlineMarkerStyle, left: "33.333%" }}>
						{oneThirdLabel}
					</span>
					<span style={{ ...inlineMarkerStyle, left: "66.667%" }}>
						{twoThirdLabel}
					</span>
				</div>
				<div style={labelsStyle}>{renderMobileLabels()}</div>
			</div>
		);
	}

	// Desktop vertical legend styles (unchanged)
	if (!isMobile) {
		const roundedMax = Math.round(extremes.max * 10) / 10;
		const roundedMin = Math.round(extremes.min * 10) / 10;
		const maxLabel = Number.isInteger(roundedMax)
			? `${roundedMax}`
			: roundedMax.toFixed(1);
		const minLabel = Number.isInteger(roundedMin)
			? `${roundedMin}`
			: roundedMin.toFixed(1);

		const wrapperStyle: React.CSSProperties = {
			position: "fixed",
			top: `${desktopOffsets.top}px`,
			bottom: `${desktopOffsets.bottom}px`,
			left: "17px",
			zIndex: 700,
			display: "flex",
			alignItems: "center",
		};

		const containerStyle: React.CSSProperties = {
			backgroundColor: "white",
			borderRadius: "12px",
			padding: "14px 12px",
			boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: "8px",
			minWidth: "124px",
		};

		const variableLabelStyle: React.CSSProperties = {
			fontSize: "14px",
			fontWeight: "700",
			color: "rgb(80,80,80)",
			textAlign: "center",
			maxWidth: "100px",
			lineHeight: 1.2,
			wordBreak: "break-word",
		};

		const extremeLabelStyle: React.CSSProperties = {
			fontSize: "14px",
			fontWeight: "700",
			color: "rgb(80,80,80)",
			lineHeight: 1.1,
		};

		const barStyle: React.CSSProperties = {
			borderRadius: "8px",
			position: "relative",
			display: "flex",
			flexDirection: "column",
			width: "40px",
			height: "clamp(180px, 36vh, 420px)",
			overflow: "hidden",
		};

		const renderColorBlocks = () => {
			const colors = [...TEMP_COLORS].reverse();
			return colors.map((color, i) => {
				const isFirst = i === 0;
				const isLast = i === colors.length - 1;
				const borderRadius = isFirst
					? "8px 8px 0 0"
					: isLast
						? "0 0 8px 8px"
						: "0";

				return (
					<div
						key={color}
						style={{
							height: `${100 / colors.length}%`,
							width: "100%",
							backgroundColor: color,
							borderRadius,
						}}
					/>
				);
			});
		};

		return (
			<div style={wrapperStyle}>
				<div style={containerStyle}>
					<div style={variableLabelStyle}>{displayUnit}</div>
					<div style={extremeLabelStyle}>{maxLabel}</div>
					<div style={barStyle}>{renderColorBlocks()}</div>
					<div style={extremeLabelStyle}>{minLabel}</div>
				</div>
			</div>
		);
	}
};

export const calculateExtremes = (
	data: ModelOutputDataPoint[],
	calculatePercentiles = true,
): DataExtremes => {
	if (!data || data.length === 0) return { min: 0, max: 0 };

	const modelOutputValues = data
		.map((point) => point.modelOutputValue)
		.filter((value) => !Number.isNaN(value));

	if (modelOutputValues.length === 0) return { min: 0, max: 0 };

	if (calculatePercentiles) {
		const sortedValues = [...modelOutputValues].sort((a, b) => a - b);
		const p5Index = Math.floor((25 / 100) * (sortedValues.length - 1));
		const p95Index = Math.floor((75 / 100) * (sortedValues.length - 1));

		return {
			min: sortedValues[p5Index],
			max: sortedValues[p95Index],
		};
	}

	return {
		min: Math.min(...modelOutputValues),
		max: Math.max(...modelOutputValues),
	};
};
