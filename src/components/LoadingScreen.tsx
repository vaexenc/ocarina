import {instrumentList} from "@/data/instrument-data";
import {songs} from "@/data/song-data";
import IconGoron from "@/images/icons/goron.svg?react";
import IconKokiri from "@/images/icons/kokiri.svg?react";
import IconTriforce from "@/images/icons/triforce.svg?react";
import IconZora from "@/images/icons/zora.svg?react";
import {defaultSettingValues, keybindIds, SettingValues} from "@/settings/setting-fields";
import {AudioBuffers, AudioSystem, playSound} from "@/util/audio";
import {fetchAsset} from "@/util/fetch";
import {clamp, map} from "@/util/math";
import clsx from "clsx";
import Color from "color";
import {useCallback, useEffect, useMemo, useState} from "react";

const soundsToFetch = [
	...Object.keys(songs).map((id) => ({id, url: `audio/songs/${id}.ogg`})),
	// Each instrument's `bufferId` is also its audio file's basename, so the load list stays in sync
	// with the instrument roster automatically.
	...instrumentList.map((instrument) => ({
		id: instrument.bufferId,
		url: `audio/${instrument.bufferId}.ogg`,
	})),
	{id: "song-correct", url: "audio/song-correct.ogg"},
	{id: "confirm", url: "audio/confirm.ogg"},
	{id: "menu-open", url: "audio/menu-open.ogg"},
	{id: "menu-close", url: "audio/menu-close.ogg"},
	{id: "convolver-impulse", url: "audio/convolver-impulse.ogg"},
];

// Each fetched sound plus the document `load` event each contribute one step of progress.
const progressTotalAmount = soundsToFetch.length + 1;

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

/**
 * Presentational loading screen. Every visual state is derived purely from props, so it can be
 * posed at any `progress` (0–100) or `failedCount` without running the real load pipeline. The
 * stateful loading is owned by the {@link LoadingScreen} container below.
 */
export function LoadingScreenView({
	progress,
	failedCount,
	isTouch,
	showControls,
	keybindsAreDefault,
	isFadingOut,
	onContinue,
}: {
	progress: number;
	failedCount: number;
	isTouch: boolean;
	showControls: boolean;
	keybindsAreDefault: boolean;
	isFadingOut: boolean;
	onContinue: () => void;
}) {
	const stoneSymbolData = useMemo(
		() => [
			{
				isHidden: progress <= 0,
				color: Color("#ffffff")
					.mix(Color("#00c14f"), clamp(map(progress, 0, 33, 0, 1), 0, 1))
					.hex(),
				name: "kokiri" as const,
			},
			{
				isHidden: progress < 33,
				color: Color("#ffffff")
					.mix(Color("#f22700"), clamp(map(progress, 33, 66, 0, 1), 0, 1))
					.hex(),
				name: "goron" as const,
			},
			{
				isHidden: progress < 66,
				color: Color("#ffffff")
					.mix(Color("#007dcc"), clamp(map(progress, 66, 100, 0, 1), 0, 1))
					.hex(),
				name: "zora" as const,
			},
		],
		[progress]
	);

	// Space, Enter and Escape dismiss the screen too, mirroring the click/tap affordance.
	useEffect(() => {
		if (progress < 100 || isFadingOut) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
				event.preventDefault();
				onContinue();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [progress, isFadingOut, onContinue]);

	// Only hint at the controls while the keybinds are still at their defaults.
	const areControlsHidden = !showControls || isTouch || progress < 100 || !keybindsAreDefault;

	const controlButtonClass =
		"flex h-[1.6em] w-[1.6em] items-center justify-center rounded-[5px] border border-white text-center text-[1em] text-white";

	return (
		<div
			className={clsx(
				"fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-black text-white select-none transition-opacity duration-500",
				progress >= 100 && "cursor-pointer",
				isFadingOut && "pointer-events-none opacity-0"
			)}
			onClick={() => {
				if (progress >= 100) {
					onContinue();
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
						progress >= 100 ? "opacity-0 [transform:translateY(7px)]" : "opacity-100"
					)}
				>
					<div
						className="h-full w-(--progress) bg-white transition-[width] duration-300 [filter:drop-shadow(0_0_4px_rgba(255,255,255,1))]"
						style={
							{
								"--progress": `${progress}%`,
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
						"absolute top-1/2 left-1/2 z-[-1] h-auto w-[212px] pointer-events-none transition-[opacity,filter] duration-[2s] delay-[0.25s] [transform:translate(-50%,calc(-50%-30px))]",
						progress < 100
							? "opacity-0 [filter:none]"
							: "opacity-100 [filter:drop-shadow(0_0_30px_rgba(255,255,255,1))_drop-shadow(0_0_5px_rgba(255,255,255,0.5))]"
					)}
				/>
				<div
					className={clsx(
						"absolute top-[calc(100%+30px)] w-full text-center text-[24px] tracking-[0.025em] text-white transition-opacity duration-[3s] delay-[1.5s] [filter:drop-shadow(0_0_0.1em_rgba(255,255,255,1))_drop-shadow(0_0_0.15em_rgba(255,255,255,0.8))]",
						progress < 100 ? "opacity-0" : "opacity-100"
					)}
				>
					<div className={clsx("opacity-0", progress >= 100 && "animate-continue")}>
						{isTouch ? "Tap to continue" : "Click to continue"}
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
						<div className={clsx(controlButtonClass, "mx-auto mb-[0.2em]")}>↑</div>
						<div className="flex">
							<div className={clsx(controlButtonClass, "m-[0.1em]")}>←</div>
							<div className={clsx(controlButtonClass, "m-[0.1em]")}>↓</div>
							<div className={clsx(controlButtonClass, "m-[0.1em]")}>→</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function LoadingScreen({
	settings,
	isTouch,
	audioSystem,
	audioBuffers,
	onClose,
	showControls,
}: {
	settings: SettingValues;
	isTouch: boolean;
	audioSystem: AudioSystem;
	audioBuffers: React.RefObject<AudioBuffers>;
	onClose: () => void;
	showControls: boolean;
}) {
	const [loadedCount, setLoadedCount] = useState(0);
	const [failedCount, setFailedCount] = useState(0);
	const [visible, setVisible] = useState(true);
	const [isFadingOut, setIsFadingOut] = useState(false);

	const updateProgress = useCallback(() => {
		setLoadedCount((count) => count + 1);
	}, []);

	// Counting completed steps and deriving the percentage avoids float drift, so this hits
	// exactly 100 when everything has loaded.
	const progress = (loadedCount / progressTotalAmount) * 100;

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
				.then((arrayBuffer) => audioSystem.context.decodeAudioData(arrayBuffer))
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
	}, [audioSystem, audioBuffers, updateProgress]);

	// Only hint at the controls while the keybinds are still at their defaults.
	const keybindsAreDefault = keybindIds.every((id) => settings[id] === defaultSettingValues[id]);

	const onContinue = () => {
		// The context is created suspended before any interaction. Resume it from within this
		// gesture so engines that don't auto-resume on a gesture (e.g. iOS Safari) still get audio.
		void audioSystem.context.resume();

		playSound(audioSystem, audioBuffers.current.confirm);

		setIsFadingOut(true);
		setTimeout(() => {
			setVisible(false);
		}, 600);

		onClose();
	};

	return (
		visible && (
			<LoadingScreenView
				progress={progress}
				failedCount={failedCount}
				isTouch={isTouch}
				showControls={showControls}
				keybindsAreDefault={keybindsAreDefault}
				isFadingOut={isFadingOut}
				onContinue={onContinue}
			/>
		)
	);
}
