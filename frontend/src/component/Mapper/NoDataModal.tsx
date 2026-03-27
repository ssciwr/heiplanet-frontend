import { Modal } from "antd";
import { CalendarIcon } from "lucide-react";
import { memo } from "react";
import type { Month } from "./types";
import { getMonthLabel } from "./utilities/monthUtils";

interface NoDataModalProps {
	isOpen: boolean;
	onClose: () => void;
	onLoadCurrentYear: () => void;
	requestedYear: number;
	requestedMonth: number;
	errorMessage?: string;
}

const NoDataModal = memo(
	({
		isOpen,
		onClose,
		onLoadCurrentYear,
		requestedYear,
		requestedMonth,
		errorMessage,
	}: NoDataModalProps) => {
		const currentYear = new Date().getFullYear();
		const safeRequestedMonth =
			requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : 1;
		const requestedMonthLabel = getMonthLabel(safeRequestedMonth as Month);

		return (
			<Modal
				title="No Data Available"
				open={isOpen}
				onCancel={onClose}
				onOk={onLoadCurrentYear}
				okText={`Load Current Year (${currentYear})`}
				cancelText="Cancel"
				centered
				destroyOnHidden
			>
				<div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
					<CalendarIcon
						size={20}
						style={{ color: "#1677ff", marginTop: "2px" }}
					/>
					<div>
						<p>
							Unfortunately, <strong>{requestedMonthLabel}</strong>{" "}
							<strong>{requestedYear}</strong> does not have any data available.
						</p>
						<p>
							You can try loading the current year ({currentYear}) if newer data
							has been loaded, or select a different month/year from the
							timeline.
						</p>
						{errorMessage && (
							<p style={{ color: "#999", fontSize: "12px", marginTop: "16px" }}>
								{errorMessage}
							</p>
						)}
					</div>
				</div>
			</Modal>
		);
	},
	(previousProps, nextProps) =>
		previousProps.isOpen === nextProps.isOpen &&
		previousProps.requestedYear === nextProps.requestedYear &&
		previousProps.requestedMonth === nextProps.requestedMonth &&
		previousProps.errorMessage === nextProps.errorMessage,
);

export default NoDataModal;
