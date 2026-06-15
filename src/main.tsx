import "no-darkreader";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./styles/main.css";
import {deleteSettings, loadSettings} from "./util/user-settings/user-settings";

const HAS_PLAYED_KEY = "ocarina.hasPlayedBefore";

// `?reset` escape hatch: wipe persisted state, then strip the param. Must run before any read.
if (new URL(window.location.href).searchParams.has("reset")) {
	deleteSettings();
	localStorage.removeItem(HAS_PLAYED_KEY);
	window.history.replaceState(
		{},
		document.title,
		window.location.origin + window.location.pathname
	);
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<App
			initialSettings={loadSettings()}
			hasPlayedBefore={!!localStorage.getItem(HAS_PLAYED_KEY)}
		/>
	</React.StrictMode>
);
