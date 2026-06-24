import {Instrument} from "@/data/instrument-data";
import {Song, SongId} from "@/data/song-data";
import {Mode, SpeedrunSet} from "@/modes";
import {SettingValues} from "@/settings/setting-fields";
import {speedrunSections, speedrunSongIds} from "@/speedrun/logic";
import {AudioBuffers, AudioSystem} from "@/util/audio";
import {useCallback, useMemo, useState} from "react";
import MobileControls from "./MobileControls";
import NoteBox from "./NoteBox";
import SongSheets from "./SongSheets";
import {useOcarinaPlayback} from "./use-ocarina-playback";

// The song-completion phrasing, shared by the on-screen result and the screen-reader live region.
// "the " is dropped for names that read as proper nouns (e.g. "Zelda's Lullaby" → `omitThe`).
const songArticle = (song: Song) => (song.omitThe ? "" : "the ");
const playedSongSentence = (song: Song) => `You played ${songArticle(song)}${song.name}.`;

export default function SongPlayer({
	isReady,
	settings,
	instrument,
	isTouch,
	isInputEnabled,
	mode,
	speedrunSet,
	playedSongIds,
	onNotePress,
	runResetSignal,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
	header,
}: {
	isReady: boolean;
	settings: SettingValues;
	instrument: Instrument;
	isTouch: boolean;
	isInputEnabled: boolean;
	mode: Mode;
	speedrunSet: SpeedrunSet;
	playedSongIds: Set<SongId>;
	onNotePress: () => void;
	// Bumped when a speedrun run is abandoned, so the playback engine drops any buffered notes.
	runResetSignal: number;
	onSongCorrect: (songId: SongId, songData: Song) => void;
	onSongEnd: () => void;
	audioSystem: AudioSystem;
	audioBuffers: React.RefObject<AudioBuffers>;
	// Rendered at the top of the content column (the Speedrun timer), so it flows in the
	// layout above the song list rather than being absolutely positioned.
	header?: React.ReactNode;
}) {
	// In speedrun, only the current set's not-yet-completed songs may match — playing a song from
	// another set (or replaying a completed one) must do nothing. Song mode matches any song.
	const matchableSongIds = useMemo(
		() =>
			mode === "speedrun"
				? new Set(speedrunSongIds(speedrunSet).filter((id) => !playedSongIds.has(id)))
				: undefined,
		[mode, speedrunSet, playedSongIds]
	);

	// Speedrun matches are instant — no `matchedSong` is ever set to mirror into the live region —
	// so capture the completed song here to announce it; Song mode announces from `matchedSong` below.
	const [speedrunAnnouncement, setSpeedrunAnnouncement] = useState("");
	const handleSongCorrect = useCallback(
		(songId: SongId, songData: Song) => {
			if (mode === "speedrun") setSpeedrunAnnouncement(playedSongSentence(songData));
			onSongCorrect(songId, songData);
		},
		[mode, onSongCorrect]
	);

	const {notes, matchedSong, matchedSongId, inputPress, inputRelease} = useOcarinaPlayback({
		isReady,
		settings,
		instrument,
		isInputEnabled,
		matchingEnabled: mode !== "free",
		instantMatch: mode === "speedrun",
		matchableSongIds,
		onNotePress,
		resetSignal: runResetSignal,
		onSongCorrect: handleSongCorrect,
		onSongEnd,
		audioSystem,
		audioBuffers,
	});

	const text = matchedSong ? (
		<span>
			You played {songArticle(matchedSong)}
			<span style={{color: matchedSong.color}}>{matchedSong.name}</span>.
		</span>
	) : (
		<span />
	);

	return (
		<div className="fixed top-0 left-0 flex h-[100dvh] w-full flex-col items-center select-none">
			{header}
			{/* The content area always fills the available height so the NoteBox is pushed to the
			    bottom. In Free mode there's no song list, so an empty spacer fills the space. */}
			{mode === "free" ? (
				<div className="grow" />
			) : (
				<SongSheets
					currentSongId={matchedSongId}
					sections={mode === "speedrun" ? speedrunSections(speedrunSet) : undefined}
					songIds={mode === "speedrun" ? speedrunSongIds(speedrunSet) : undefined}
					playedSongIds={mode === "speedrun" ? playedSongIds : undefined}
					isSpeedrun={mode === "speedrun"}
					isTouch={isTouch}
				/>
			)}
			{/* The matched-song text lives inside the NoteBox visually; mirror it into a polite live
			    region so screen-reader users hear the completion they can't read off the staff. In
			    Speedrun there's no `matchedSong`, so the wrapped `onSongCorrect` feeds it instead. */}
			<div role="status" aria-live="polite" className="sr-only">
				{mode === "speedrun"
					? speedrunAnnouncement
					: matchedSong
						? playedSongSentence(matchedSong)
						: ""}
			</div>
			<NoteBox
				variant="player"
				text={text}
				notes={notes}
				isTouch={isTouch}
				className="mt-4 mb-8 lg:mt-10 xl:mb-12"
			/>
			{isTouch && <MobileControls inputPress={inputPress} inputRelease={inputRelease} />}
		</div>
	);
}
