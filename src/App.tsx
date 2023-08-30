import {useEffect, useRef, useState} from "react";
import Background from "./components/background/Background";
import LoadingScreen from "./components/loading-screen/LoadingScreen";
import MetaModal from "./components/meta-modal/MetaModal";
import SongPlayer from "./components/songs/SongPlayer";
import {AudioBuffers, AudioSystem, UserSettings} from "./types";
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
	const urlWithoutParameters = window.location.origin + window.location.pathname;
	window.history.replaceState({}, document.title, urlWithoutParameters);
}

const localUserSettings = loadLocalUserSettings();
const userSettingsInitial =
	(localUserSettings && createUpdatedUserSettings(defaultUserSettings, localUserSettings)) ||
	defaultUserSettings;

function App() {
	const [userSettings, setUserSettings] = useState(userSettingsInitial);
	const [isLoadingScreenOpen, setIsLoadingScreenOpen] = useState(true);
	const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
	const [isMobile, setisMobile] = useState(checkIfMobileDevice());

	/*
		todo: make this code cleaner? (useEffect, check for null)
		i assumed a single useRef would suffice but without the if check
		this code would leak memory
	*/
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
			/>
			<MetaModal
				isOpen={isMetaModalOpen}
				onOpen={() => setIsMetaModalOpen(true)}
				onClose={() => setIsMetaModalOpen(false)}
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
			/>
		</>
	);
}

export default App;
