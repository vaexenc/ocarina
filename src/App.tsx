import {useCallback, useEffect, useRef, useState} from "react";
import Background from "./components/background/Background";
import LoadingScreen from "./components/loading-screen/LoadingScreen";
import MetaModal from "./components/meta-modal/MetaModal";
import SongPlayer from "./components/songs/SongPlayer";
import {AudioBuffers, AudioSystem, Song, UserSettings} from "./types";
import defaultUserSettings from "./util/user-settings/defaultUserSettings";
import {
	createUpdatedUserSettings,
	deleteUserSettings,
	loadLocalUserSettings,
	saveUserSettings,
} from "./util/user-settings/userSettings";
import {checkIfMobileDevice} from "./util/util";

if (new URL(window.location.href).searchParams.has("reset")) {
	deleteUserSettings();
	localStorage.removeItem("ocarina.hasPlayedBefore");

	const urlWithoutParameters = window.location.origin + window.location.pathname;
	window.history.replaceState({}, document.title, urlWithoutParameters);
}

const localUserSettings = loadLocalUserSettings();
const userSettingsInitial =
	(localUserSettings && createUpdatedUserSettings(defaultUserSettings, localUserSettings)) ||
	defaultUserSettings;

const hasPlayedBefore = !!localStorage.getItem("ocarina.hasPlayedBefore");

function App() {
	const [userSettings, setUserSettings] = useState(userSettingsInitial);
	const [isLoadingScreenOpen, setIsLoadingScreenOpen] = useState(true);
	const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
	const [isMobile, setisMobile] = useState(checkIfMobileDevice());
	const [currentSongId, setCurrentSongId] = useState<string | null>(null);
	// todo: make this code cleaner? (useEffect, check for null)
	const isAudioSystemInitialized = useRef(false);
	const audioSystem = useRef<AudioSystem>(
		(() => {
			if (isAudioSystemInitialized.current) return {} as AudioSystem;

			const audioContext = new AudioContext();
			const gainNode = audioContext.createGain();
			gainNode.connect(audioContext.destination);

			isAudioSystemInitialized.current = true;

			return {
				context: audioContext,
				gain: gainNode,
			};
		})()
	);
	const audioBuffers = useRef<AudioBuffers>({});

	audioSystem.current.gain.gain.value = userSettings.find(
		(userSetting) => userSetting.id === "volume"
	)!.value as number;

	const onSongCorrect = useCallback((songId: string, songData: Song) => {
		const source = audioSystem.current.context.createBufferSource();
		source.buffer = audioBuffers.current["song-correct"];
		const gainNode = audioSystem.current.context.createGain();
		gainNode.connect(audioSystem.current.gain);
		gainNode.gain.value = 0.5;
		source.connect(gainNode);
		source.start();
		if (songData.notes.find((note) => note === "a")) {
			localStorage.setItem("ocarina.hasPlayedBefore", "1");
		}
		setCurrentSongId(songId);
	}, []);

	const onSongEnd = useCallback(() => {
		setCurrentSongId(null);
	}, []);

	function onResize() {
		setisMobile(checkIfMobileDevice);
	}

	useEffect(() => {
		window.addEventListener("resize", onResize);

		return () => {
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return (
		<>
			<Background
				isParallaxOn={
					!isMobile &&
					Boolean(
						userSettings.find((userSetting) => userSetting.id === "bgMovement")!.value
					)
				}
				doesParallaxUpdate={true /*!isMetaModalOpen*/}
			/>
			<SongPlayer
				userSettings={userSettings}
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

					if (currentSongId) return;
					const source = audioSystem.current.context.createBufferSource();
					source.buffer = audioBuffers.current["menu-open"];
					source.connect(audioSystem.current.gain);
					source.start();
				}}
				onClose={() => {
					setIsMetaModalOpen(false);

					if (currentSongId) return;
					const source = audioSystem.current.context.createBufferSource();
					source.buffer = audioBuffers.current["menu-close"];
					source.connect(audioSystem.current.gain);
					source.start();
				}}
				userSettings={userSettings}
				setUserSettings={setUserSettings}
				saveUserSettings={(userSettings: UserSettings) => {
					saveUserSettings(userSettings);
				}}
				isMobile={isMobile}
			/>
			<LoadingScreen
				userSettings={userSettings}
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
