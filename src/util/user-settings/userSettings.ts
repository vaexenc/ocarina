import {SerializedUserSettings, UserSettings} from "/src/types";

export function saveUserSettings(userSettings: UserSettings) {
	const serializedUserSettings: SerializedUserSettings = {};

	userSettings.forEach((userSetting) => {
		serializedUserSettings[userSetting.id] = userSetting.value;
	});

	localStorage.setItem("ocarina.userSettings", JSON.stringify(serializedUserSettings));
}

export function loadLocalUserSettings() {
	const localUserSettings = localStorage.getItem("ocarina.userSettings");
	if (!localUserSettings) return null;
	return JSON.parse(localUserSettings) as SerializedUserSettings;
}

export function createUpdatedUserSettings(
	userSettings: UserSettings,
	serializedUserSettings: SerializedUserSettings
) {
	const newUserSettings = [...userSettings];

	Object.entries(serializedUserSettings).forEach((serializedUserSetting) => {
		const userSettingToUpdate = newUserSettings.find(
			(userSetting) => userSetting.id === serializedUserSetting[0]
		);
		if (!userSettingToUpdate) throw Error("user setting not found");
		userSettingToUpdate.value = serializedUserSetting[1];
	});

	return newUserSettings as UserSettings;
}

export function deleteUserSettings() {
	localStorage.removeItem("ocarina.userSettings");
}
