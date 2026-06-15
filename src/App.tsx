import {useCallback, useEffect, useRef, useState} from "react";
import Background from "./components/Background";
import LoadingScreen from "./components/LoadingScreen";
import MetaModal from "./components/meta-modal/MetaModal";
import SongPlayer from "./components/songs/SongPlayer";
import {AudioBuffers, AudioSystem, SettingValues, Song} from "./types";
import {markHasPlayed, saveSettings} from "./settings/settings";
import {createAudioSystem, playSound} from "./util/audio";
import {checkIfMobileDevice} from "./util/dom";

function App({
	initialSettings,
	hasPlayedBefore,
}: {
	initialSettings: SettingValues;
	hasPlayedBefore: boolean;
}) {
	const [settings, setSettings] = useState(initialSettings);
	const [isLoadingScreenOpen, setIsLoadingScreenOpen] = useState(true);
	const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(checkIfMobileDevice());
	const [currentSongId, setCurrentSongId] = useState<string | null>(null);

	// Lazily create the single AudioContext on first render (and never on re-renders).
	// The system is immutable once created, so we pass the value (not the ref) downward.
	const audioSystemRef = useRef<AudioSystem | null>(null);
	audioSystemRef.current ??= createAudioSystem();
	const audioSystem = audioSystemRef.current;
	const audioBuffers = useRef<AudioBuffers>({});

	// Persist settings, debounced so dragging the volume slider doesn't hammer localStorage.
	useEffect(() => {
		const timer = setTimeout(() => saveSettings(settings), 200);
		return () => clearTimeout(timer);
	}, [settings]);

	useEffect(() => {
		audioSystem.gain.gain.value = settings.volume;
	}, [settings.volume, audioSystem]);

	const onSongCorrect = useCallback(
		(songId: string, songData: Song) => {
			playSound(audioSystem, audioBuffers.current["song-correct"], {gain: 0.5});
			// A song using the A note proves the player has found the A control, so we can stop
			// hinting the controls on future visits.
			if (songData.notes.includes("a")) {
				markHasPlayed();
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
			<Background isParallaxOn={!isMobile && settings.bgMovement} />
			<SongPlayer
				isReady={!isLoadingScreenOpen}
				settings={settings}
				isMobile={isMobile}
				isInputEnabled={!isLoadingScreenOpen && !isMetaModalOpen}
				onSongCorrect={onSongCorrect}
				onSongEnd={onSongEnd}
				audioSystem={audioSystem}
				audioBuffers={audioBuffers}
			/>
			<MetaModal
				isOpen={isMetaModalOpen}
				onOpen={() => {
					setIsMetaModalOpen(true);
					if (!currentSongId) {
						playSound(audioSystem, audioBuffers.current["menu-open"]);
					}
				}}
				onClose={() => {
					setIsMetaModalOpen(false);
					if (!currentSongId) {
						playSound(audioSystem, audioBuffers.current["menu-close"]);
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
