import { Modal, Spin } from "antd";
import L from "leaflet";
import {
	Camera,
	ChevronDown,
	ChevronUp,
	FileText,
	Info,
	MapPin,
	Minus,
	Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { fetchModelCards } from "../../../services/modelCardService";
import { AboutContent } from "../../../static/Footer.tsx";
import type { Model } from "../../../types/model";
import ModelDetailsModal from "./ModelDetailsModal";

interface ScreenshotOptions {
	mimeType?: "image/png" | "image/jpeg" | "image/webp";
	quality?: number;
	width?: number;
	height?: number;
	pixelRatio?: number;
}

interface SimpleMapScreenshoterOptions {
	hidden?: boolean;
	preventDownload?: boolean;
	cropImageByInnerWH?: boolean;
	hideElementsWithSelectors?: string[];
	mimeType?: "image/png" | "image/jpeg" | "image/webp";
	screenName?: () => string;
	domtoimageOptions?: {
		quality?: number;
		bgcolor?: string;
		width?: number;
		height?: number;
		style?: Record<string, string>;
		filter?: (node: Node) => boolean;
		cacheBust?: boolean;
		imagePlaceholder?: string;
		pixelRatio?: number;
	};
}

// Type declaration for the screenshoter plugin
declare module "leaflet" {
	interface SimpleMapScreenshoter extends L.Control {
		takeScreen(
			format?: "blob" | "canvas" | "img",
			options?: ScreenshotOptions,
		): Promise<Blob | string | HTMLCanvasElement>;
	}

	function simpleMapScreenshoter(
		options?: SimpleMapScreenshoterOptions,
	): SimpleMapScreenshoter;
}

const MOBILE_SIDE_BUTTONS_LOCATIONS = {
	BOTTOM_RIGHT: "bottom-right",
	TOP_LEFT: "top-left",
} as const;

type MobileSideButtonsLocation =
	(typeof MOBILE_SIDE_BUTTONS_LOCATIONS)[keyof typeof MOBILE_SIDE_BUTTONS_LOCATIONS];

interface MobileSideButtonsProps {
	map: L.Map | null;
	position?: MobileSideButtonsLocation;
	selectedModel?: string;
	onModelSelect?: (modelId: string) => void;
}

const MobileSideButtons = ({
	map,
	position = MOBILE_SIDE_BUTTONS_LOCATIONS.BOTTOM_RIGHT,
	selectedModel,
	onModelSelect,
}: MobileSideButtonsProps) => {
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [showInfo, setShowInfo] = useState<boolean>(false);
	const [showScreenshotErrorModal, setShowScreenshotErrorModal] =
		useState<boolean>(false);
	const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
	const [screenshoter, setScreenshoter] =
		useState<L.SimpleMapScreenshoter | null>(null);
	const [currentTheme, setCurrentTheme] = useState<"default" | "branded">(
		"default",
	);
	const [isMinimized, setIsMinimized] = useState<boolean>(false);
	const [showModelDetails, setShowModelDetails] = useState<boolean>(false);
	const [models, setModels] = useState<Model[]>([]);

	useEffect(() => {
		console.log("Show info:", showInfo);
	}, [showInfo]);

	// Apply theme to document root
	useEffect(() => {
		console.log("Applying theme to document:", currentTheme);
		document.documentElement.setAttribute("data-theme", currentTheme);
		console.log(
			"Document data-theme attribute:",
			document.documentElement.getAttribute("data-theme"),
		);
	}, [currentTheme]);

	// Load models for the modal
	useEffect(() => {
		const loadModels = async () => {
			try {
				const loadedModels = await fetchModelCards();
				if (loadedModels.length === 0) {
					loadedModels.push({
						id: "model-cards-unavailable",
						modelName: "Model Cards Unavailable",
						title: "Model Cards Unavailable",
						description:
							"Unable to fetch model cards from GitHub. Check client-side access.",
						emoji: "⚠️",
						color: "#D14343",
						details:
							"Model cards could not be loaded from GitHub on this client.",
					});
				}
				setModels(loadedModels);
			} catch (error) {
				console.error("Error loading model cards:", error);
				setModels([
					{
						id: "model-cards-unavailable",
						modelName: "Model Cards Unavailable",
						title: "Model Cards Unavailable",
						description:
							"Unable to fetch model cards from GitHub. Check client-side access.",
						emoji: "⚠️",
						color: "#D14343",
						details:
							"Model cards could not be loaded from GitHub on this client.",
					},
				]);
			}
		};

		loadModels();
	}, []);

	useEffect(() => {
		if (map && !screenshoter) {
			if (typeof L.simpleMapScreenshoter === "function") {
				const initializeScreenshoter = () => {
					try {
						const screenshotPlugin = L.simpleMapScreenshoter({
							hidden: true,
							preventDownload: true,
							cropImageByInnerWH: true,
							hideElementsWithSelectors: [], // css classes, not needed for now.
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
					// sensible pre-screenshot set up..
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
	}, [map, screenshoter]);

	const handleZoomIn = () => {
		if (map) {
			map.zoomIn();
		}
	};

	const handleZoomOut = () => {
		if (map) {
			map.zoomOut();
		}
	};

	const handleLocationRequest = () => {
		setIsLocating(true);
		setShowLocationModal(true);

		if (!navigator.geolocation) {
			console.error("Geolocation is not supported by this browser");
			setIsLocating(false);
			setShowLocationModal(false);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				if (map) {
					console.log("Setting map position to: ", latitude, longitude);
					map.flyTo([latitude, longitude], 8, {
						duration: 2,
						easeLinearity: 0.1,
					});
				}
				setIsLocating(false);
				setShowLocationModal(false);
			},
			(error) => {
				let errorMessage = "Unable to get your location";
				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage = "Location permission denied";
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage = "Location information unavailable";
						break;
					case error.TIMEOUT:
						errorMessage = "Location request timed out";
						break;
				}
				console.error(errorMessage);
				setIsLocating(false);
				setShowLocationModal(false);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000,
			},
		);
	};

	const handleSaveScreenshot = async () => {
		if (!map || !screenshoter) {
			console.error("Map or screenshoter not initialized");
			return;
		}

		setIsSaving(true);

		try {
			// Ensure the map has rendered before taking screenshot
			await new Promise((resolve) => setTimeout(resolve, 100));

			const blob = (await screenshoter.takeScreen("blob", {
				mimeType: "image/png",
			})) as Blob;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `map-screenshot-${Date.now()}.png`;
			link.click();

			URL.revokeObjectURL(url);

			console.log("Screenshot saved successfully");
		} catch {
			setShowScreenshotErrorModal(true);
		} finally {
			setIsSaving(false);
		}
	};

	const handleThemeToggle = () => {
		const newTheme = currentTheme === "default" ? "branded" : "default";
		console.log("Switching theme from", currentTheme, "to", newTheme);
		setCurrentTheme(newTheme);
	};

	const handleToggleMinimize = () => {
		setIsMinimized(!isMinimized);
	};

	const circularButtonSize = 18;

	// Get button styles - always purple
	const getButtonStyle = () => {
		return {
			backgroundColor: "#667eea",
			background: "#6d63c8",
		};
	};

	const getMobileSideButtonsClasses = () => {
		const baseClass = isMobile
			? "mobile-side-buttons mobile-side-buttons-mobile"
			: "mobile-side-buttons mobile-side-buttons-desktop";
		if (isMobile) return baseClass;
		return position === MOBILE_SIDE_BUTTONS_LOCATIONS.BOTTOM_RIGHT
			? `${baseClass} mobile-side-buttons-bottom-right`
			: `${baseClass} mobile-side-buttons-top-left`;
	};

	const modals = (
		<div>
			<Modal
				title=""
				open={showInfo}
				onCancel={() => setShowInfo(false)}
				footer={null}
				width={400}
			>
				<AboutContent />
				<br />
				<button
					type="button"
					onClick={handleThemeToggle}
					style={{
						background: "none",
						border: "none",
						color: "inherit",
						textDecoration: "underline",
						cursor: "pointer",
					}}
				>
					Change Theme
				</button>
			</Modal>

			<Modal
				title="Screenshot Error"
				open={showScreenshotErrorModal}
				onOk={() => setShowScreenshotErrorModal(false)}
				onCancel={() => setShowScreenshotErrorModal(false)}
				okText="OK"
				cancelButtonProps={{ style: { display: "none" } }}
			>
				<p>Error saving screenshot. Please reload the map and try again.</p>
			</Modal>

			<Modal
				title="Finding Your Location"
				open={showLocationModal}
				footer={null}
				closable={false}
				centered
				width={300}
			>
				<div style={{ textAlign: "center", padding: "20px 0" }}>
					<Spin size="large" />
					<p style={{ marginTop: "16px", marginBottom: 0 }}>Zooming to you!</p>
				</div>
			</Modal>

			<ModelDetailsModal
				isOpen={showModelDetails}
				onClose={() => setShowModelDetails(false)}
				models={models}
				selectedModelId={selectedModel || ""}
				onModelSelect={onModelSelect || (() => {})}
				showCurrentModelFirst={true}
			/>
		</div>
	);

	// Mobile: circular buttons with minimize functionality
	return (
		<>
			<div
				data-testid="mobile-side-buttons"
				className={getMobileSideButtonsClasses()}
			>
				{!isMinimized ? (
					<>
						<button
							type="button"
							onClick={handleZoomIn}
							className="btn-icon"
							style={getButtonStyle()}
						>
							<Plus size={circularButtonSize} />
						</button>

						<button
							type="button"
							onClick={handleZoomOut}
							className="btn-icon"
							style={getButtonStyle()}
						>
							<Minus size={circularButtonSize} />
						</button>

						<button
							type="button"
							onClick={handleLocationRequest}
							disabled={isLocating}
							className="btn-icon"
							style={getButtonStyle()}
						>
							<MapPin size={circularButtonSize} />
						</button>

						<button
							type="button"
							onClick={handleSaveScreenshot}
							disabled={isSaving || !screenshoter}
							className="btn-icon"
							style={getButtonStyle()}
							title={
								!screenshoter
									? "Screenshot plugin not loaded"
									: "Take screenshot"
							}
						>
							<Camera size={circularButtonSize} />
						</button>
						<button
							type="button"
							onClick={() => setShowInfo(true)}
							className="btn-icon"
							style={getButtonStyle()}
						>
							<Info size={circularButtonSize} />
						</button>

						<button
							type="button"
							onClick={() => setShowModelDetails(true)}
							className="btn-icon"
							disabled={!selectedModel || models.length === 0}
							style={getButtonStyle()}
						>
							<FileText size={circularButtonSize} />
						</button>
					</>
				) : null}

				<button
					type="button"
					onClick={handleToggleMinimize}
					className="btn-icon minimize-button"
					style={getButtonStyle()}
				>
					{isMinimized ? (
						<ChevronDown size={circularButtonSize} />
					) : (
						<ChevronUp size={circularButtonSize} />
					)}
				</button>
			</div>
			{modals}
		</>
	);
};

export default MobileSideButtons;
