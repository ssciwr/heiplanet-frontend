import { Select } from "antd";
import { Map as MapIcon } from "lucide-react";

const { Option } = Select;
import { observer } from "mobx-react-lite";
import { isMobile } from "react-device-detect";
import { useUserSelectionsForClimateQueryStore } from "../../contexts/UserSelectionsForClimateQueryContext";
import { viewingMode } from "../../stores/ViewingModeStore.ts";
import type { Model } from "../../types/model";
import GeneralCard from "../General/GeneralCard.tsx";
import ModelSelector from "./InterfaceInputs/ModelSelector.tsx";

const MapHeader = observer(
	({
		modelMetadataError,
		modelMetadataLoading,
		models,
	}: {
		modelMetadataError: string | null;
		modelMetadataLoading: boolean;
		models: Model[];
	}) => {
		const userStore = useUserSelectionsForClimateQueryStore();

		const handleModelSelect = (modelId: string) => {
			userStore.setSelectedModel(modelId);
		};

		if (isMobile) {
			return (
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

								<div
									style={{
										flex: 1,
										display: "flex",
										justifyContent: "center",
										gap: "8px",
										flexWrap: "wrap",
									}}
								>
									<ModelSelector
										error={modelMetadataError}
										loading={modelMetadataLoading}
										models={models}
										selectedModel={userStore.selectedModel}
										onModelSelect={handleModelSelect}
									/>
									<Select
										value={userStore.mapMode}
										onChange={(v) => {
											console.log("Map mode should be updated as such:", v);
											userStore.setMapMode(v);
										}}
										style={{ minWidth: 116 }}
										size="middle"
									>
										<Option value="europe-only">Europe-only</Option>
										<Option value="grid">Grid</Option>
									</Select>
								</div>

								<div style={{ width: "42px", height: "42px" }} />
							</div>
						</GeneralCard>
					</div>
				</div>
			);
		}

		return (
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
								error={modelMetadataError}
								loading={modelMetadataLoading}
								models={models}
								selectedModel={userStore.selectedModel}
								onModelSelect={handleModelSelect}
							/>
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
								<Option value="grid">Grid</Option>
							</Select>
						</div>
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
	},
);

export default MapHeader;
