import MobileControls from "./MobileControls";
import NoteBox from "./Notebox";
import SongReference from "./SongReference";
import {useOcarinaPlayback} from "./use-ocarina-playback";
import {AudioBuffers, AudioSystem, SettingValues, Song} from "/src/types";

export default function SongPlayer({
	isReady,
	settings,
	isMobile,
	isInputEnabled,
	onSongCorrect,
	onSongEnd,
	audioSystem,
	audioBuffers,
}: {
	isReady: boolean;
	settings: SettingValues;
	isMobile: boolean;
	isInputEnabled: boolean;
	onSongCorrect: (songId: string, songData: Song) => void;
	onSongEnd: () => void;
	audioSystem: React.RefObject<AudioSystem>;
	audioBuffers: React.RefObject<AudioBuffers>;
}) {
	const {notes, matchedSong, matchedSongId, inputPress, inputRelease} = useOcarinaPlayback({
		isReady,
		settings,
		isInputEnabled,
		onSongCorrect,
		onSongEnd,
		audioSystem,
		audioBuffers,
	});

	const text = matchedSong ? (
		<span>
			You played {matchedSong.omitThe ? "" : "the"}{" "}
			<span style={{color: matchedSong.color}}>{matchedSong.name}</span>.
		</span>
	) : (
		<span />
	);

	return (
		<div className="fixed inset-0 flex h-full w-full flex-col items-center justify-center select-none">
			<SongReference currentSongId={matchedSongId} />
			<NoteBox variant="player" text={text} notes={notes} />
			{isMobile && <MobileControls inputPress={inputPress} inputRelease={inputRelease} />}
		</div>
	);
}
