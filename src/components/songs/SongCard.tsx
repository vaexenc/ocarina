import {SongId, songs} from "@/data/song-data";
import NoteBox from "./NoteBox";

// A single song shown in the song sheets, as a NoteBox with the song's coloured name.
export default function SongCard({
	songId,
	variant,
	className,
	isHighlighted,
	isPlayed,
	isTouch,
}: {
	songId: SongId;
	variant: "sheet" | "speedrun";
	className?: string;
	isHighlighted: boolean;
	isPlayed: boolean;
	isTouch?: boolean;
}) {
	const song = songs[songId];
	return (
		<NoteBox
			className={className}
			variant={variant}
			text={<span style={{color: song.color}}>{song.name}</span>}
			notes={song.notes.map((note, i) => ({note, id: i}))}
			isHighlighted={isHighlighted}
			isPlayed={isPlayed}
			isTouch={isTouch}
		/>
	);
}
