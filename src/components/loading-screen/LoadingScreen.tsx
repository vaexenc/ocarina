import clsx from "clsx";
import Color from "color";
import {useEffect, useMemo, useState} from "react";
import IconGoron from "/src/images/icons/goron.svg?react";
import IconKokiri from "/src/images/icons/kokiri.svg?react";
import IconTriforce from "/src/images/icons/triforce.svg?react";
import IconZora from "/src/images/icons/zora.svg?react";
import {songs} from "/src/song-data";
import {AudioBuffers, AudioSystem, SettingValues} from "/src/types";
import {clamp, fetchAsset, map} from "/src/util/util";
import {defaultSettingValues, keybindIds} from "/src/util/user-settings/default-user-settings";

const soundsToFetch = [
	...Object.entries(songs).map((song) => {
		return {id: song[0], url: "audio/songs/" + song[0] + ".ogg"};
	}),
	{id: "ocarina", url: "audio/ocarina.ogg"},
	// {id: "start", url: "audio/start.ogg"},
	{id: "song-correct", url: "audio/song-correct.ogg"},
	{id: "confirm", url: "audio/confirm.ogg"},
	{id: "menu-open", url: "audio/menu-open.ogg"},
	{id: "menu-close", url: "audio/menu-close.ogg"},
	{id: "ocarina-convolver-impulse", url: "audio/ocarina-convolver-impulse.ogg"},
];

const stoneIcons = {
	kokiri: IconKokiri,
	goron: IconGoron,
	zora: IconZora,
};

function StoneSymbol({
	isHidden,
	color,
	name,
}: {
	isHidden: boolean;
	color: string;
	name: keyof typeof stoneIcons;
}) {
	const Icon = stoneIcons[name];
	return (
		<div
			className={clsx(
				"relative top-0 transition-[opacity,top] duration-[0.8s]",
				isHidden && "top-[20px] opacity-0"
			)}
			style={{"--color": color} as React.CSSProperties}
		>
			<div
				className={clsx(
					"relative perspective-[260px]",
					!isHidden && "animate-stone-vertical"
				)}
			>
				<Icon
					className={clsx(
						"relative top-0 mx-[20px] block text-[60px] pointer-events-none text-(--color) opacity-100 transition-[color] duration-100 [filter:drop-shadow(0_0_6px_var(--color))]",
						name === "goron" ? "[--scaleX:1.133]" : "[--scaleX:1]",
						!isHidden && "animate-stone-spin"
					)}
				/>
			</div>
		</div>
	);
}

export default function LoadingScreen({
	settings,
	isMobile,
	audioSystem,
	audioBuffers,
	onClose,
	showControls,
}: {
	settings: SettingValues;
	isMobile: boolean;
	audioSystem: React.RefObject<AudioSystem>;
	audioBuffers: React.RefObject<AudioBuffers>;
	onClose: () => void;
	showControls: boolean;
}) {
	const [progress, setProgress] = useState(0);
	const [failedCount, setFailedCount] = useState(0);
	const [visible, setVisible] = useState(true);
	const [isFadingOut, setIsFadingOut] = useState(false);

	function updateProgress() {
		setProgress((progress) => {
			return progress + 100 / progressTotalAmount;
		});
	}

	const progressTotalAmount = soundsToFetch.length + 1; // + document load
	let progressModified = progress;

	if (progressModified > 99.99) {
		progressModified = 100;
	}

	useEffect(() => {
		const controller = new AbortController();
		const onLoad = () => updateProgress();

		if (document.readyState === "complete") {
			updateProgress();
		} else {
			window.addEventListener("load", onLoad, {once: true});
		}

		soundsToFetch.forEach((sound) => {
			fetchAsset(sound.url, {signal: controller.signal})
				.then((arrayBuffer) => audioSystem.current.context.decodeAudioData(arrayBuffer))
				.then((audioBuffer) => {
					audioBuffers.current[sound.id] = audioBuffer;
					updateProgress();
				})
				.catch((error: unknown) => {
					if (controller.signal.aborted) return;
					console.error(`Failed to load sound "${sound.id}" (${sound.url})`, error);
					setFailedCount((count) => count + 1);
				});
		});

		return () => {
			controller.abort();
			window.removeEventListener("load", onLoad);
		};
	}, []);

	const stoneSymbolData = useMemo(
		() => [
			{
				isHidden: progressModified <= 0,
				color: Color("#ffffff")
					.mix(Color("#00c14f"), clamp(map(progressModified, 0, 33, 0, 1), 0, 1) * 1)
					.hex(),
				name: "kokiri" as const,
			},
			{
				isHidden: progressModified < 33,
				color: Color("#ffffff")
					.mix(Color("#f22700"), clamp(map(progressModified, 33, 66, 0, 1), 0, 1) * 1)
					.hex(),
				name: "goron" as const,
			},
			{
				isHidden: progressModified < 66,
				color: Color("#ffffff")
					.mix(Color("#007dcc"), clamp(map(progressModified, 66, 100, 0, 1), 0, 1) * 1)
					.hex(),
				name: "zora" as const,
			},
		],
		[progressModified]
	);

	// Only hint at the controls while the keybinds are still at their defaults.
	const keybindsAreDefault = keybindIds.every((id) => settings[id] === defaultSettingValues[id]);
	const areControlsHidden =
		!showControls || isMobile || progressModified < 100 || !keybindsAreDefault;

	const controlButtonClass =
		"flex h-[1.6em] w-[1.6em] items-center justify-center rounded-[5px] border border-white text-center text-[1em] text-white";

	return (
		visible && (
			<>
				<div
					className={clsx(
						"fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-black text-white select-none transition-opacity duration-500",
						progressModified >= 100 && "cursor-pointer",
						isFadingOut && "pointer-events-none opacity-0"
					)}
					onClick={() => {
						if (progressModified >= 100) {
							const source = audioSystem.current.context.createBufferSource();
							source.buffer = audioBuffers.current.confirm;
							source.connect(audioSystem.current.gain);
							source.start();

							setIsFadingOut(true);
							setTimeout(() => {
								setVisible(false);
							}, 600);

							onClose();
						}
					}}
				>
					<div className="relative">
						<div className="relative flex items-center justify-center">
							{stoneSymbolData.map((v) => (
								<StoneSymbol
									key={v.name}
									isHidden={v.isHidden}
									color={v.color}
									name={v.name}
								/>
							))}
						</div>
						<div
							className={clsx(
								"relative mt-[30px] mx-auto h-[2px] w-[250px] z-[10] bg-[gray] pointer-events-none transition-[opacity,transform] duration-500",
								progressModified >= 100
									? "opacity-0 [transform:translateY(7px)]"
									: "opacity-100"
							)}
						>
							<div
								className="h-full w-(--progress) bg-white transition-[width] duration-300 [filter:drop-shadow(0_0_4px_rgba(255,255,255,1))]"
								style={
									{
										"--progress": `${progressModified}%`,
									} as React.CSSProperties
								}
							></div>
						</div>
						<div
							className={clsx(
								"absolute top-[calc(100%+30px)] w-full text-center text-[16px] leading-[1.5] tracking-[0.025em] text-[#f22700] transition-opacity duration-500 [filter:drop-shadow(0_0_0.15em_rgba(242,39,0,0.8))_drop-shadow(0_0_0.3em_rgba(242,39,0,0.5))]",
								failedCount <= 0 ? "pointer-events-none opacity-0" : "opacity-100"
							)}
						>
							{`Failed to load ${failedCount} file${failedCount === 1 ? "" : "s"}.`}
							<br />
							Please refresh the page to try again.
						</div>
						<IconTriforce
							className={clsx(
								"absolute top-1/2 left-1/2 z-[-1] h-auto w-[240px] pointer-events-none transition-[opacity,filter] duration-[2s] delay-[0.25s] [transform:translate(-50%,calc(-50%-30px))]",
								progressModified < 100
									? "opacity-0 [filter:none]"
									: "opacity-100 [filter:drop-shadow(0_0_30px_rgba(255,255,255,1))_drop-shadow(0_0_5px_rgba(255,255,255,0.5))]"
							)}
						/>
						<div
							className={clsx(
								"absolute top-[calc(100%+30px)] w-full text-center text-[24px] tracking-[0.025em] text-white transition-opacity duration-[3s] delay-[1.5s] [filter:drop-shadow(0_0_0.1em_rgba(255,255,255,1))_drop-shadow(0_0_0.15em_rgba(255,255,255,0.8))]",
								progressModified < 100 ? "opacity-0" : "opacity-100"
							)}
						>
							<div
								className={clsx(
									"opacity-0",
									progressModified >= 100 && "animate-continue"
								)}
							>
								{isMobile ? "Tap to continue" : "Click to continue"}
							</div>
						</div>

						<div
							className={clsx(
								"absolute top-[calc(100%+110px)] left-0 right-0 flex w-full justify-center pt-[30px] text-[16px] transition-opacity duration-[3s] delay-[2s] [filter:drop-shadow(0_0_0.1em_rgba(255,255,255,1))_drop-shadow(0_0_0.15em_rgba(255,255,255,0.8))] before:absolute before:top-0 before:left-1/2 before:h-px before:w-[85%] before:bg-white before:content-[''] before:[transform:translateX(-50%)]",
								areControlsHidden ? "opacity-0" : "opacity-80"
							)}
						>
							<div className="flex items-center justify-center">
								<div className={clsx(controlButtonClass, "m-[0.1em]")}>A</div>
							</div>
							<div className="ml-[2em]">
								<div className={clsx(controlButtonClass, "mx-auto mb-[0.2em]")}>
									↑
								</div>
								<div className="flex">
									<div className={clsx(controlButtonClass, "m-[0.1em]")}>←</div>
									<div className={clsx(controlButtonClass, "m-[0.1em]")}>↓</div>
									<div className={clsx(controlButtonClass, "m-[0.1em]")}>→</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</>
		)
	);
}
