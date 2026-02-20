import { Modal, Select } from "antd";
import type L from "leaflet";
import {
	Camera,
	ChevronLeft,
	ChevronRight,
	Database,
	HelpCircle,
	MapPin,
	RotateCcw,
	Share,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { AboutContent } from "../../../static/Footer.tsx";
import type { Model } from "../../../types/model";
import type { Month } from "../types";
import { MONTHS } from "../utilities/monthUtils";
import ModelDetailsModal from "./ModelDetailsModal";

const { Option } = Select;

interface AdvancedTimelineSelectorProps {
	year: number;
	month: Month;
	onYearChange: (value: number) => void;
	onMonthChange: (value: Month) => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetZoom: () => void;
	onLocationFind: () => void;
	onScreenshot: () => void;
	colorScheme: "purple" | "red";
	legend?: ReactNode;
	screenshoter?: L.SimpleMapScreenshoter | null;
	models: Model[];
	selectedModelId: string;
	onModelSelect: (modelId: string) => void;
}

const hideMonthSelector = false; // Month selector is now enabled and connected to the API

const AdvancedTimelineSelector: React.FC<AdvancedTimelineSelectorProps> = ({
	year,
	month,
	onYearChange,
	onMonthChange,
	onZoomIn,
	onZoomOut,
	onResetZoom,
	onLocationFind,
	onScreenshot,
	colorScheme,
	legend,
	screenshoter,
	models,
	selectedModelId,
	onModelSelect,
}) => {
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);
	const [isDragging, setIsDragging] = useState(false);
	const [dragPreviewYear, setDragPreviewYear] = useState(year);
	const [magnifyPosition, setMagnifyPosition] = useState<number | null>(null);
	// Modal state
	const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
	const [isAboutOpen, setIsAboutOpen] = useState(false);

	// Track screen width for responsive features
	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(window.innerWidth);
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Update drag preview year when actual year changes
	useEffect(() => {
		if (!isDragging) {
			setDragPreviewYear(year);
		}
	}, [year, isDragging]);

	// Add global mouse event listeners for smooth dragging
	useEffect(() => {
		if (isDragging) {
			const handleGlobalMouseMove = (e: MouseEvent) => {
				const slider = document.querySelector(
					".timeline-slider-track",
				) as HTMLElement;
				if (slider) {
					const rect = slider.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const percentage = Math.max(0, Math.min(1, x / rect.width));
					const rawYear = 1960 + percentage * (2100 - 1960);
					const newYear = quantizeYear(rawYear);

					setDragPreviewYear(newYear);
					setMagnifyPosition(percentage);
				}
			};

			const handleGlobalMouseUp = () => {
				setIsDragging(false);
				setMagnifyPosition(null);
				onYearChange(dragPreviewYear);
			};

			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleGlobalMouseMove);
				document.removeEventListener("mouseup", handleGlobalMouseUp);
			};
		}
	}, [isDragging, dragPreviewYear, onYearChange]);

	// Check if we should show year navigation buttons
	const showYearNavButtons = screenWidth > 1200 && !isMobile;
	const showMonthNavButtons = screenWidth > 1200 && !isMobile;

	// Year navigation handlers
	const handlePreviousYear = () => {
		if (year > 1960) {
			onYearChange(year - 1);
		}
	};

	const handleNextYear = () => {
		if (year < 2100) {
			onYearChange(year + 1);
		}
	};

	// Month navigation handlers
	const handlePreviousMonth = () => {
		if (month === 1) {
			// January -> December of previous year
			if (year > 1960) {
				onYearChange(year - 1);
				onMonthChange(12);
			}
		} else {
			onMonthChange((month - 1) as Month);
		}
	};

	const handleNextMonth = () => {
		if (month === 12) {
			// December -> January of next year
			if (year < 2100) {
				onYearChange(year + 1);
				onMonthChange(1);
			}
		} else {
			onMonthChange((month + 1) as Month);
		}
	};

	// Modal handlers
	const handleModelInfo = () => {
		setIsModelInfoOpen(true);
	};

	const handleAbout = () => {
		setIsAboutOpen(true);
	};

	// New slider event handlers
	const handleSliderMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true);
		updateSliderPosition(e);
	};

	const updateSliderPosition = (e: React.MouseEvent) => {
		const slider = e.currentTarget as HTMLElement;
		const rect = slider.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const rawYear = 1960 + percentage * (2100 - 1960);
		const newYear = quantizeYear(rawYear);

		setDragPreviewYear(newYear);
		setMagnifyPosition(percentage);
	};

	// Get years for magnify effect (5 years on each side)
	const getMagnifyYears = () => {
		const centerYear = dragPreviewYear;
		const years = [];
		for (let i = centerYear - 5; i <= centerYear + 5; i++) {
			if (i >= 1960 && i <= 2100) {
				years.push(i);
			}
		}
		return years;
	};

	// Quantize year to nearest discrete value to prevent "waving through"
	const quantizeYear = (year: number): number => {
		// Snap to nearest year with a slight bias to prevent jittery behavior
		const rounded = Math.round(year);
		return Math.max(1960, Math.min(2100, rounded));
	};

	// months array is now imported from utilities

	const marks = {
		1960: "1960",
		1980: "1980",
		2000: "2000",
		2020: "2020",
		2040: "2040",
		2060: "2060",
		2080: "2080",
		2100: "2100",
	};

	const yearOptions = [];
	for (let y = 1960; y <= 2100; y++) {
		yearOptions.push(y);
	}

	const backgroundGradient =
		colorScheme === "purple"
			? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
			: "linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)";

	return (
		<div
			data-testid="timeline-selector"
			style={{
				position: "fixed",
				bottom: 0,
				left: 0,
				right: 0,
				background: backgroundGradient,
				zIndex: 1000,
				padding: isMobile ? "16px 20px" : "8px 20px",
				backdropFilter: "blur(20px)",
				borderTop: "1px solid rgba(255, 255, 255, 0.2)",
			}}
		>
			{isMobile ? (
				/* Mobile Layout */
				<div>
					{/* Year and Month selectors */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: "16px",
						}}
					>
						{/* Year selector - dropdown on mobile */}
						<div style={{ flex: 1 }}>
							<Select
								value={year}
								onChange={onYearChange}
								style={{
									width: "100%",
									height: "50px",
									fontSize: "18px",
									fontWeight: "600",
								}}
								size="large"
								placeholder="Select Year"
								showSearch
								filterOption={(input, option) =>
									option?.children
										?.toString()
										.toLowerCase()
										.includes(input.toLowerCase()) ?? false
								}
								dropdownStyle={{
									background: "white",
									backdropFilter: "blur(10px)",
								}}
							>
								{yearOptions.map((yearOption) => (
									<Option key={yearOption} value={yearOption}>
										{yearOption}
									</Option>
								))}
							</Select>
						</div>

						{/* Month selector */}
						<div hidden={hideMonthSelector} style={{ minWidth: "140px" }}>
							<Select
								value={month}
								onChange={onMonthChange}
								style={{
									width: "100%",
									height: "50px",
									fontSize: "16px",
									fontWeight: "600",
								}}
								size="large"
								dropdownStyle={{
									background: "white",
									backdropFilter: "blur(10px)",
								}}
							>
								{MONTHS.map((monthInfo) => (
									<Option key={monthInfo.value} value={monthInfo.value}>
										{monthInfo.shortLabel}
									</Option>
								))}
							</Select>
						</div>
					</div>

					{/* Legend on mobile - horizontal with white background */}
					{legend && (
						<div
							style={{
								background: "white",
								borderRadius: "8px",
								padding: "12px 16px",
								marginTop: "12px",
								boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
							}}
						>
							{legend}
						</div>
					)}
				</div>
			) : (
				<div className="advanced-timeline-desktop">
					{/* Main container with controls and timeline */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							minHeight: "60px",
							width: "100%",
						}}
					>
						{/* Left controls */}
						<div className="control-group">
							<button
								type="button"
								onClick={onZoomIn}
								className="control-btn circular"
								title="Zoom In"
							>
								<ZoomIn size={20} />
							</button>
							<button
								type="button"
								onClick={onZoomOut}
								className="control-btn circular"
								title="Zoom Out"
							>
								<ZoomOut size={20} />
							</button>
							<button
								type="button"
								onClick={onResetZoom}
								className="control-btn circular"
								title="Reset Zoom"
							>
								<RotateCcw size={20} />
							</button>
							<button
								type="button"
								onClick={onLocationFind}
								className="control-btn circular"
								title="Find Location"
							>
								<MapPin size={20} />
							</button>
						</div>
						<div className="year-display">
							{showYearNavButtons && (
								<button
									type="button"
									onClick={handlePreviousYear}
									disabled={year <= 1960}
									className="control-btn circular"
									title="Previous Year"
								>
									<ChevronLeft size={20} />
								</button>
							)}
							<span className="year-text">
								{isDragging ? dragPreviewYear : year}
							</span>
							{showYearNavButtons && (
								<button
									type="button"
									onClick={handleNextYear}
									disabled={year >= 2100}
									className="control-btn circular"
									title="Next Year"
								>
									<ChevronRight size={20} />
								</button>
							)}
							{/* Vertical divider and month selector */}
							<div hidden={hideMonthSelector} className="year-month-divider" />
							<div hidden={hideMonthSelector} className="month-selector">
								{showMonthNavButtons && (
									<button
										type="button"
										onClick={handlePreviousMonth}
										disabled={year <= 1960 && month <= 1}
										className="control-btn circular"
										title="Previous Month"
									>
										<ChevronLeft size={20} />
									</button>
								)}
								<select
									value={month}
									onChange={(e) =>
										onMonthChange(Number(e.target.value) as Month)
									}
									className="month-select"
								>
									{MONTHS.map((monthInfo) => (
										<option key={monthInfo.value} value={monthInfo.value}>
											{monthInfo.shortLabel}
										</option>
									))}
								</select>
								{showMonthNavButtons && (
									<button
										type="button"
										onClick={handleNextMonth}
										disabled={year >= 2100 && month >= 12}
										className="control-btn circular"
										title="Next Month"
									>
										<ChevronRight size={20} />
									</button>
								)}
							</div>
						</div>
						{/* Right controls */}
						<div className="control-group">
							<button
								type="button"
								onClick={onScreenshot}
								disabled={!screenshoter}
								className="control-btn"
								title={
									!screenshoter
										? "Screenshot plugin not loaded"
										: "Capture map as image"
								}
							>
								<Camera size={20} />
								Screenshot
								<Share size={20} />
							</button>
							<button
								type="button"
								onClick={handleModelInfo}
								className="control-btn"
								title="Model Information"
							>
								<Database size={20} />
								Model Info
							</button>
							<button
								type="button"
								onClick={handleAbout}
								className="control-btn"
								title="About"
							>
								<HelpCircle size={20} />
								About
							</button>
						</div>
					</div>
					<br />
					{/* Center - Year and timeline */}
					<div className="timeline-container">
						<div className="timeline-slider">
							<div
								className="timeline-slider-track"
								onMouseDown={handleSliderMouseDown}
							>
								<div className="timeline-slider-rail" />
								<div
									className="timeline-slider-handle"
									style={{
										left: `${(((isDragging ? dragPreviewYear : year) - 1960) / (2100 - 1960)) * 100}%`,
									}}
								/>
								{/* Magnify effect */}
								{isDragging && magnifyPosition !== null && (
									<div
										className="magnify-container"
										style={{
											left: `${magnifyPosition * 100}%`,
										}}
									>
										<div className="magnify-lens">
											<div className="magnify-years">
												{getMagnifyYears().map((magnifyYear) => (
													<div
														key={magnifyYear}
														className={`magnify-year ${magnifyYear === dragPreviewYear ? "active" : ""}`}
													>
														{magnifyYear}
													</div>
												))}
											</div>
										</div>
									</div>
								)}
							</div>
							<div className="timeline-marks">
								{Object.entries(marks).map(([value, label]) => (
									<div
										key={value}
										className="timeline-mark"
										style={{
											left: `${((Number(value) - 1960) / (2100 - 1960)) * 100}%`,
										}}
									>
										{label}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Custom CSS for desktop reimplementation */}
			<style>
				{`
					/* Desktop Advanced Timeline Styles */
					.advanced-timeline-desktop {
						width: 100%;
						min-width: 100%;
						height: 100%;
					}

					.control-group {
						display: flex;
						align-items: center;
						gap: 8px;
						flex-shrink: 0;
					}

					.control-btn {
						display: flex;
						align-items: center;
						justify-content: center;
						gap: 8px;
						padding: 12px 16px;
						background: rgba(255, 255, 255, 0.1);
						border: 1px solid rgba(255, 255, 255, 0.3);
						border-radius: 8px;
						color: white;
						font-size: 16px;
						font-weight: 500;
						cursor: pointer;
						transition: all 0.2s ease;
						min-height: 44px;
						min-width: auto;
					}

					.control-btn.circular {
						border-radius: 50%;
						width: 48px;
						height: 48px;
						padding: 0;
						min-width: 48px;
						min-height: 48px;
					}

					.control-btn:hover {
						background: rgba(255, 255, 255, 0.2);
						border-color: rgba(255, 255, 255, 0.5);
						transform: translateY(-1px);
					}

					.control-btn:disabled {
						opacity: 0.5;
						cursor: not-allowed;
						transform: none;
					}

					.timeline-container {
						flex: 1;
						display: flex;
						flex-direction: column;
						align-items: center;
						width: 100%;
						margin: 0 auto;
						min-width: 0;
						padding: 0 20px 20px 20px;
					}

					.year-display {
						display: flex;
						align-items: center;
						gap: 0px;
					}

					.year-text {
						font-size: 48px;
						font-weight: 700;
						color: white;
						text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
						min-width: 160px;
						text-align: center;
						margin:-18px
					}


					.timeline-slider {
						width: 100%;
						position: relative;
						min-width: 400px;
					}

					.timeline-slider-track {
						width: 100%;
						height: 40px;
						position: relative;
						cursor: pointer;
						display: flex;
						align-items: center;
					}

					.timeline-slider-rail {
						width: 100%;
						height: 8px;
						background: rgba(255, 255, 255, 0.3);
						border-radius: 4px;
						position: absolute;
						top: 50%;
						transform: translateY(-50%);
					}

					.timeline-slider-handle {
						width: 24px;
						height: 24px;
						background: white;
						border: 2px solid rgba(0, 0, 0, 0.1);
						border-radius: 50%;
						position: absolute;
						top: 50%;
						transform: translate(-50%, -50%);
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
						transition: all 0.2s ease;
						z-index: 10;
					}

					.timeline-slider-handle:hover {
						transform: translate(-50%, -50%) scale(1.1);
						box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
					}

					.magnify-container {
						position: absolute;
						top: -80px;
						transform: translateX(-50%);
						z-index: 20;
						pointer-events: none;
					}

					.magnify-lens {
						background: rgba(0, 0, 0, 0.95);
						border: 2px solid rgba(255, 255, 255, 0.9);
						border-radius: 8px;
						padding: 6px 10px;
						box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
						backdrop-filter: blur(10px);
						position: relative;
						min-width: 200px;
					}

					.magnify-lens::after {
						content: '';
						position: absolute;
						top: 100%;
						left: 50%;
						transform: translateX(-50%);
						width: 0;
						height: 0;
						border-left: 8px solid transparent;
						border-right: 8px solid transparent;
						border-top: 8px solid rgba(0, 0, 0, 0.9);
					}

					.magnify-years {
						display: flex;
						gap: 4px;
						align-items: center;
					}

					.magnify-year {
						color: rgba(255, 255, 255, 0.7);
						font-size: 12px;
						font-weight: 500;
						padding: 4px 6px;
						border-radius: 4px;
						transition: all 0.2s ease;
						min-width: 36px;
						text-align: center;
					}

					.magnify-year.active {
						background: rgba(255, 255, 255, 0.2);
						color: white;
						font-weight: 700;
						font-size: 14px;
						transform: scale(1.1);
					}

					.timeline-marks {
						position: absolute;
						top: 16px;
						left: 0;
						right: 0;
						height: 40px;
						pointer-events: none;
					}

					.timeline-mark {
						position: absolute;
						transform: translateX(-50%);
						color: rgba(255, 255, 255, 0.9);
						font-size: 18px;
						font-weight: 600;
						text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
						white-space: nowrap;
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 4px;
					}

					.timeline-mark::before {
						content: '';
						width: 2px;
						height: 12px;
						background: rgba(255, 255, 255, 0.7);
						border-radius: 1px;
					}

					.year-month-divider {
						width: 1px;
						height: 40px;
						background: rgba(255, 255, 255, 0.5);
						margin: 0 16px;
					}

					.month-selector {
						display: flex;
						align-items: center;
						gap: 8px;
					}

					.month-select {
						padding: 8px 12px;
						background: rgba(255, 255, 255, 0.1);
						border: 1px solid rgba(255, 255, 255, 0.3);
						border-radius: 6px;
						color: white;
						font-size: 16px;
						font-weight: 500;
						cursor: pointer;
						outline: none;
						transition: all 0.2s ease;
					}

					.month-select:hover {
						background: rgba(255, 255, 255, 0.2);
						border-color: rgba(255, 255, 255, 0.5);
					}

					.month-select option {
						background: #333;
						color: white;
					}

					/* Mobile Select styling for antd components */
					.ant-select-single.ant-select-lg .ant-select-selector {
						height: 50px !important;
						padding: 0 16px !important;
						background: rgba(255, 255, 255, 0.2) !important;
						border: 1px solid rgba(255, 255, 255, 0.3) !important;
						border-radius: 8px !important;
					}

					.ant-select-single.ant-select-lg .ant-select-selection-item {
						line-height: 48px !important;
						color: white !important;
						font-weight: 600 !important;
					}

					.ant-select-single.ant-select-lg .ant-select-selection-placeholder {
						line-height: 48px !important;
						color: rgba(255, 255, 255, 0.7) !important;
					}

					.ant-select-arrow {
						color: white !important;
					}

					.ant-select-dropdown {
						background: white !important;
					}

					.ant-select-dropdown .ant-select-item {
						color: black !important;
					}

					.ant-select-dropdown .ant-select-item-option-selected {
						background-color: #1890ff !important;
						color: white !important;
					}

					.ant-select-dropdown .ant-select-item:hover {
						background-color: #f5f5f5 !important;
						color: black !important;
					}
				`}
			</style>

			{/* Modals */}
			<ModelDetailsModal
				isOpen={isModelInfoOpen}
				onClose={() => setIsModelInfoOpen(false)}
				models={models}
				selectedModelId={selectedModelId}
				onModelSelect={onModelSelect}
			/>

			<Modal
				title="About the Hei-Planet Platform"
				open={isAboutOpen}
				onCancel={() => setIsAboutOpen(false)}
				footer={null}
				width={600}
			>
				<AboutContent />
			</Modal>
		</div>
	);
};

export default AdvancedTimelineSelector;
