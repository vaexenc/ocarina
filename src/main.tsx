import App from "@/App.tsx";
import {consumeBootParams} from "@/settings/boot";
import {
	loadHasPlayed,
	loadInstrument,
	loadMode,
	loadSettings,
	loadSpeedrunSet,
} from "@/settings/settings";
import "@/styles/main.css";
import "no-darkreader";
import React from "react";
import ReactDOM from "react-dom/client";

// Apply any `?reset` / `?speedrun` URL overrides before reading persisted state below.
consumeBootParams();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<App
			initialSettings={loadSettings()}
			initialInstrumentId={loadInstrument()}
			initialMode={loadMode()}
			initialSpeedrunSet={loadSpeedrunSet()}
			hasPlayedBefore={loadHasPlayed()}
		/>
	</React.StrictMode>
);
