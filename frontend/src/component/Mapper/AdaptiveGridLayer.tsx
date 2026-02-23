import L from "leaflet";
import { useMemo } from "react";
import { Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { observer } from "mobx-react-lite";
import { gridProcessingStore } from "../../stores/GridProcessingStore";
import { temperatureDataStore } from "../../stores/TemperatureDataStore";
import { getColorFromGradient } from "./utilities/gradientUtilities";

console.log("GRID-PROBLEM-DEBUG AdaptiveGridLayer module loaded");

const AdaptiveGridLayer = observer(() => {
	const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
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

	// zIndex less than the city layer so those appear on top.
	const result = (
		<div style={{ zIndex: "335" }}>
			{gridCells.map(
				(
					cell, // these adapt to different scales because cell.bounds changes.
				) => (
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
						<Popup className="grid-popup">
							<p>{cell.temperature.toFixed(2)}</p>
							<p>Coordinates: {JSON.stringify(cell.bounds)}</p>
						</Popup>
					</Rectangle>
				),
			)}
		</div> // todo: Add css class for grid-popup(it is transparent right now)
	); // todo: Replace just teh cell.temperature above: rename temperature to .value (as it is used for R0 too etc) and provide the label.
	// the label should be in some kind of mobx store or passed as prop.
	// todo: Check this again. This relates to Ingas suggested changes today
	// Cruically, the label here in this concept may become the yaml "model output yaml" or so
	// Created #77 for this.

	const renderTime = performance.now() - renderStart;
	console.log(
		`📱 AdaptiveGridLayer render COMPLETE - ${gridCells.length} cells in ${renderTime.toFixed(2)}ms`,
	);

	return result;
});

export default AdaptiveGridLayer;
