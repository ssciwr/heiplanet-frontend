import L from "leaflet";
import { useMemo } from "react";
import { Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { observer } from "mobx-react-lite";
import { useUserSelectionsStore } from "../../contexts/UserSelectionsContext";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { temperatureDataStore } from "../../stores/TemperatureDataStore";
import { getColorFromGradient } from "./utilities/gradientUtilities";
import { getFormattedVariableValue } from "./utilities/monthUtils";

console.log("GRID-PROBLEM-DEBUG AdaptiveGridLayer module loaded");

/**
 * Technically in the GIS field this is more known as Downsampling / Level of Detail based loading/zoom support.
 * It keeps our consumption at any given point in time to 0.2-3 MB of data rather than loading at the highest granualarity for larger windows (e.g. when very zoomed out).
 */
const AdaptiveGridLayer = observer(() => {
	const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
	const userStore = useUserSelectionsStore();
	const renderStart = performance.now();
	const gridCells = gridProcessingStore.gridCells;
	const processedDataExtremes = temperatureDataStore.processedDataExtremes;

	console.log("📱 AdaptiveGridLayer render START - cells:", gridCells.length);
	console.log("GRID-PROBLEM-DEBUG AdaptiveGridLayer render", {
		cellCount: gridCells.length,
		hasExtremes: !!processedDataExtremes,
	});

	const getGridCellStyle = (temperature: number) => {
		if (!processedDataExtremes)
			return {
				fillColor: "#ccc",
				weight: 0.2,
				opacity: 0.9,
				color: "#000",
				fillOpacity: 0.8,
			};
		const color = getColorFromGradient(temperature, processedDataExtremes);
		return {
			fillColor: color,
			weight: 0.2,
			opacity: 0.9,
			color: "#000",
			fillOpacity: 0.8,
		};
	};

	// get country name this way for borders at world geojson (not NUTS), admin level 0: return (match?.properties as { NAM_0?: string } | undefined)?.NAM_0 || "Unknown";

	const result = gridCells.map(
		(
			cell, // these adapt to different scales because cell.bounds changes.
		) => {
			const [[south, west], [north, east]] = cell.bounds as [
				[number, number],
				[number, number],
			];
			const centerLat = (south + north) / 2;
			const centerLng = (west + east) / 2;
			const variableName = userStore.currentVariableType || "Value";

			return (
				<Rectangle
					key={cell.id}
					bounds={cell.bounds}
					renderer={canvasRenderer}
					interactive
					pathOptions={getGridCellStyle(cell.temperature)}
					eventHandlers={{
						click: (e) => {
							e.target.openPopup();
							e.originalEvent?.stopPropagation();
						},
					}}
				>
					<Popup className="grid-popup" pane="popupPane">
						<div className="grid-popup">
							<h4>Grid Cell</h4>
							<p className="grid-popup__value">
								<strong>{variableName}:</strong>{" "}
								{getFormattedVariableValue(
									variableName,
									cell.temperature,
								)}
							</p>
							<p className="grid-popup__meta">
								<strong>Center:</strong> {centerLat.toFixed(2)},{" "}
								{centerLng.toFixed(2)}
							</p>
							<p className="grid-popup__meta">
								<strong>Bounds:</strong> [{south.toFixed(2)},{" "}
								{west.toFixed(2)}] to [{north.toFixed(2)},{" "}
								{east.toFixed(2)}]
							</p>
						</div>
					</Popup>
				</Rectangle>
			);
		},
	);
	// the label should be in some kind of mobx store or passed as prop.
	// todo: Check this again. This relates to Ingas suggested changes today
	// Cruically, the label here in this concept may become the yaml "model output yaml" or so
	// Created #77 for this.

	const renderTime = performance.now() - renderStart;
	console.log(
		`📱 AdaptiveGridLayer render COMPLETE - ${gridCells.length} cells in ${renderTime.toFixed(2)}ms`,
	);

	return <>{result}</>;
});

export default AdaptiveGridLayer;
