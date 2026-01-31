import type { PlayerSeat } from '$lib/multiplayer/types';

/**
 * Get the relative positions of other players from a given seat's perspective.
 *
 * In Klaverjas, partners sit across from each other (0+2, 1+3).
 * From the player's perspective:
 * - Their own cards are at the bottom
 * - Partner is at the top
 * - Left and right opponents are on the sides
 */
export interface RelativePositions {
	self: PlayerSeat;
	partner: PlayerSeat;
	left: PlayerSeat;
	right: PlayerSeat;
}

export function getRelativePositions(mySeat: PlayerSeat): RelativePositions {
	// Partner is directly across (2 seats away)
	const partner = ((mySeat + 2) % 4) as PlayerSeat;
	// Left is 1 seat clockwise
	const left = ((mySeat + 1) % 4) as PlayerSeat;
	// Right is 1 seat counter-clockwise (3 clockwise)
	const right = ((mySeat + 3) % 4) as PlayerSeat;

	return {
		self: mySeat,
		partner,
		left,
		right
	};
}

/**
 * Get the screen position for a seat relative to the player.
 * Returns 'bottom', 'top', 'left', or 'right'.
 */
export type ScreenPosition = 'bottom' | 'top' | 'left' | 'right';

export function getScreenPosition(seat: PlayerSeat, mySeat: PlayerSeat): ScreenPosition {
	const positions = getRelativePositions(mySeat);

	if (seat === positions.self) return 'bottom';
	if (seat === positions.partner) return 'top';
	if (seat === positions.left) return 'left';
	return 'right';
}
