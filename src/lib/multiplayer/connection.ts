/**
 * Connection status handling via Firebase.
 */

import { ref, onValue, type Unsubscribe } from 'firebase/database';
import { getDb } from './firebase';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Subscribe to connection status changes.
 * Uses Firebase's special .info/connected path.
 */
export function subscribeConnectionStatus(
	callback: (status: ConnectionStatus) => void
): Unsubscribe {
	const connectedRef = ref(getDb(), '.info/connected');

	// Initial state is connecting
	callback('connecting');

	return onValue(connectedRef, (snapshot) => {
		if (snapshot.val() === true) {
			callback('connected');
		} else {
			callback('disconnected');
		}
	});
}
