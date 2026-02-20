import {
	CalendarOutlined,
	LeftOutlined,
	RightOutlined,
} from "@ant-design/icons";
import { Button, Select, Slider, Tooltip } from "antd";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { useLocation } from "react-router-dom";
import { viewingMode } from "../../../stores/ViewingModeStore.ts";
import GeneralCard from "../../General/GeneralCard.tsx";
import type { Month } from "../types";
import { MONTHS } from "../utilities/monthUtils";

const { Option } = Select;

interface AntdTimelineSelectorProps {
	year: number;
	month: Month;
	onYearChange: (value: number) => void;
	onMonthChange: (value: Month) => void;
	legend?: ReactNode;
}

const TimelineSelector: React.FC<AntdTimelineSelectorProps> = ({
	year,
	month,
	onYearChange,
	onMonthChange,
	legend,
}) => {
	const location = useLocation();
	const isAdvanced = location.pathname.includes("/advanced");
	const [screenWidth, setScreenWidth] = useState(window.innerWidth);

	// Track screen width for responsive features
	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(window.innerWidth);
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Check if we should show year navigation buttons
	const showYearNavButtons = screenWidth > 1200 && !isMobile;

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

	const mobileContainerStyle: React.CSSProperties = {
		position: "fixed",
		bottom: "0em",
		left: "50%",
		transform: "translateX(-50%)",
		zIndex: 500,
	};

	const containerStyle = isMobile ? mobileContainerStyle : { zIndex: 500 };

	return (
		<div style={containerStyle} data-testid="timeline-selector">
			<GeneralCard
				style={
					isMobile
						? {
								minWidth: "85vw",
								backgroundColor: "rgba(255,255,255,0.8)",
								border: "0",
							}
						: {
								minWidth: isAdvanced ? "unset" : "calc(91vw - 160px)",
								marginLeft:
									false === isAdvanced && false === isMobile
										? "160px"
										: "unset",
							}
				}
				bodyStyle={{ padding: "10px 24px" }}
			>
				<div
					style={
						viewingMode.isExpert
							? {
									backgroundColor: "white",
									padding: "12px 8px",
									borderRadius: "10px",
								}
							: {}
					}
				>
					<div style={{ width: "100%" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 16,
								width: "100%",
							}}
						>
							<div
								hidden={isMobile}
								style={{
									borderRight: "1px solid lightgray",
									paddingRight: "20px",
									marginRight: "10px",
									display: "flex",
									alignItems: "center",
									gap: showYearNavButtons ? "12px" : "0px",
								}}
							>
								{showYearNavButtons && (
									<Button
										type="text"
										icon={<LeftOutlined />}
										onClick={handlePreviousYear}
										disabled={year <= 1960}
										style={{
											border: "1px solid #d9d9d9",
											borderRadius: "6px",
											width: "32px",
											height: "32px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "0",
											fontSize: "14px",
											color: year <= 1960 ? "#bfbfbf" : "white",
											borderColor: "rgba(255, 255, 255, 0.3)",
											backgroundColor: "rgba(255, 255, 255, 0.1)",
										}}
									/>
								)}
								<div
									style={{
										fontSize: "2rem",
										minWidth: showYearNavButtons ? "auto" : "unset",
									}}
								>
									{year}
								</div>
								{showYearNavButtons && (
									<Button
										type="text"
										icon={<RightOutlined />}
										onClick={handleNextYear}
										disabled={year >= 2100}
										style={{
											border: "1px solid #d9d9d9",
											borderRadius: "6px",
											width: "32px",
											height: "32px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											padding: "0",
											fontSize: "14px",
											color: year >= 2100 ? "#bfbfbf" : "white",
											borderColor: "rgba(255, 255, 255, 0.3)",
											backgroundColor: "rgba(255, 255, 255, 0.1)",
										}}
									/>
								)}
							</div>

							{/* Year input - slider on desktop, dropdown on mobile */}
							<div style={{ flex: 1, paddingRight: "10px" }}>
								{isMobile ? (
									<Select
										value={year}
										onChange={onYearChange}
										style={{
											width: "100%",
											height: "60px",
											fontSize: "20px",
											fontWeight: "600",
											textAlign: "center",
											borderRadius: "20px",
											border: "2px solid #e0e7ff",
											boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
											background:
												"linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
										}}
										placeholder="Select Year"
										className={isMobile ? "light-box-shadow" : ""}
										showSearch
										size="large"
										filterOption={(input, option) =>
											option?.children
												?.toString()
												.toLowerCase()
												.includes(input.toLowerCase()) ?? false
										}
									>
										{yearOptions.map((yearOption) => (
											<Option key={yearOption} value={yearOption}>
												{yearOption}
											</Option>
										))}
									</Select>
								) : (
									<Tooltip title={year}>
										<Slider
											value={year}
											min={1960}
											max={2100}
											marks={marks}
											included={false}
											onChange={onYearChange}
											trackStyle={{
												background: "white",
											}}
											railStyle={{
												background: "rgba(255, 255, 255, 0.9)",
												height: "8px",
												borderRadius: "4px",
											}}
											handleStyle={{
												borderColor: "rgba(0, 0, 0, 0.2)",
												backgroundColor: "white",
												boxShadow:
													"0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 0, 0, 0.1)",
												width: "28px",
												height: "28px",
												marginTop: "-10px",
											}}
											style={{ width: "100%" }}
										/>
									</Tooltip>
								)}
							</div>

							{false === isMobile && (
								<Select
									value={month}
									onChange={onMonthChange}
									style={{ minWidth: 140, flexShrink: 0 }}
									suffixIcon={<CalendarOutlined />}
								>
									{MONTHS.map((monthInfo) => (
										<Option key={monthInfo.value} value={monthInfo.value}>
											{monthInfo.label}
										</Option>
									))}
								</Select>
							)}
						</div>
					</div>

					{/* Legend appears below on mobile only */}
					{isMobile && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 16,
								width: "100%",
							}}
						>
							{legend}
						</div>
					)}
				</div>

				{/* Custom CSS for styled modes */}
				{!isMobile && (
					<style>
						{`
							/* White slider styling for styled modes */
							.ant-slider .ant-slider-rail {
								background: rgba(255, 255, 255, 0.9) !important;
								box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
								border-radius: 4px !important;
								height: 8px !important;
							}

							.ant-slider .ant-slider-track {
								background: white !important;
								height: 8px !important;
							}

							.ant-slider .ant-slider-handle {
								border: 2px solid rgba(0, 0, 0, 0.2) !important;
								background: white !important;
								box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
								width: 28px !important;
								height: 28px !important;
								border-radius: 50% !important;
								margin-left: -14px !important;
								margin-top: -10px !important;
							}

							.ant-slider-handle::before,
							.ant-slider-handle::after {
								content: none !important;
							}

							.ant-slider .ant-slider-handle:hover {
								background: white !important;
								box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(0, 0, 0, 0.15) !important;
								transform: scale(1.05) !important;
								border-color: rgba(0, 0, 0, 0.3) !important;
							}

							.ant-slider-mark-text {
								color: rgba(255, 255, 255, 0.95) !important;
								font-size: 16px !important;
								font-weight: 600 !important;
								text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
							}
						`}
					</style>
				)}
			</GeneralCard>
		</div>
	);
};

export default TimelineSelector;
