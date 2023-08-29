import clsx from "clsx";
import React, {useEffect, useRef} from "react";
import NoteBox from "./Notebox";
import style from "./SongReference.module.less";
import {songs, songSlots} from "/src/song-data";

function updateSongReferenceElementStyle(element: HTMLElement) {
	if (element.scrollHeight <= element.clientHeight) {
		element.classList.remove(style["scrolled-up"]);
		element.classList.remove(style["scrolled-down"]);
		return;
	}

	if (element.scrollTop === 0) {
		element.classList.add(style["scrolled-up"]);
		element.classList.remove(style["scrolled-down"]);
	} else if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) {
		element.classList.add(style["scrolled-down"]);
		element.classList.remove(style["scrolled-up"]);
	} else {
		element.classList.add(style["scrolled-up"]);
		element.classList.add(style["scrolled-down"]);
	}
}

export default function SongReference() {
	const songReferenceRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function onScroll() {
			updateSongReferenceElementStyle(songReferenceRef.current!);
		}

		function onWindowResize() {
			updateSongReferenceElementStyle(songReferenceRef.current!);
		}

		const songReferenceElement = songReferenceRef.current!;
		songReferenceElement.addEventListener("scroll", onScroll);
		window.addEventListener("resize", onWindowResize);
		updateSongReferenceElementStyle(songReferenceRef.current!);

		return () => {
			songReferenceElement.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onWindowResize);
		};
	}, []);

	return (
		<div className={clsx(style["song-reference"])} ref={songReferenceRef}>
			{Object.entries(songSlots).map(([gameId, songSlotsData], i) => {
				return (
					<React.Fragment key={i}>
						<div className="game-image-container">
							<img className={clsx("game-image", gameId)} src={songSlotsData.image} />
						</div>

						<div className="songs">
							{songSlotsData.songIds.map((songId) => {
								const song = songs[songId];

								return (
									<NoteBox
										key={songId}
										text={<span style={{color: song.color}}>{song.name}</span>}
										notes={[...song.notes]}
									/>
								);
							})}
						</div>
					</React.Fragment>
				);
			})}
		</div>
	);
}
