import { Button } from "antd";
import { Plug } from "lucide-react";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import type { Model } from "../../../types/model";
import Selector from "../../General/Selector.tsx";
import ModelDetailsModal from "./ModelDetailsModal";

// Helper function to truncate text
const truncateText = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
};

const ModelSelector = ({
	error,
	loading,
	models,
	selectedModel,
	onModelSelect,
}: {
	error: string | null;
	loading: boolean;
	models: Model[];
	selectedModel: string;
	onModelSelect: (newModelId: string) => void;
}) => {
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

	const selectedModelData = models.find((m) => m.id === selectedModel);

	// Convert models to selector items format
	const selectorItems = models.map((model) => ({
		id: model.id,
		title: model.modelName,
		description: model.description ?? "",
		emoji: model.emoji,
		color: model.color,
	}));

	// Handler to open modal
	const handleViewDetailsClick = () => {
		setIsDetailsModalOpen(true);
	};

	// Handler for info icon click - opens modal and selects the model
	const handleInfoClick = (modelId: string) => {
		onModelSelect(modelId);
		setIsDetailsModalOpen(true);
	};

	// Create display text with proper truncation
	const getDisplayText = (modelData: Model) => {
		const fullText = modelData.modelName;
		return truncateText(fullText, isMobile ? 12 : 30);
	};

	if (isMobile) {
		// On mobile, just show button that opens modal
		return (
			<span className="model-selector">
				<Button
					className="header-font-size bg-surface-raised border-light"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "6px 12px",
						borderRadius: "8px",
						color: "var(--text-primary)",
						height: "auto",
						maxWidth: "120px",
						fontSize: "15px",
					}}
					loading={loading}
					onClick={() => setIsDetailsModalOpen(true)}
				>
					{selectedModelData ? (
						<>
							<span>{selectedModelData.emoji}</span>
							<span
								style={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
								title={selectedModelData.modelName}
							>
								{getDisplayText(selectedModelData)}
							</span>
						</>
					) : (
						<>
							<Plug size={18} style={{ color: "#0052CC" }} />
							<span>Data Source</span>
						</>
					)}
				</Button>
				<ModelDetailsModal
					isOpen={isDetailsModalOpen}
					onClose={() => setIsDetailsModalOpen(false)}
					models={models}
					selectedModelId={selectedModel}
					onModelSelect={onModelSelect}
				/>
			</span>
		);
	}

	return (
		<span className="model-selector" data-testid="model-selector">
			<Selector
				items={selectorItems}
				selectedId={selectedModel}
				onSelect={onModelSelect}
				title="Disease Models"
				description={
					loading
						? "Loading models..."
						: error
							? "Error loading models (using fallback)"
							: "Select a disease model to visualize spread patterns"
				}
				buttonText={
					selectedModelData ? getDisplayText(selectedModelData) : "Data Source"
				}
				className="header-font-size"
				onInfoClick={handleInfoClick}
				footerAction={
					<Button
						data-testid="view-all-models"
						type="link"
						size="small"
						onClick={handleViewDetailsClick}
						style={{ padding: 0, height: "auto", color: "blue" }}
						disabled={loading}
					>
						View Details & Compare Models
					</Button>
				}
			/>
			<ModelDetailsModal
				isOpen={isDetailsModalOpen}
				onClose={() => setIsDetailsModalOpen(false)}
				models={models}
				selectedModelId={selectedModel}
				onModelSelect={onModelSelect}
			/>
		</span>
	);
};

export default ModelSelector;
