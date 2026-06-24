import IconClose from "@/images/icons/close.svg?react";
import {
	KeybindId,
	normalizeKey,
	settingFields,
	SettingId,
	SettingValues,
} from "@/settings/setting-fields";
import {assertNever} from "@/util/assert";
import {useFocusTrap} from "@/util/use-focus-trap";
import clsx from "clsx";
import {useCallback, useEffect, useRef, useState} from "react";
import Collapse from "./Collapse";
import Keybind from "./Keybind";
import ModalInfo from "./ModalInfo";
import RangeInput from "./RangeInput";
import {headingClass, settingClass} from "./styles";
import Toggle from "./Toggle";

type ChangeSetting = <K extends SettingId>(id: K, value: SettingValues[K]) => void;

function ModalTrigger({
	onClick,
	isSwitcherOpen,
	isModalOpen,
}: {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	isSwitcherOpen: boolean;
	isModalOpen: boolean;
}) {
	return (
		<button
			// While the mobile switcher is open this button fades out and goes non-interactive, so a
			// tap in its corner only dismisses the switcher (via the window pointerdown) instead of
			// also opening settings. While the modal is open it sits behind the dialog, so it's made
			// inert to keep it out of the tab order and a11y tree alongside the rest of the page.
			inert={isModalOpen}
			className={clsx(
				"fixed top-0 right-0 z-[100] p-[15px_15px_10px_10px] transition-[transform,opacity] duration-300 [filter:drop-shadow(0_0_3px_rgba(0,0,0,0.3))_drop-shadow(0_0_1px_rgba(0,0,0,0.5))] hover:scale-[1.33] hover:rotate-[5deg]",
				isSwitcherOpen && "pointer-events-none opacity-0"
			)}
			title="Settings & More"
			aria-label="Settings & More"
			onClick={onClick}
		>
			<img
				className="h-[34px] w-auto lg:h-[40px]"
				src="images/ocarina-small.webp"
				alt=""
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
	isTouch,
	keybindsOpen,
	setKeybindsOpen,
}: {
	settings: SettingValues;
	changeSetting: ChangeSetting;
	currentKeybindId: KeybindId | null;
	setCurrentKeybindId: React.Dispatch<React.SetStateAction<KeybindId | null>>;
	isTouch: boolean;
	keybindsOpen: boolean;
	setKeybindsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const renderField = (field: (typeof settingFields)[number]) => {
		const hidden = isTouch && field.hideOnMobile;

		switch (field.type) {
			case "toggle":
				return (
					<button
						className={clsx(settingClass, "cursor-pointer", {hidden})}
						key={field.id}
						role="switch"
						aria-checked={settings[field.id]}
						onClick={() => changeSetting(field.id, !settings[field.id])}
					>
						<div className="mr-[1.5em]">{field.name}</div>
						<Toggle isChecked={settings[field.id]} />
					</button>
				);
			case "slider":
				return (
					<div className={clsx(settingClass, {hidden})} key={field.id}>
						<div className="mr-[1.5em]">{field.name}</div>
						<RangeInput
							className="w-full"
							ariaLabel={field.name}
							min={0}
							max={1}
							step={0.01}
							value={settings[field.id]}
							onChange={(e) => changeSetting(field.id, Number(e.target.value))}
						/>
					</div>
				);
			case "keybind": {
				const isAwaiting = currentKeybindId === field.id;
				const keyName = settings[field.id] === " " ? "Space" : settings[field.id];
				return (
					<button
						className={clsx(settingClass, "cursor-pointer", {hidden})}
						key={field.id}
						aria-label={
							isAwaiting ? `${field.name}: press a key` : `${field.name}: ${keyName}`
						}
						onClick={() => setCurrentKeybindId(field.id)}
					>
						<div className="mr-[1.5em]">
							<div className="flex items-center">
								{field.image && (
									<field.image className="mr-[10px] h-auto w-[40px]" />
								)}
								{field.name}
							</div>
						</div>
						<Keybind keyboardKey={settings[field.id]} awaitingInput={isAwaiting} />
					</button>
				);
			}
			default:
				return assertNever(field);
		}
	};

	const keybindFields = settingFields.filter((field) => field.type === "keybind");
	const otherFields = settingFields.filter((field) => field.type !== "keybind");

	return (
		<>
			{otherFields.map(renderField)}
			<Collapse
				title="Keybinds"
				isOpen={keybindsOpen}
				onToggle={() => setKeybindsOpen((prev) => !prev)}
				hidden={isTouch && keybindFields.every((field) => field.hideOnMobile)}
			>
				{keybindFields.map(renderField)}
			</Collapse>
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
	isTouch,
	keybindsOpen,
	setKeybindsOpen,
}: {
	isOpen: boolean;
	onClose: () => void;
	settings: SettingValues;
	changeSetting: ChangeSetting;
	currentKeybindId: KeybindId | null;
	setCurrentKeybindId: React.Dispatch<React.SetStateAction<KeybindId | null>>;
	isTouch: boolean;
	keybindsOpen: boolean;
	setKeybindsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const close = () => {
		setCurrentKeybindId(null);
		onClose();
	};

	// Only a click that both started and ended on the backdrop itself should close. Without the
	// mousedown check, a press starting inside the panel and released on the backdrop (e.g. a
	// slider drag) would fire a click on their common ancestor and wrongly close the modal.
	const backdropMouseDown = useRef(false);

	// Trap focus while open; `inert` while closed keeps the (still-mounted) controls out of the tab
	// order and the a11y tree.
	const dialogRef = useRef<HTMLDivElement>(null);
	useFocusTrap({isOpen, ref: dialogRef});

	return (
		<div
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby="meta-modal-title"
			inert={!isOpen}
			className={clsx(
				"fixed inset-0 z-[101] h-full w-full bg-black/70 backdrop-blur-[2vmax] transition-[opacity,backdrop-filter] duration-300",
				isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
			)}
		>
			<button
				aria-label="Close"
				className="absolute top-0 right-0 z-[1] flex h-[70px] w-[80px] items-center justify-center text-white [filter:drop-shadow(0_0_4px_rgba(0,0,0,0.5))]"
				onClick={close}
			>
				<IconClose className="h-[30px] w-[30px]" />
			</button>
			<div
				className="flex h-full w-full items-center justify-center overflow-auto"
				onMouseDown={(e) => {
					backdropMouseDown.current = e.target === e.currentTarget;
				}}
				onClick={(e) => {
					if (e.target === e.currentTarget && backdropMouseDown.current) close();
				}}
			>
				<div className="my-auto w-full max-w-xl p-[75px_15px]">
					<h2 id="meta-modal-title" className={headingClass}>
						Settings
					</h2>
					<div className="select-none">
						<SettingControl
							settings={settings}
							changeSetting={changeSetting}
							currentKeybindId={currentKeybindId}
							setCurrentKeybindId={setCurrentKeybindId}
							isTouch={isTouch}
							keybindsOpen={keybindsOpen}
							setKeybindsOpen={setKeybindsOpen}
						/>
					</div>
					<ModalInfo isTouch={isTouch} />
				</div>
			</div>
		</div>
	);
}

export default function MetaModal({
	isOpen,
	isSwitcherOpen,
	onOpen,
	onClose,
	settings,
	setSettings,
	isTouch,
}: {
	isOpen: boolean;
	isSwitcherOpen: boolean;
	onOpen: () => void;
	onClose: () => void;
	settings: SettingValues;
	setSettings: React.Dispatch<React.SetStateAction<SettingValues>>;
	isTouch: boolean;
}) {
	const [currentKeybindId, setCurrentKeybindId] = useState<KeybindId | null>(null);
	// Owned here (not inside the always-rendered Modal's collapsed body) so it survives close/reopen.
	const [keybindsOpen, setKeybindsOpen] = useState(false);

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
				changeSetting(currentKeybindId, normalizeKey(event.key));
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
			<ModalTrigger onClick={onOpen} isSwitcherOpen={isSwitcherOpen} isModalOpen={isOpen} />
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				settings={settings}
				changeSetting={changeSetting}
				currentKeybindId={currentKeybindId}
				setCurrentKeybindId={setCurrentKeybindId}
				isTouch={isTouch}
				keybindsOpen={keybindsOpen}
				setKeybindsOpen={setKeybindsOpen}
			/>
		</>
	);
}
