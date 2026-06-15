import "no-darkreader";
import React, {Suspense} from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import {deleteHasPlayed, deleteSettings, loadHasPlayed, loadSettings} from "./settings/settings";
import "./styles/main.css";

// Code-split the 3D viewer (pulls in three.js) so it only loads on /anim.
const AnimPage = React.lazy(() => import("./anim/AnimPage.tsx"));

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

// Tiny path-based routing: /anim renders the 3D model viewer, everything else
// renders the ocarina app. (Vite's dev server serves index.html for /anim.)
const isAnimRoute = window.location.pathname.replace(/\/+$/, "") === "/anim";

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		{isAnimRoute ? (
			<Suspense fallback={null}>
				<AnimPage />
			</Suspense>
		) : (
			<App initialSettings={loadSettings()} hasPlayedBefore={loadHasPlayed()} />
		)}
	</React.StrictMode>
);
