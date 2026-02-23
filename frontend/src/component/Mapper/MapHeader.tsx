import { SettingOutlined } from "@ant-design/icons";
import { Button, Modal, Select } from "antd";
import { Map as MapIcon } from "lucide-react";

const { Option } = Select;
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { useUserSelectionsStore } from "../../contexts/UserSelectionsContext";
import { useMapUIInteractions } from "../../hooks/useMapUIInteractions";
import { useModelData } from "../../hooks/useModelData";
import { viewingMode } from "../../stores/ViewingModeStore.ts";
import GeneralCard from "../General/GeneralCard.tsx";
import ModelSelector from "./InterfaceInputs/ModelSelector.tsx";
import OptimismLevelSelector from "./InterfaceInputs/OptimismSelector.tsx";

const MapHeader = observer(() => {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	// Use MobX store directly instead of props
	const userStore = useUserSelectionsStore();

	const { borderStyle, setBorderStyle } = useMapUIInteractions();

	const { getOptimismLevels } = useModelData(
		userStore.selectedModel,
		userStore.setSelectedModel,
	);

	const handleModelSelect = (modelId: string) => {
		userStore.setSelectedModel(modelId);
	};

	return isMobile ? (
		<div className="map-header">
			<div
				style={{
					position: "fixed",
					top: "1em",
					left: "50%",
					transform: "translateX(-50%)",
					width: "95vw",
					opacity: 1,
					zIndex: 500,
					padding: "1px",
				}}
			>
				<GeneralCard style={{ border: "0px solid" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<img
							alt="Hei-Planet logo"
							className="hei-planet-logo"
							style={{ height: "30px", width: "auto" }}
							src="/images/hei-planet-logo.png"
						/>

						<div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
							<ModelSelector
								selectedModel={userStore.selectedModel}
								onModelSelect={handleModelSelect}
							/>
						</div>

						<Button
							type="text"
							icon={<SettingOutlined />}
							onClick={() => setIsSettingsOpen(true)}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: "42px",
								height: "42px",
							}}
						/>
					</div>
				</GeneralCard>
			</div>

			<Modal
				title="Settings"
				open={isSettingsOpen}
				onCancel={() => setIsSettingsOpen(false)}
				footer={null}
				width="90vw"
				style={{ top: 20 }}
			>
				<div style={{ padding: "20px 0" }}>
					<div style={{ marginBottom: "24px" }}>
						<h4>Optimism Level</h4>
						<div style={{ background: "white" }}>
							<OptimismLevelSelector
								availableOptimismLevels={getOptimismLevels()}
								selectedOptimism={userStore.selectedOptimism}
								setOptimism={userStore.setSelectedOptimism}
							/>
						</div>
					</div>
					{userStore.mapMode === "worldwide" && (
						<div style={{ marginBottom: "24px" }}>
							<h4>Border Style</h4>
							<Select
								value={borderStyle}
								onChange={setBorderStyle}
								style={{ width: "100%" }}
								size="large"
							>
								<Option value="white">White Borders</Option>
								<Option value="light-gray">Light Gray Borders</Option>
								<Option value="black">Black Borders</Option>
								<Option value="black-80">Black 80% Borders</Option>
								<Option value="half-opacity">Half Opacity Borders</Option>
							</Select>
						</div>
					)}
				</div>
			</Modal>
		</div>
	) : (
		<div
			className="map-header header-section center min-w-100"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
				boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
				zIndex: 999,
				backdropFilter: "blur(20px)",
				borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
				margin: 0,
			}}
		>
			{/* Glass morphism overlay */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: "rgba(255, 255, 255, 0.1)",
					backdropFilter: "blur(10px)",
					pointerEvents: "none",
					color: "white",
				}}
			/>

			<GeneralCard
				style={{
					border: "0px solid",
					marginBottom: "0px",
					marginTop: "0px",
					background: "transparent",
					position: "relative",
					zIndex: 1,
				}}
				bodyStyle={{
					paddingTop: "16px",
					paddingBottom: "16px",
				}}
			>
				<div className="logo-section">
					<h1 hidden className="map-title">
						<span className="title-one">Hei-</span>
						<span className="title-health">Planet</span>
						<span className="title-platform">Platform</span>
						<small className="tertiary">
							<i>&nbsp;{viewingMode.isExpert && "Expert Mode"}</i>
						</small>
					</h1>
				</div>
				<div
					className="header-font-size"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
						flexWrap: "wrap",
					}}
				>
					<img
						style={{
							height: "48px",
							width: "auto",
							marginRight: "10px",
						}}
						className="hei-planet-logo"
						alt="Hei-Planet logo"
						src="/images/hei-planet-logo.png"
					/>
					<div
						className="glass-button"
						style={{
							background: "rgba(255, 255, 255, 0.2)",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							borderRadius: "12px",
							padding: "10px 16px",
							backdropFilter: "blur(10px)",
							transition: "all 0.3s ease",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<span
							style={{
								color: "white",
								fontWeight: "500",
							}}
						>
							Display&nbsp;
						</span>
						<ModelSelector
							selectedModel={userStore.selectedModel}
							onModelSelect={handleModelSelect}
						/>
					</div>
					<span
						style={{
							color: "white",
							fontWeight: "500",
							textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
						}}
					>
						with
					</span>
					<div
						className="glass-button"
						style={{
							background: "rgba(255, 255, 255, 0.2)",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							borderRadius: "12px",
							padding: "10px 16px",
							backdropFilter: "blur(10px)",
							transition: "all 0.3s ease",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<OptimismLevelSelector
							availableOptimismLevels={getOptimismLevels()}
							selectedOptimism={userStore.selectedOptimism}
							setOptimism={userStore.setSelectedOptimism}
						/>
						<span
							style={{
								color: "white",
								fontWeight: "500",
							}}
						>
							&nbsp;predictions
						</span>
					</div>
					<div
						className="glass-button"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "10px",
							padding: "12px 16px",
							background: "rgba(255, 255, 255, 0.2)",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							borderRadius: "12px",
							backdropFilter: "blur(10px)",
							transition: "all 0.3s ease",
							color: "white",
							fontWeight: "500",
						}}
					>
						<MapIcon size={20} />
						<Select
							value={userStore.mapMode}
							onChange={(v) => {
								console.log("Map mode should be updated as such:", v);
								userStore.setMapMode(v);
							}}
							style={{ minWidth: 120 }}
							size="middle"
						>
							<Option value="europe-only">Europe-only</Option>
							<Option value="worldwide">
								Worldwide[deprecated, too slow now, will use backend regions]
							</Option>
							<Option value="grid">Grid</Option>
						</Select>
					</div>
					{userStore.mapMode === "worldwide" && (
						<div
							className="glass-button"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								padding: "12px 16px",
								background: "rgba(255, 255, 255, 0.2)",
								border: "1px solid rgba(255, 255, 255, 0.3)",
								borderRadius: "12px",
								backdropFilter: "blur(10px)",
								transition: "all 0.3s ease",
								color: "white",
								fontWeight: "500",
							}}
						>
							<span style={{ fontSize: "16px" }}>🖼️</span>
							<Select
								value={borderStyle}
								onChange={setBorderStyle}
								style={{ minWidth: 100 }}
								size="middle"
							>
								<Option value="white">White</Option>
								<Option value="light-gray">Light Gray</Option>
								<Option value="black">Black</Option>
								<Option value="black-80">Black 80%</Option>
								<Option value="half-opacity">Half Opacity</Option>
							</Select>
						</div>
					)}
					<small
						className="tertiary glass-button"
						style={{
							background: "rgba(255, 255, 255, 0.2)",
							border: "1px solid rgba(255, 255, 255, 0.3)",
							borderRadius: "12px",
							padding: "8px 12px",
							backdropFilter: "blur(10px)",
							transition: "all 0.3s ease",
							color: "white",
							fontWeight: "500",
						}}
						hidden={viewingMode.isExpert === false}
					>
						Expert Mode
					</small>
				</div>

				{/* Custom CSS for glass effects */}
				<style>
					{`
						.glass-button:hover {
							background: rgba(255, 255, 255, 0.3) !important;
							border-color: rgba(255, 255, 255, 0.5) !important;
							transform: translateY(-1px);
							box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
						}

						.glass-button .ant-select-selector {
							background: rgba(255, 255, 255, 0.1) !important;
							border: 1px solid rgba(255, 255, 255, 0.3) !important;
							color: white !important;
						}

						.glass-button .ant-select-selection-item,
						.glass-button .ant-select-arrow,
						.glass-button .anticon {
							color: white !important;
						}

						.glass-button button {
							background: transparent !important;
							border: none !important;
							color: white;
						}

						.glass-button button:hover {
							background: rgba(255, 255, 255, 0.1) !important;
						}

						.glass-button .ant-select-selector:hover {
							background: rgba(255, 255, 255, 0.2) !important;
							border-color: rgba(255, 255, 255, 0.4) !important;
						}

						.glass-button .ant-select-focused .ant-select-selector {
							background: rgba(255, 255, 255, 0.2) !important;
							border-color: rgba(255, 255, 255, 0.4) !important;
							box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
						}

						.glass-button .model-selector-button {
							background: rgba(255, 255, 255, 0.1) !important;
							border: 1px solid rgba(255, 255, 255, 0.3) !important;
							color: white !important;
						}

						.glass-button .model-selector-button:hover {
							background: rgba(255, 255, 255, 0.2) !important;
							border-color: rgba(255, 255, 255, 0.4) !important;
						}

						.glass-button .model-selector-button .chevron {
							color: white !important;
						}
					`}
				</style>
			</GeneralCard>
		</div>
	);
});

export default MapHeader;
