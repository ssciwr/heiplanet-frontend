import { ChevronDown, Info } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";

interface SelectorItem {
	id: string;
	title: string;
	description?: string;
	emoji?: string;
	icon?: React.ComponentType<{ size?: number; className?: string }>;
	color?: string;
}

interface SelectorProps {
	items: SelectorItem[];
	selectedId: string;
	onSelect: (id: string) => void;
	title: string;
	description: string;
	buttonText?: string;
	footerText?: string;
	footerAction?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
	onInfoClick?: (id: string) => void;
}

const Selector: React.FC<SelectorProps> = ({
	items,
	selectedId,
	onSelect,
	title,
	description,
	buttonText,
	footerText,
	footerAction,
	className = "",
	style = {},
	onInfoClick,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const selectorRef = useRef<HTMLSpanElement>(null);

	const selectedItem = items.find((item) => item.id === selectedId);

	// Handle click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				selectorRef.current &&
				!selectorRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscapeKey);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [isOpen]);

	const handleSelect = (id: string) => {
		onSelect(id);
		setIsOpen(false);
	};

	const handleInfoClick = (id: string, event: React.MouseEvent) => {
		event.stopPropagation();
		if (onInfoClick) {
			onInfoClick(id);
		}
	};

	// Wrap footerAction to automatically close dropdown when clicked
	const wrappedFooterAction =
		footerAction && React.isValidElement(footerAction)
			? React.cloneElement(
					footerAction as React.ReactElement<{
						onClick?: (e: React.MouseEvent) => void;
					}>,
					{
						onClick: (e: React.MouseEvent) => {
							// Call original onClick if it exists
							const typedFooterAction = footerAction as React.ReactElement<{
								onClick?: (e: React.MouseEvent) => void;
							}>;
							if (typedFooterAction.props.onClick) {
								typedFooterAction.props.onClick(e);
							}
							// Always close the dropdown
							setIsOpen(false);
						},
					},
				)
			: footerAction;

	return (
		<span
			ref={selectorRef}
			className={`model-selector ${className}`}
			style={style}
		>
			<button
				type="button"
				className="model-selector-button header-font-size"
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex items-center gap-sm">
					{selectedItem?.emoji && (
						<span className="white-icon-bg">
							&nbsp;{selectedItem.emoji}&nbsp;
						</span>
					)}
					{selectedItem?.icon && (
						<selectedItem.icon className="icon" size={18} />
					)}
					<span>{buttonText || selectedItem?.title || "Select Option"}</span>
					<ChevronDown
						className={`chevron ${isOpen ? "open" : ""}`}
						size={16}
					/>
				</div>
			</button>

			{isOpen && (
				<div className="model-dropdown">
					<div className="model-header">
						<h3>{title}</h3>
						<p className="model-description">{description}</p>
					</div>

					<div className="virus-list">
						{items.slice(0, 5).map((item) => (
							<button
								type="button"
								key={item.id}
								className={`virus-item ${selectedId === item.id ? "selected" : ""}`}
								onClick={() => handleSelect(item.id)}
							>
								<div className="virus-icon" style={{ color: item.color }}>
									{item.emoji ? (
										<div className="emoji-container">
											<span className="virus-emoji">&nbsp;{item.emoji}</span>
										</div>
									) : item.icon ? (
										<item.icon size={24} />
									) : null}
								</div>
								<div className="virus-info">
									<h4>{item.title}</h4>
									<p>{item.description ?? ""}</p>
								</div>
								{!isMobile && onInfoClick && (
									<button
										type="button"
										className="info-icon-button"
										onClick={(e) => handleInfoClick(item.id, e)}
										style={{
											marginLeft: "auto",
											padding: "4px",
											background: "var(--primary)",
											border: "none",
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
											color: "white",
											transition: "all 0.2s ease",
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.backgroundColor =
												"var(--primary-hover)";
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.backgroundColor = "var(--primary)";
										}}
										title="View model details"
									>
										<Info size={16} />
									</button>
								)}
							</button>
						))}
					</div>

					{(footerText || footerAction) && (
						<div className="model-footer">
							{footerText && <span>{footerText}</span>}
							{wrappedFooterAction}
						</div>
					)}
				</div>
			)}
		</span>
	);
};

export default Selector;
