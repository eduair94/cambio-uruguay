import CambioPrex from './classes/cambios/prex';
import { MongooseServer } from './classes/database';
import sentryInit from './sentry';

const main = async () => {
	sentryInit();
	await MongooseServer.startConnectionPromise();
	console.time('sync');
	const cambio = new CambioPrex('prex');
	await cambio.sync_data();
	console.timeEnd('sync');
	process.exit(1);
};

main();
