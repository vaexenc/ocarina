import clsx from "clsx";
import style from "./Keybind.module.scss";

export default function Keybind({
	keyboardKey,
	awaitingInput,
}: {
	keyboardKey: string;
	awaitingInput: boolean;
}) {
	const label =
		(awaitingInput && "...") ||
		(keyboardKey.length > 10 ? keyboardKey.slice(0, 10 - 1) + "..." : keyboardKey);

	return (
		<div
			className={clsx(style.keybind, "keybind", {
				[style["keybind--awaiting-input"]]: awaitingInput,
			})}
		>
			{label}
		</div>
	);
}
