import * as program from 'commander';
import * as pkg from '../package.json';

program
	.version(pkg.version)
	.option('--disable-clustering', 'Disable clustering')
	.option('--only-server', 'Run server only (without job queue processing)')
	.option('--only-queue', 'Pocessing job queue only (without server)')
	.option('--quiet', 'Suppress all logs')
	.option('--verbose', 'Enable all logs')
	.option('--with-log-time', 'Include timestamp for each logs')
	.option('--color', 'This option is a dummy for some external program\'s (e.g. forever) issue.')
	.parse(process.argv);

if (process.env.MK_DISABLE_CLUSTERING) program.disableClustering = true;
if (process.env.MK_ONLY_QUEUE) program.onlyQueue = true;
if (process.env.NODE_ENV === 'test') program.disableClustering = true;
if (process.env.NODE_ENV === 'test') program.quiet = true;

export { program };
