import clsx from "clsx";
import {useCallback, useEffect, useState} from "react";
import Keybind from "./keybind/Keybind";
import RangeInput from "./range-input/RangeInput";
import Toggle from "./toggle/Toggle";
import IconDiscord from "/src/images/icons/discord.svg?react";
import IconGithub from "/src/images/icons/github.svg?react";
import IconX from "/src/images/icons/x.svg?react";
import {KeybindId, SettingId, SettingValues} from "/src/types";
import {assertNever} from "/src/util/util";
import {settingDefs} from "/src/util/user-settings/default-user-settings";

type ChangeSetting = <K extends SettingId>(id: K, value: SettingValues[K]) => void;

const settingClass =
	"group relative flex w-full items-center justify-between rounded-[10px] bg-white/5 p-[15px_20px] mb-[15px] hover:bg-white/15 focus:bg-white/15 focus:[outline:1px_solid_rgba(255,255,255,0.5)]";

const infoLinkClass = "text-[#3280fe] hover:text-[#ffbe0b] focus:text-[#ffbe0b]";

const headingClass =
	"mb-[1em] text-center text-[40px] [&:not(:first-of-type)]:mt-[1.5em] after:mt-[0.25em] after:block after:h-px after:w-full after:bg-white/80 after:content-['']";

function ModalTrigger({onClick}: {onClick: React.MouseEventHandler<HTMLButtonElement>}) {
	return (
		<button
			className="fixed top-0 right-0 z-[100] p-[15px_15px_10px_10px] transition-transform duration-300 [filter:drop-shadow(0_0_3px_rgba(0,0,0,0.3))_drop-shadow(0_0_1px_rgba(0,0,0,0.5))] hover:scale-[1.33] hover:rotate-[5deg]"
			title="Settings & More"
			onClick={onClick}
		>
			<img
				className="h-[34px] w-auto min-[1000px]:h-[40px]"
				src="images/ocarina-small.webp"
				draggable={false}
			/>
		</button>
	);
}

function SettingControl({
	settings,
	changeSetting,
	currentKeybindId,
	setCurrentKeybindId,
	isMobile,
}: {
	settings: SettingValues;
	changeSetting: ChangeSetting;
	currentKeybindId: KeybindId | null;
	setCurrentKeybindId: React.Dispatch<React.SetStateAction<KeybindId | null>>;
	isMobile: boolean;
}) {
	return settingDefs.map((def) => {
		const hidden = isMobile && def.hideOnMobile;

		switch (def.type) {
			case "toggle":
				return (
					<button
						className={clsx(settingClass, "cursor-pointer", {hidden})}
						key={def.id}
						onClick={() => changeSetting(def.id, !settings[def.id])}
					>
						<div className="mr-[1.5em]">{def.name}</div>
						<Toggle isChecked={settings[def.id]} />
					</button>
				);
			case "slider":
				return (
					<div className={clsx(settingClass, {hidden})} key={def.id}>
						<div className="mr-[1.5em]">{def.name}</div>
						<RangeInput
							className="w-full"
							min={0}
							max={1}
							step={0.01}
							value={settings[def.id]}
							onChange={(e) => changeSetting(def.id, Number(e.target.value))}
						/>
					</div>
				);
			case "keybind":
				return (
					<button
						className={clsx(settingClass, "cursor-pointer", {hidden})}
						key={def.id}
						onClick={() => setCurrentKeybindId(def.id)}
					>
						<div className="mr-[1.5em]">
							<div className="flex items-center">
								<def.image className="mr-[10px] h-auto w-[40px]" />
								{def.name}
							</div>
						</div>
						<Keybind
							keyboardKey={settings[def.id]}
							awaitingInput={currentKeybindId === def.id}
						/>
					</button>
				);
			default:
				return assertNever(def);
		}
	});
}

function ModalInfo({isMobile}: {isMobile: boolean}) {
	const socialIconClass = clsx(
		"inline-block mx-[0.2em]",
		isMobile ? "text-[1.8em]" : "text-[1.2em]"
	);

	return (
		<>
			<h2 className={headingClass}>Info</h2>
			<div className="[&_p]:mb-[0.5em] [&_p]:leading-[1.3]">
				<p>
					Based on{" "}
					<a
						className={infoLinkClass}
						href="https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time"
						target="_blank"
					>
						The Legend of Zelda: Ocarina of Time
					</a>{" "}
					and{" "}
					<a
						className={infoLinkClass}
						href="https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask"
						target="_blank"
					>
						Majora's Mask
					</a>
				</p>
				<p>
					Made with{" "}
					<a className={infoLinkClass} href="https://react.dev/" target="_blank">
						React
					</a>{" "}
					+{" "}
					<a
						className={infoLinkClass}
						href="https://www.typescriptlang.org/"
						target="_blank"
					>
						Typescript
					</a>{" "}
					+{" "}
					<a className={infoLinkClass} href="https://vitejs.dev/" target="_blank">
						Vite
					</a>
				</p>
				<p>
					Github repository:{" "}
					<a
						className={infoLinkClass}
						href="https://github.com/vaexenc/ocarina"
						target="_blank"
					>
						https://github.com/vaexenc/ocarina
					</a>
				</p>
				<p>
					Made by vaexenc{" "}
					<a
						className={infoLinkClass}
						href="https://github.com/vaexenc"
						title="Github"
						target="_blank"
					>
						<IconGithub className={socialIconClass} />
					</a>
					<a
						className={infoLinkClass}
						href="https://twitter.com/vaexenc"
						title="X / Twitter"
						target="_blank"
					>
						<IconX className={socialIconClass} />
					</a>
					<a
						className={infoLinkClass}
						href="https://discord.com/users/vaexenc"
						title="Discord"
						target="_blank"
					>
						<IconDiscord className={socialIconClass} />
					</a>
				</p>
			</div>
		</>
	);
}

function Modal({
	isOpen,
	onClose,
	settings,
	changeSetting,
	currentKeybindId,
	setCurrentKeybindId,
	isMobile,
}: {
	isOpen: boolean;
	onClose: () => void;
	settings: SettingValues;
	changeSetting: ChangeSetting;
	currentKeybindId: KeybindId | null;
	setCurrentKeybindId: React.Dispatch<React.SetStateAction<KeybindId | null>>;
	isMobile: boolean;
}) {
	const close = () => {
		setCurrentKeybindId(null);
		onClose();
	};

	return (
		<div
			className={clsx(
				"fixed inset-0 z-[101] h-full w-full bg-black/70 backdrop-blur-[2vmax] transition-[opacity,backdrop-filter] duration-300",
				isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
			)}
		>
			<button
				className="absolute top-0 right-0 z-[1] block h-[70px] w-[80px] [filter:drop-shadow(0_0_4px_rgba(0,0,0,0.5))] before:absolute before:top-1/2 before:left-1/2 before:block before:h-[2px] before:w-[30px] before:bg-white before:content-[''] before:[transform:translate(-50%,-50%)_rotate(45deg)] after:absolute after:top-1/2 after:left-1/2 after:block after:h-[2px] after:w-[30px] after:bg-white after:content-[''] after:[transform:translate(-50%,-50%)_rotate(135deg)]"
				onClick={close}
			></button>
			<div
				className="flex h-full w-full items-center justify-center overflow-auto"
				onClick={close}
			>
				<div
					className="my-auto w-full max-w-[600px] p-[75px_15px]"
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<h2 className={headingClass}>Settings</h2>
					<div className="select-none">
						<SettingControl
							settings={settings}
							changeSetting={changeSetting}
							currentKeybindId={currentKeybindId}
							setCurrentKeybindId={setCurrentKeybindId}
							isMobile={isMobile}
						/>
					</div>
					<ModalInfo isMobile={isMobile} />
				</div>
			</div>
		</div>
	);
}

export default function MetaModal({
	isOpen,
	onOpen,
	onClose,
	settings,
	setSettings,
	isMobile,
}: {
	isOpen: boolean;
	onOpen: () => void;
	onClose: () => void;
	settings: SettingValues;
	setSettings: React.Dispatch<React.SetStateAction<SettingValues>>;
	isMobile: boolean;
}) {
	const [currentKeybindId, setCurrentKeybindId] = useState<KeybindId | null>(null);

	const changeSetting = useCallback<ChangeSetting>(
		(id, value) => {
			setSettings((prev) => ({...prev, [id]: value}));
		},
		[setSettings]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!isOpen) return;

			if (event.key === "Escape") {
				if (currentKeybindId === null) onClose();
				else setCurrentKeybindId(null);
			} else if (currentKeybindId !== null) {
				event.preventDefault();
				changeSetting(currentKeybindId, event.key);
				setCurrentKeybindId(null);
			}
		},
		[onClose, currentKeybindId, isOpen, changeSetting]
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
				settings={settings}
				changeSetting={changeSetting}
				currentKeybindId={currentKeybindId}
				setCurrentKeybindId={setCurrentKeybindId}
				isMobile={isMobile}
			/>
		</>
	);
}
