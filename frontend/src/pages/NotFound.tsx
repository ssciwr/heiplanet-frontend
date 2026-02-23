import { Button } from "antd";
import { HomeIcon, MapPinIcon } from "lucide-react";
import { Link } from "react-router-dom";
import GeneralCard from "../component/General/GeneralCard.tsx";
import Footer from "../static/Footer.tsx";

const NotFound = () => (
	<div
		style={{
			background: "rgb(235, 235, 235)",
			minHeight: "100vh",
			minWidth: "100vw",
			fontFamily: "var(--font-inter)",
		}}
	>
		{/* Header with logo */}
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: "12px",
				padding: "20px 0",
				background: "white",
			}}
		>
			<img
				src="/images/hei-planet-logo.png"
				alt="Hei-Planet logo"
				className="hei-planet-logo"
				style={{
					height: "40px",
					width: "auto",
				}}
			/>
			<h1
				style={{
					fontSize: "2rem",
					fontWeight: 600,
					color: "rgb(32,32,32)",
					margin: 0,
				}}
			>
				Hei-Planet
			</h1>
		</div>

		<div className="horizontal-margin-on-medium-up">
			<GeneralCard
				style={{ marginTop: "60px" }}
				bodyStyle={{
					textAlign: "center",
					padding: "40px 24px",
				}}
			>
				<h1
					style={{
						color: "#7c7cdb",
						fontSize: "3rem",
						marginBottom: "16px",
						fontWeight: 600,
						margin: "0 0 16px 0",
					}}
				>
					404
				</h1>
				<h2
					style={{
						color: "var(--text-primary)",
						fontSize: "1.5rem",
						marginBottom: "24px",
						fontWeight: 400,
						margin: "0 0 24px 0",
					}}
				>
					Page Not Found
				</h2>
				<p
					style={{
						color: "var(--text-secondary)",
						fontSize: "1.1rem",
						marginBottom: "32px",
						margin: "0 0 32px 0",
					}}
				>
					The page you're looking for doesn't exist. Let's get you back on
					track.
				</p>
				<div
					style={{
						display: "flex",
						gap: "12px",
						justifyContent: "center",
						flexWrap: "wrap",
					}}
				>
					<Link to={"/"}>
						<Button
							size="large"
							icon={<HomeIcon />}
							style={{
								background: "white",
								borderColor: "#7c7cdb",
								color: "#7c7cdb",
								borderRadius: "16px",
								padding: "12px 24px",
								height: "auto",
								fontWeight: 500,
							}}
						>
							Go Home
						</Button>
					</Link>
					<Link to={"/map"}>
						<Button
							type="primary"
							size="large"
							icon={<MapPinIcon />}
							style={{
								background: "#7c7cdb",
								borderColor: "#7c7cdb",
								borderRadius: "16px",
								padding: "12px 24px",
								height: "auto",
								fontWeight: 500,
							}}
						>
							View Climate Map
						</Button>
					</Link>
				</div>
			</GeneralCard>
		</div>
		<Footer />
	</div>
);

export default NotFound;
