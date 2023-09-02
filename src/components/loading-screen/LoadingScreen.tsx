import clsx from "clsx";
import Color from "color";
import {useEffect, useMemo, useRef, useState} from "react";
import {songs} from "../../song-data";
import style from "./LoadingScreen.module.less";
import {AudioBuffers, AudioSystem, UserSettings} from "/src/types";
import {clamp, fetchSoundWithRetry, map} from "/src/util/util";

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

function StoneSymbol({
	className,
	style,
	name,
	iconName,
}: {
	className: string;
	style: React.CSSProperties;
	name: string;
	iconName: string;
}) {
	return (
		<div className={className} style={style}>
			<div className="animation-layer-vertical">
				<div className={clsx("stone-symbol", name, iconName)}></div>
			</div>
		</div>
	);
}

export default function LoadingScreen({
	userSettings,
	isMobile,
	audioSystem,
	audioBuffers,
	onClose,
	showControls,
}: {
	userSettings: UserSettings;
	isMobile: boolean;
	audioSystem: React.MutableRefObject<AudioSystem>;
	audioBuffers: React.MutableRefObject<AudioBuffers>;
	onClose: () => void;
	showControls: boolean;
}) {
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(true);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const triforceRef = useRef<HTMLImageElement>(null);
	const hasMainEffectRun = useRef(false); // to try to deal with StrictMode

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
		if (hasMainEffectRun.current) return;
		hasMainEffectRun.current = true;

		if (document.readyState === "complete") {
			updateProgress();
		} else {
			window.addEventListener("load", function () {
				updateProgress();
			});
		}

		soundsToFetch.forEach((sound) => {
			fetchSoundWithRetry(sound.url, (arrayBuffer) => {
				audioSystem.current.context.decodeAudioData(arrayBuffer).then((audioBuffer) => {
					audioBuffers.current[sound.id] = audioBuffer;
					updateProgress();
				});
			});
		});
		// eslint-disable-next-line
	}, []);

	const stoneSymbolData = useMemo(
		() => [
			{
				className: clsx("stone-symbol-container", {hidden: progressModified <= 0}),
				style: {
					"--color": Color("#ffffff")
						.mix(Color("#00c14f"), clamp(map(progressModified, 0, 33, 0, 1), 0, 1) * 1)
						.hex(),
				} as React.CSSProperties,
				name: "kokiri",
				iconName: "icon-kokiri",
			},
			{
				className: clsx("stone-symbol-container", {hidden: progressModified < 33}),
				style: {
					"--color": Color("#ffffff")
						.mix(Color("#f22700"), clamp(map(progressModified, 33, 66, 0, 1), 0, 1) * 1)
						.hex(),
				} as React.CSSProperties,
				name: "goron",
				iconName: "icon-goron",
			},
			{
				className: clsx("stone-symbol-container", {hidden: progressModified < 66}),
				style: {
					"--color": Color("#ffffff")
						.mix(
							Color("#007dcc"),
							clamp(map(progressModified, 66, 100, 0, 1), 0, 1) * 1
						)
						.hex(),
				} as React.CSSProperties,
				name: "zora",
				iconName: "icon-zora",
			},
		],
		[progressModified]
	);

	const areControlsHidden =
		!showControls ||
		isMobile ||
		progressModified < 100 ||
		!(
			userSettings.find((e) => e.id === "keybindA")?.value === "a" &&
			userSettings.find((e) => e.id === "keybindCUp")?.value === "ArrowUp" &&
			userSettings.find((e) => e.id === "keybindCDown")?.value === "ArrowDown" &&
			userSettings.find((e) => e.id === "keybindCLeft")?.value === "ArrowLeft" &&
			userSettings.find((e) => e.id === "keybindCRight")?.value === "ArrowRight"
		);

	return (
		visible && (
			<>
				<div
					className={clsx(style["loading-screen"], {
						[style["loading-screen--loaded"]]: progressModified >= 100,
						[style["loading-screen--fading-out"]]: isFadingOut,
					})}
					onClick={async () => {
						if (progressModified >= 100) {
							const source = audioSystem.current.context.createBufferSource();
							source.buffer = audioBuffers.current["confirm"];
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
					<div className="loading-screen-content">
						<div className={"stone-symbols"}>
							{stoneSymbolData.map((v) => (
								<StoneSymbol
									key={v.name}
									className={v.className}
									style={v.style}
									name={v.name}
									iconName={v.iconName}
								/>
							))}
						</div>
						<div
							className={clsx("progress-bar-container", {
								"hidden": progressModified >= 100,
							})}
						>
							<div
								className="bar"
								style={
									{
										"--progress": `${progressModified}%`,
									} as React.CSSProperties
								}
							></div>
						</div>
						<img
							className={clsx("triforce", {"hidden": progressModified < 100})}
							src="images/icons/triforce.svg"
							ref={triforceRef}
						/>
						<div className={clsx("continue", {"hidden": progressModified < 100})}>
							<div className={clsx("continue-inner")}>
								{isMobile ? "Tap to continue" : "Click to continue"}
							</div>
						</div>

						<div
							className={clsx("controls", {
								"hidden": areControlsHidden,
							})}
						>
							<div className="a-button-container">
								<div className="button">A</div>
							</div>
							<div className="c-buttons-container">
								<div className="button">↑</div>
								<div className="c-buttons-bottom-row">
									<div className="button">←</div>
									<div className="button">↓</div>
									<div className="button">→</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</>
		)
	);
}
