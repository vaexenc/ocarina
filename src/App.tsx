import {useCallback, useEffect, useRef, useState} from "react";
import Background from "./components/background/Background";
import LoadingScreen from "./components/loading-screen/LoadingScreen";
import MetaModal from "./components/meta-modal/MetaModal";
import SongPlayer from "./components/songs/SongPlayer";
import {AudioBuffers, AudioSystem, Song} from "./types";
import {deleteSettings, loadSettings, saveSettings} from "./util/user-settings/user-settings";
import {createAudioSystem, playSound} from "./util/audio";
import {checkIfMobileDevice} from "./util/util";

if (new URL(window.location.href).searchParams.has("reset")) {
	deleteSettings();
	localStorage.removeItem("ocarina.hasPlayedBefore");

	const urlWithoutParameters = window.location.origin + window.location.pathname;
	window.history.replaceState({}, document.title, urlWithoutParameters);
}

const settingsInitial = loadSettings();
const hasPlayedBefore = !!localStorage.getItem("ocarina.hasPlayedBefore");

function App() {
	const [settings, setSettings] = useState(settingsInitial);
	const [isLoadingScreenOpen, setIsLoadingScreenOpen] = useState(true);
	const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(checkIfMobileDevice());
	const [currentSongId, setCurrentSongId] = useState<string | null>(null);

	// Lazily create the single AudioContext on first render (and never on re-renders).
	const audioSystemRef = useRef<AudioSystem | null>(null);
	audioSystemRef.current ??= createAudioSystem();
	const audioSystem = audioSystemRef as React.RefObject<AudioSystem>;
	const audioBuffers = useRef<AudioBuffers>({});

	// Persist settings, debounced so dragging the volume slider doesn't hammer localStorage.
	useEffect(() => {
		const timer = setTimeout(() => saveSettings(settings), 200);
		return () => clearTimeout(timer);
	}, [settings]);

	useEffect(() => {
		audioSystem.current.gain.gain.value = settings.volume;
	}, [settings.volume, audioSystem]);

	const onSongCorrect = useCallback(
		(songId: string, songData: Song) => {
			playSound(audioSystem.current, audioBuffers.current["song-correct"], {gain: 0.5});
			if (songData.notes.includes("a")) {
				localStorage.setItem("ocarina.hasPlayedBefore", "1");
			}
			setCurrentSongId(songId);
		},
		[audioSystem]
	);

	const onSongEnd = useCallback(() => {
		setCurrentSongId(null);
	}, []);

	useEffect(() => {
		const pointerQuery = window.matchMedia("(pointer: coarse)");
		const onPointerChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

		pointerQuery.addEventListener("change", onPointerChange);

		return () => {
			pointerQuery.removeEventListener("change", onPointerChange);
		};
	}, []);

	return (
		<>
			<Background
				isParallaxOn={!isMobile && settings.bgMovement}
				doesParallaxUpdate={true /*!isMetaModalOpen*/}
			/>
			<SongPlayer
				isReady={!isLoadingScreenOpen}
				settings={settings}
				isMobile={isMobile}
				isInputEnabled={!isLoadingScreenOpen && !isMetaModalOpen}
				onSongCorrect={onSongCorrect}
				onSongEnd={onSongEnd}
				audioSystem={audioSystem}
				audioBuffers={audioBuffers}
				currentSongId={currentSongId}
			/>
			<MetaModal
				isOpen={isMetaModalOpen}
				onOpen={() => {
					setIsMetaModalOpen(true);
					if (!currentSongId) {
						playSound(audioSystem.current, audioBuffers.current["menu-open"]);
					}
				}}
				onClose={() => {
					setIsMetaModalOpen(false);
					if (!currentSongId) {
						playSound(audioSystem.current, audioBuffers.current["menu-close"]);
					}
				}}
				settings={settings}
				setSettings={setSettings}
				isMobile={isMobile}
			/>
			<LoadingScreen
				settings={settings}
				isMobile={isMobile}
				audioSystem={audioSystem}
				audioBuffers={audioBuffers}
				onClose={() => setIsLoadingScreenOpen(false)}
				showControls={!hasPlayedBefore}
			/>
		</>
	);
}

export default App;
