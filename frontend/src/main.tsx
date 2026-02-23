import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { UserSelectionsProvider } from "./contexts/UserSelectionsContext.tsx";
import "./index.css";

// Function to handle loading screen removal
const removeLoadingScreen = () => {
	const loadingScreen = document.getElementById("loading-screen");
	const root = document.getElementById("root");

	if (loadingScreen && root) {
		// Start fade out animation
		loadingScreen.classList.add("fade-out");

		// Show the React app
		setTimeout(() => {
			root.classList.add("loaded");
			// Remove loading screen from DOM after animation
			setTimeout(() => {
				if (loadingScreen?.parentNode) {
					loadingScreen.remove();
				}
			}, 500);
		}, 100);
	}
};

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<UserSelectionsProvider>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</UserSelectionsProvider>
		</React.StrictMode>,
	);

	// Ensure loading screen is removed when React is ready
	// This acts as a fallback if the HTML script doesn't work properly
	setTimeout(() => {
		removeLoadingScreen();
	}, 2500);
}
