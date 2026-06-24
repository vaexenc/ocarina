import clsx from "clsx";

export default function Keybind({
	keyboardKey,
	awaitingInput,
}: {
	keyboardKey: string;
	awaitingInput: boolean;
}) {
	const displayKey = keyboardKey === " " ? "Space" : keyboardKey;
	const label = awaitingInput
		? "..."
		: displayKey.length > 10
			? displayKey.slice(0, 10 - 1) + "..."
			: displayKey;

	return (
		<div
			className={clsx(
				"flex min-w-[2.15em] items-center justify-center rounded-[0.35em] border-2 border-white bg-transparent px-[0.82em] py-[0.6em] tracking-[0.02em] text-white transition-[background-color,color] duration-300 group-hover:bg-white group-hover:text-black",
				{"animate-glowing": awaitingInput}
			)}
		>
			{label}
		</div>
	);
}
