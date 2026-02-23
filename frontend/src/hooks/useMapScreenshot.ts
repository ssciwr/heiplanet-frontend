import L from "leaflet";
import { useEffect } from "react";
import "leaflet-simple-map-screenshoter";
import type { Month } from "../component/Mapper/types";
import { getMonthInfo } from "../component/Mapper/utilities/monthUtils";
import { errorStore } from "../stores/ErrorStore";
import type { Model } from "../types/model";

export interface UseMapScreenshotReturn {
	handleScreenshot: () => Promise<void>;
}

interface UseMapScreenshotProps {
	map: L.Map | null;
	screenshoter: L.SimpleMapScreenshoter | null;
	setScreenshoter: (screenshoter: L.SimpleMapScreenshoter | null) => void;
	models: Model[];
	selectedModel: string;
	currentYear: number;
	currentMonth: Month;
	selectedOptimism: string;
}

export const useMapScreenshot = ({
	map,
	screenshoter,
	setScreenshoter,
	models,
	selectedModel,
	currentYear,
	currentMonth,
	selectedOptimism,
}: UseMapScreenshotProps): UseMapScreenshotReturn => {
	// Initialize screenshoter when map is ready
	useEffect(() => {
		if (map && !screenshoter) {
			if (typeof L.simpleMapScreenshoter === "function") {
				const initializeScreenshoter = () => {
					try {
						const screenshotPlugin = L.simpleMapScreenshoter({
							hidden: true,
							preventDownload: true,
							cropImageByInnerWH: true,
							hideElementsWithSelectors: [],
							mimeType: "image/png",
							screenName: () => `map-screenshot-${Date.now()}`,
						});

						screenshotPlugin.addTo(map);
						setScreenshoter(screenshotPlugin);
					} catch (error) {
						console.error("Error initializing screenshoter:", error);
					}
				};

				if (map.getContainer() && map.getSize().x > 0 && map.getSize().y > 0) {
					initializeScreenshoter();
				} else {
					map.once("load", initializeScreenshoter);
					map.once("resize", initializeScreenshoter);
				}

				return () => {
					if (screenshoter) {
						try {
							map.removeControl(screenshoter);
						} catch (error) {
							console.error("Error removing screenshoter:", error);
						}
					}
				};
			}
		}
	}, [map, screenshoter, setScreenshoter]);

	const handleScreenshot = async () => {
		if (!map || !screenshoter) {
			console.error("Map or screenshoter not initialized");
			return;
		}

		try {
			// Get model name
			const selectedModelData = models.find((m) => m.id === selectedModel);
			const modelName = selectedModelData?.modelName || "Unknown Model";

			// Get month name
			const monthName = getMonthInfo(currentMonth).label;
			const timeText = `${monthName} ${currentYear}`;
			const overlayText = `Model: ${modelName} | Time: ${timeText} | Optimism: ${selectedOptimism}`;

			// Take screenshot first
			const blob = (await screenshoter.takeScreen("blob", {
				mimeType: "image/png",
			})) as Blob;

			// Convert blob to image and add text overlay using canvas
			const img = new Image();
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				throw new Error("Could not get canvas context");
			}

			// Create promise to handle image loading
			await new Promise<void>((resolve, reject) => {
				img.onload = () => {
					try {
						canvas.width = img.width;
						canvas.height = img.height;

						// Draw the screenshot
						ctx.drawImage(img, 0, 0);

						// Add text overlay at the bottom
						const fontSize = Math.max(14, Math.floor(img.width / 80)); // Responsive font size
						const padding = Math.max(8, Math.floor(img.width / 200)); // Responsive padding

						ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
						ctx.textBaseline = "bottom";

						// Measure text to create background
						const textMetrics = ctx.measureText(overlayText);
						const textWidth = textMetrics.width;
						const textHeight = fontSize + padding * 2;

						// Draw white background
						ctx.fillStyle = "white";
						ctx.fillRect(
							0,
							img.height - textHeight,
							textWidth + padding * 2,
							textHeight,
						);

						// Draw border line
						ctx.strokeStyle = "#e0e0e0";
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(0, img.height - textHeight);
						ctx.lineTo(textWidth + padding * 2, img.height - textHeight);
						ctx.stroke();

						// Draw text
						ctx.fillStyle = "black";
						ctx.fillText(overlayText, padding, img.height - padding);

						resolve();
					} catch (err) {
						reject(err);
					}
				};
				img.onerror = () => reject(new Error("Failed to load image"));
				img.src = URL.createObjectURL(blob);
			});

			// Convert canvas to blob and download
			canvas.toBlob((finalBlob) => {
				if (finalBlob) {
					const url = URL.createObjectURL(finalBlob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `climate-map-${new Date().toISOString().split("T")[0]}.png`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					console.log("Screenshot with overlay saved successfully");
				}
			}, "image/png");

			// Clean up
			URL.revokeObjectURL(img.src);
		} catch (error) {
			console.error("Screenshot error:", error);
			errorStore.showError("Screenshot Error", "Failed to capture screenshot");
		}
	};

	return {
		handleScreenshot,
	};
};
