import LoadingScreen from "./components/loading-screen/LoadingScreen";
import Background from "./components/background/Background";
import MetaModal from "./components/meta-modal/MetaModal";
import {useState, useEffect} from "react";
import defaultUserSettings from "./util/user-settings/defaultUserSettings";
import {UserSettings} from "./types";
import {
	saveUserSettings,
	loadLocalUserSettings,
	createUpdatedUserSettings,
	deleteUserSettings,
} from "./util/user-settings/userSettings";
import {checkIfMobileDevice} from "./util/util";

if (new URL(window.location.href).searchParams.has("reset")) {
	deleteUserSettings();
}

const localUserSettings = loadLocalUserSettings();
const userSettingsInitial =
	(localUserSettings && createUpdatedUserSettings(defaultUserSettings, localUserSettings)) ||
	defaultUserSettings;

function App() {
	const [userSettings, setUserSettings] = useState(userSettingsInitial);
	const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
	const [isMobile, setisMobile] = useState(checkIfMobileDevice());

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
				isParallaxOn={Boolean(
					userSettings.find((userSetting) => userSetting.id === "bgMovement")!.value
				)}
				doesParallaxUpdate={true /*!isMetaModalOpen*/}
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
			/>
			<LoadingScreen isMobile={isMobile} />
		</>
	);
}

export default App;
