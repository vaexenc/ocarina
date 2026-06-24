import IconDiscord from "@/images/icons/discord.svg?react";
import IconGithub from "@/images/icons/github.svg?react";
import IconX from "@/images/icons/x.svg?react";
import clsx from "clsx";
import {headingClass} from "./styles";

const infoLinkClass = "text-[#3280fe] hover:text-[#ffbe0b] focus:text-[#ffbe0b]";

export default function ModalInfo({isTouch}: {isTouch: boolean}) {
	const socialIconClass = clsx(
		"inline-block mx-[0.2em]",
		isTouch ? "text-[1.8em]" : "text-[1.2em]"
	);

	return (
		<>
			<h2 className={headingClass}>Info</h2>
			<div className="[&_p]:mb-[0.5em] [&_p]:leading-[1.3]">
				<p>
					Based on{" "}
					<a
						className={infoLinkClass}
						href="https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time"
						target="_blank"
						rel="noopener noreferrer"
					>
						The Legend of Zelda: Ocarina of Time
					</a>{" "}
					and{" "}
					<a
						className={infoLinkClass}
						href="https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask"
						target="_blank"
						rel="noopener noreferrer"
					>
						Majora's Mask
					</a>
				</p>
				<p>
					Made with{" "}
					<a
						className={infoLinkClass}
						href="https://react.dev/"
						target="_blank"
						rel="noopener noreferrer"
					>
						React
					</a>{" "}
					+{" "}
					<a
						className={infoLinkClass}
						href="https://www.typescriptlang.org/"
						target="_blank"
						rel="noopener noreferrer"
					>
						Typescript
					</a>{" "}
					+{" "}
					<a
						className={infoLinkClass}
						href="https://vitejs.dev/"
						target="_blank"
						rel="noopener noreferrer"
					>
						Vite
					</a>
				</p>
				<p>
					Github repository:{" "}
					<a
						className={infoLinkClass}
						href="https://github.com/vaexenc/ocarina"
						target="_blank"
						rel="noopener noreferrer"
					>
						https://github.com/vaexenc/ocarina
					</a>
				</p>
				<p>
					Made by vaexenc{" "}
					<a
						className={infoLinkClass}
						href="https://github.com/vaexenc"
						title="Github"
						target="_blank"
						rel="noopener noreferrer"
					>
						<IconGithub className={socialIconClass} />
					</a>
					<a
						className={infoLinkClass}
						href="https://x.com/vaexenc"
						title="X / Twitter"
						target="_blank"
						rel="noopener noreferrer"
					>
						<IconX className={socialIconClass} />
					</a>
					<a
						className={infoLinkClass}
						href="https://discord.com/users/vaexenc"
						title="Discord"
						target="_blank"
						rel="noopener noreferrer"
					>
						<IconDiscord className={socialIconClass} />
					</a>
				</p>
			</div>
		</>
	);
}
