import clsx from "clsx";
import {useCallback, useEffect, useRef, useState} from "react";
import style from "./MetaModal.module.less";
import Keybind from "./keybind/Keybind";
import RangeInput from "./range-input/RangeInput";
import Toggle from "./toggle/Toggle";
import {UserSetting, UserSettings} from "/src/types";

function ModalTrigger({onClick}: {onClick: React.MouseEventHandler<HTMLButtonElement>}) {
	return (
		<button className={style["meta-modal-trigger"]} title="Settings & More" onClick={onClick}>
			<img className="image" src="images/ocarina-small.webp" draggable={false} />
		</button>
	);
}

function Modal({
	isOpen,
	onClose,
	userSettings,
	saveUserSettings,
	changeUserSetting,
	currentKeybindId,
	setCurrentKeybindId,
	isMobile,
}: {
	isOpen: boolean;
	onClose: () => void;
	userSettings: UserSettings;
	saveUserSettings: (userSettings: UserSettings) => void;
	changeUserSetting: (
		userSetting: UserSetting,
		value: number | boolean | string
	) => UserSetting[];
	currentKeybindId: string | null;
	setCurrentKeybindId: React.Dispatch<React.SetStateAction<string | null>>;
	isMobile: boolean;
}) {
	const userSettingsRef = useRef(userSettings);
	userSettingsRef.current = userSettings;

	return (
		<div
			className={clsx(
				style["meta-modal"],
				{[style["meta-modal--show"]]: isOpen},
				{[style["meta-modal--mobile"]]: isMobile}
			)}
		>
			<button
				className="close-button"
				onClick={() => {
					setCurrentKeybindId(() => null);
					onClose();
				}}
			></button>
			<div
				className="modal-inner"
				onClick={() => {
					setCurrentKeybindId(() => null);
					onClose();
				}}
			>
				<div
					className="content"
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<h2 className="headline">Settings</h2>
					<div className="settings">
						{userSettings.map((userSetting) => {
							if (userSetting.type === "toggle") {
								return (
									<button
										className={clsx("setting toggle", {
											"hide-on-mobile": userSetting.hideOnMobile,
										})}
										key={userSetting.id}
										onClick={() => {
											const newUserSettings = changeUserSetting(
												userSetting,
												!userSetting.value
											);
											saveUserSettings(newUserSettings);
										}}
									>
										<div className="setting-label">{userSetting.name}</div>
										<Toggle isChecked={userSetting.value} />
									</button>
								);
							}

							if (userSetting.type === "slider") {
								return (
									<div
										className={clsx("setting slider", {
											"hide-on-mobile": userSetting.hideOnMobile,
										})}
										key={userSetting.id}
									>
										<div className="setting-label">{userSetting.name}</div>
										<RangeInput
											className={"range-input"}
											min={0}
											max={1}
											step={0.01}
											value={userSetting.value}
											onChange={(e) => {
												changeUserSetting(userSetting, e.target.value);
											}}
											onChangeDebounce={() => {
												saveUserSettings(userSettingsRef.current);
											}}
										/>
									</div>
								);
							}

							if (userSetting.type === "keybind") {
								return (
									<button
										className={clsx("setting keybind", {
											"hide-on-mobile": userSetting.hideOnMobile,
										})}
										key={userSetting.id}
										onClick={() => {
											setCurrentKeybindId(userSetting.id);
										}}
									>
										<div className="setting-label">
											<div className="input-label">
												<img
													className="input-image"
													src={userSetting.image}
												/>
												{userSetting.name}
											</div>
										</div>
										<Keybind
											keyboardKey={userSetting.value}
											awaitingInput={currentKeybindId === userSetting.id}
										/>
									</button>
								);
							}
						})}
					</div>
					<h2 className="headline">Info</h2>
					<div className="info">
						<p>
							Based on{" "}
							<a
								href="https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time"
								target="_blank"
							>
								The Legend of Zelda: Ocarina of Time
							</a>{" "}
							and{" "}
							<a
								href="https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask"
								target="_blank"
							>
								Majora's Mask
							</a>
						</p>
						<p>
							Made with{" "}
							<a href="https://react.dev/" target="_blank">
								React
							</a>{" "}
							+{" "}
							<a href="https://www.typescriptlang.org/" target="_blank">
								Typescript
							</a>{" "}
							+{" "}
							<a href="https://vitejs.dev/" target="_blank">
								Vite
							</a>
						</p>
						<p>
							Github repository:{" "}
							<a href="https://github.com/vaexenc/ocarina" target="_blank">
								https://github.com/vaexenc/ocarina
							</a>
						</p>
						<p>
							Made by vaexenc{" "}
							<a href="https://github.com/vaexenc" title="Github" target="_blank">
								<span className="social-icon icon-github"></span>
							</a>
							<a
								href="https://twitter.com/vaexenc"
								title="X / Twitter"
								target="_blank"
							>
								<span className="social-icon icon-x"></span>
							</a>
							<a
								href="https://discord.com/users/vaexenc"
								title="Discord"
								target="_blank"
							>
								<span className="social-icon icon-discord"></span>
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function MetaModal({
	isOpen,
	onOpen,
	onClose,
	userSettings,
	setUserSettings,
	saveUserSettings,
	isMobile,
}: {
	isOpen: boolean;
	onOpen: () => void;
	onClose: () => void;
	userSettings: UserSettings;
	setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
	saveUserSettings: (userSettings: UserSettings) => void;
	isMobile: boolean;
}) {
	const [currentKeybindId, setCurrentKeybindId] = useState<string | null>(null);

	const changeUserSetting = useCallback(
		(userSetting: UserSetting, value: number | boolean | string) => {
			const newUserSettings = userSettings.map((prevUserSetting) => {
				if (prevUserSetting.id !== userSetting.id) return prevUserSetting;

				if (prevUserSetting.type === "slider")
					return {...prevUserSetting, value: Number(value)};

				if (prevUserSetting.type === "toggle")
					return {...prevUserSetting, value: Boolean(value)};

				if (prevUserSetting.type === "keybind")
					return {...prevUserSetting, value: String(value)};

				return prevUserSetting;
			});

			setUserSettings(newUserSettings);

			return newUserSettings;
		},
		[setUserSettings, userSettings]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!isOpen) return;

			if (event.key === "Escape") {
				if (currentKeybindId === null) {
					onClose();
				} else {
					setCurrentKeybindId(() => null);
				}
			} else {
				if (currentKeybindId !== null) {
					event.preventDefault();
					const newUserSettings = changeUserSetting(
						userSettings.find((userSetting) => userSetting.id === currentKeybindId)!,
						event.key
					);
					saveUserSettings(newUserSettings);
					setCurrentKeybindId(() => null);
				}
			}
		},
		[onClose, currentKeybindId, isOpen, changeUserSetting, saveUserSettings, userSettings]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	return (
		<>
			<ModalTrigger onClick={onOpen} />
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				userSettings={userSettings}
				saveUserSettings={saveUserSettings}
				changeUserSetting={changeUserSetting}
				currentKeybindId={currentKeybindId}
				setCurrentKeybindId={setCurrentKeybindId}
				isMobile={isMobile}
			/>
		</>
	);
}
