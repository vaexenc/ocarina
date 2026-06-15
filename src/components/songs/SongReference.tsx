import clsx from "clsx";
import React, {useEffect, useRef, useState} from "react";
import NoteBox from "./Notebox";
import {songSlots, songs} from "/src/song-data";

// Full literal class strings so Tailwind's static scanner detects them
// (interpolation would hide the class names from the scanner).
const maskUp =
	"[-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)]";
const maskDown =
	"[-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_100%)]";
const maskBoth =
	"[-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)] [mask-image:linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_5%,rgba(0,0,0,1)_95%,rgba(0,0,0,0)_100%)]";

export default function SongReference({currentSongId}: {currentSongId: string | null}) {
	const songReferenceRef = useRef<HTMLDivElement>(null);
	const [scrolledUp, setScrolledUp] = useState(false);
	const [scrolledDown, setScrolledDown] = useState(false);

	useEffect(() => {
		const songReferenceElement = songReferenceRef.current;
		if (!songReferenceElement) return;

		const update = () => {
			const element = songReferenceElement;
			if (element.scrollHeight <= element.clientHeight) {
				setScrolledUp(false);
				setScrolledDown(false);
			} else if (element.scrollTop === 0) {
				setScrolledUp(true);
				setScrolledDown(false);
			} else if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) {
				setScrolledUp(false);
				setScrolledDown(true);
			} else {
				setScrolledUp(true);
				setScrolledDown(true);
			}
		};

		songReferenceElement.addEventListener("scroll", update);
		window.addEventListener("resize", update);
		update();

		return () => {
			songReferenceElement.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, []);

	const maskClass =
		scrolledUp && scrolledDown ? maskBoth : scrolledUp ? maskUp : scrolledDown ? maskDown : "";

	return (
		<div
			ref={songReferenceRef}
			className={clsx(
				"mt-[40px] w-[calc(100%-5px)] max-w-[1200px] self-start overflow-auto p-[0_15px_10px] min-[1000px]:mt-[50px] min-[1000px]:w-[80%] min-[1000px]:self-auto",
				maskClass
			)}
		>
			{Object.entries(songSlots).map(([gameId, songSlotsData], i) => {
				return (
					<React.Fragment key={i}>
						<div
							className={clsx(
								"mb-[10px] pointer-events-none min-[1000px]:mb-[15px]",
								i > 0 && "mt-[50px]"
							)}
						>
							<img
								className={clsx(
									"mx-auto w-auto [--height:60px] min-[1000px]:[--height:80px]",
									gameId === "oot" && "h-(--height)",
									gameId === "mm" && "h-[calc(var(--height)*0.75)]"
								)}
								src={songSlotsData.image}
							/>
						</div>

						<div className="flex flex-wrap justify-center gap-[10px]">
							{songSlotsData.songIds.map((songId) => {
								const song = songs[songId];

								return (
									<NoteBox
										key={songId}
										className="w-full max-w-[410px] min-[650px]:w-[calc(50%-5px)] min-[1400px]:w-[calc(33%-5px)]"
										variant="reference"
										text={<span style={{color: song.color}}>{song.name}</span>}
										notes={song.notes.map((note, i) => ({
											note: typeof note === "object" ? note.note : note,
											id: i,
										}))}
										isHighlighted={songId === currentSongId}
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
