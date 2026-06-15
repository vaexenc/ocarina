import "no-darkreader";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import {deleteHasPlayed, deleteSettings, loadHasPlayed, loadSettings} from "./settings/settings";
import "./styles/main.css";

// `?reset` escape hatch: wipe persisted state, then strip the param. Must run before any read.
if (new URL(window.location.href).searchParams.has("reset")) {
	deleteSettings();
	deleteHasPlayed();
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
		<App initialSettings={loadSettings()} hasPlayedBefore={loadHasPlayed()} />
	</React.StrictMode>
);
