import {
	CheckOutlined,
	FileTextOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { Badge, Button, Image, List, Modal, Space, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import type { Model } from "../../../types/model";
import SimpleMarkdown from "../../General/SimpleMarkdown";

const { Title, Text, Paragraph, Link } = Typography;

interface ModelDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	models: Model[];
	selectedModelId: string;
	onModelSelect: (modelId: string) => void;
	showCurrentModelFirst?: boolean; // New prop to show current model details first
}

const ModelDetailsModal: React.FC<ModelDetailsModalProps> = React.memo(
	({
		isOpen,
		onClose,
		models,
		selectedModelId,
		onModelSelect,
		showCurrentModelFirst = false,
	}) => {
		const [selectedDetailModelId, setSelectedDetailModelId] =
			useState(selectedModelId);

		const [sidebarHidden, setSidebarHidden] = useState(
			isMobile && showCurrentModelFirst,
		);
		const [singleModelDetailsHidden, setSingleModelDetailsHidden] = useState(
			isMobile && !showCurrentModelFirst,
		); // Show current model details if requested

		// Reset view state when modal opens/closes
		useEffect(() => {
			if (isOpen) {
				setSidebarHidden(isMobile && showCurrentModelFirst);
				setSingleModelDetailsHidden(isMobile && !showCurrentModelFirst); // Show current model if requested
				setSelectedDetailModelId(selectedModelId);
			}
		}, [isOpen, selectedModelId, showCurrentModelFirst]);

		const selectedDetailModel =
			models.find((m) => m.id === selectedDetailModelId) || models[0];

		const handleModelSelect = (modelId: string) => {
			onModelSelect(modelId);
			onClose();
		};

		return (
			<Modal
				title={
					<div
						style={{
							borderBottom: "1px solid #f0f0f0",
							paddingBottom: "16px",
							marginBottom: "0",
						}}
					>
						<Title level={4} style={{ margin: 0, color: "#172B4D" }}>
							Disease Model Details
						</Title>
						<Text
							hidden={isMobile}
							type="secondary"
							style={{ fontSize: "14px" }}
						>
							Compare and select disease models for climate analysis
						</Text>
					</div>
				}
				open={isOpen}
				onCancel={onClose}
				width={1000}
				footer={null}
				styles={{
					body: { padding: "6px 0 0 0" },
				}}
			>
				<div
					data-testid="model-details-modal"
					style={{ display: "flex", height: "700px" }}
				>
					{/* Left Sidebar - Model List */}
					<div
						hidden={sidebarHidden}
						style={{
							width: "280px",
							borderRight: "1px solid #f0f0f0",
							paddingRight: "0",
							marginRight: "24px",
						}}
					>
						<div style={{ padding: "0 24px 16px 24px" }}>
							<Title level={5} style={{ margin: "0 0 8px 0" }}>
								Available Models
							</Title>
							<p className="tertiary">Select a model to view details</p>
						</div>

						<List
							style={{ height: "600px", overflowY: "auto" }}
							dataSource={models}
							renderItem={(model) => (
								<List.Item
									style={{
										padding: "12px 24px",
										cursor: "pointer",
										backgroundColor:
											selectedDetailModelId === model.id
												? "#f6ffed"
												: "transparent",
										borderLeft:
											selectedDetailModelId === model.id
												? "3px solid #52c41a"
												: "3px solid transparent",
										borderBottom: "1px solid #f5f5f5",
									}}
									onClick={() => {
										setSelectedDetailModelId(model.id);
										if (isMobile) {
											setSidebarHidden(true);
											setSingleModelDetailsHidden(false);
										}
									}}
								>
									<List.Item.Meta
										avatar={
											<div
												style={{
													width: "40px",
													height: "40px",
													borderRadius: "8px",
													background: `${model.color || "#1890ff"}20`,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "18px",
													position: "relative",
												}}
											>
												{model.emoji || "📊"}
												{selectedModelId === model.id && (
													<Badge
														count={
															<CheckOutlined
																style={{ color: "#52c41a", fontSize: "12px" }}
															/>
														}
														style={{
															position: "absolute",
															top: "-5px",
															right: "-5px",
															backgroundColor: "white",
															border: "1px solid #52c41a",
															borderRadius: "50%",
															width: "18px",
															height: "18px",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
													/>
												)}
											</div>
										}
										title={
											<div>
												<Text
													strong
													style={{ fontSize: "14px", color: "#172B4D" }}
												>
													{model.modelName || "Unnamed Model"}
												</Text>
												{selectedModelId === model.id && (
													<Badge
														status="success"
														text="Current"
														style={{
															marginLeft: "8px",
															fontSize: "11px",
															color: "#52c41a",
														}}
													/>
												)}
											</div>
										}
										description={
											<Text style={{ fontSize: "12px", color: "#6B778C" }}>
												{model.title || "No title available"}
											</Text>
										}
									/>
								</List.Item>
							)}
						/>
					</div>

					{/* Right Panel - Model Details */}
					<div
						hidden={singleModelDetailsHidden}
						style={{ flex: 1, padding: "0 24px", overflowY: "auto" }}
					>
						{selectedDetailModel && (
							<div style={{ paddingBottom: "80px" }}>
								{/* Header Section */}
								<div style={{ marginBottom: "24px" }}>
									<Space align="center" style={{ marginBottom: "16px" }}>
										<div
											style={{
												width: "72px",
												height: "72px",
												borderRadius: "20px",
												background: `${selectedDetailModel.color || "#1890ff"}20`,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "36px",
											}}
										>
											{selectedDetailModel.emoji || "📊"}
										</div>
										<div>
											<Title level={1} style={{ margin: "0 0 4px 0" }}>
												{selectedDetailModel.title || "Untitled Model"}
											</Title>
										</div>
									</Space>
									{selectedDetailModel.description &&
										!/^model card:/i.test(
											selectedDetailModel.description.trim(),
										) && (
											<div>
												<Text className="tertiary">
													{selectedDetailModel.description}
												</Text>
											</div>
										)}
								</div>

								{/* Model Card Section */}
								<div style={{ marginBottom: "32px" }}>
									{selectedDetailModel.cardMarkdown ? (
										<SimpleMarkdown
											markdown={selectedDetailModel.cardMarkdown}
										/>
									) : (
										<Text type="secondary">
											No model card content is available for this model.
										</Text>
									)}
								</div>

								{/* Authors Section */}
								{selectedDetailModel.authors &&
									selectedDetailModel.authors.length > 0 && (
										<div style={{ marginBottom: "24px" }}>
											<Title
												level={5}
												style={{ marginBottom: "12px", color: "#172B4D" }}
											>
												<UserOutlined style={{ marginRight: "8px" }} />
												Authors
											</Title>
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "8px",
												}}
											>
												{selectedDetailModel.authors.map((author, index) => (
													<Badge
														key={index.toString() + author}
														count={author}
														style={{
															backgroundColor: "#f0f0f0",
															color: "#333",
															fontSize: "12px",
															padding: "4px 8px",
															borderRadius: "4px",
															border: "1px solid #d9d9d9",
														}}
													/>
												))}
											</div>
										</div>
									)}

								{/* Paper Reference Section */}
								{selectedDetailModel.paper && (
									<div style={{ marginBottom: "24px" }}>
										<Title
											level={5}
											style={{ marginBottom: "12px", color: "#172B4D" }}
										>
											<FileTextOutlined style={{ marginRight: "8px" }} />
											Related Paper
										</Title>
										<div
											style={{
												padding: "12px",
												backgroundColor: "#f8f9fa",
												borderRadius: "6px",
												border: "1px solid #e9ecef",
											}}
										>
											<Link
												href={selectedDetailModel.paper.url}
												target="_blank"
												rel="noopener noreferrer"
												style={{ fontSize: "14px", fontWeight: 500 }}
											>
												{selectedDetailModel.paper.paperTitle}
											</Link>
										</div>
									</div>
								)}

								{/* Model Graph/Chart Section */}
								{selectedDetailModel.image && (
									<div style={{ marginBottom: "24px" }}>
										<Title
											level={5}
											style={{ marginBottom: "12px", color: "#172B4D" }}
										>
											Model Visualization
										</Title>
										<div
											style={{
												border: "1px solid #e8e8e8",
												borderRadius: "8px",
												overflow: "hidden",
												backgroundColor: "#fafafa",
											}}
										>
											<Image
												src={selectedDetailModel.image}
												alt={`${selectedDetailModel.title || "Model"} visualization`}
												style={{
													width: "100%",
													maxHeight: "300px",
													objectFit: "contain",
												}}
												fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN4BMghRc+ATaQrAOHcRiKQ4jQFmuD/wGcQrLOYEUQSBvECaA4dQq2YEsRgjBVjA4wZbw7vTgFTNRV0/1xvz7n+Q1HuJ6kz/+1j/NfPUUzCQAAAAAAAAAAAAAAAAAAAAAAAH/"
												preview={{
													mask: (
														<div style={{ fontSize: "16px" }}>
															🔍 View Chart
														</div>
													),
												}}
											/>
										</div>
									</div>
								)}

								{/* Model Details Section */}
								{selectedDetailModel.details && (
									<div style={{ marginBottom: "32px" }}>
										<Title
											level={5}
											style={{ marginBottom: "12px", color: "#172B4D" }}
										>
											Model Details
										</Title>
										<Paragraph
											style={{
												fontSize: "14px",
												lineHeight: "1.6",
												color: "#42526E",
											}}
										>
											{selectedDetailModel.details}
										</Paragraph>
									</div>
								)}

								{/* Action Buttons */}
								<div
									style={{
										position: "absolute",
										bottom: "24px",
										right: "24px",
										display: "flex",
										gap: "12px",
									}}
								>
									{selectedDetailModel.cardYamlUrl && (
										<Button
											href={selectedDetailModel.cardYamlUrl}
											target="_blank"
											rel="noreferrer"
										>
											YAML
										</Button>
									)}
									<Button
										onClick={
											isMobile
												? () => {
														setSidebarHidden(false);
														setSingleModelDetailsHidden(true);
													}
												: onClose
										}
									>
										{isMobile ? "View other models" : "Cancel"}
									</Button>
									<Button
										type="primary"
										onClick={() => handleModelSelect(selectedDetailModel.id)}
										style={{
											backgroundColor: "#0052CC",
											borderColor: "#0052CC",
										}}
									>
										{selectedModelId === selectedDetailModel.id
											? "Currently Selected"
											: "Select Model"}
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</Modal>
		);
	},
	(prevProps, nextProps) => {
		// Custom comparison function for React.memo, to see if we need to call the API again
		return (
			prevProps.isOpen === nextProps.isOpen &&
			prevProps.selectedModelId === nextProps.selectedModelId &&
			prevProps.models === nextProps.models
		);
	},
);

ModelDetailsModal.displayName = "ModelDetailsModal";

export default ModelDetailsModal;
