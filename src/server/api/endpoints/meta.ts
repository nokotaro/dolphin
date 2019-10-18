import $ from 'cafy';
import * as os from 'os';
import config from '../../../config';
import define from '../define';
import { fetchMeta } from '../../../misc/fetch-meta';
import * as pkg from '../../../../package.json';
import { Emojis, Users } from '../../../models';
import { getConnection } from 'typeorm';
import redis from '../../../db/redis';
import { DB_MAX_NOTE_TEXT_LENGTH } from '../../../misc/hard-limits';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': 'インスタンス情報を取得します。',
		'en-US': 'Get the information of this instance.'
	},

	tags: ['meta'],

	requireCredential: false,

	params: {
		detail: {
			validator: $.optional.bool,
			default: true
		}
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		properties: {
			version: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				description: 'The version of Dolphin of this instance.',
				example: pkg.version
			},
			name: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				description: 'The name of this instance.',
			},
			description: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				description: 'The description of this instance.',
			},
			announcements: {
				type: 'array' as const,
				optional: false as const, nullable: false as const,
				items: {
					type: 'object' as const,
					optional: false as const, nullable: false as const,
					properties: {
						title: {
							type: 'string' as const,
							optional: false as const, nullable: false as const,
							description: 'The title of the announcement.',
						},
						text: {
							type: 'string' as const,
							optional: false as const, nullable: false as const,
							description: 'The text of the announcement. (can be HTML)',
						},
					}
				},
				description: 'The announcements of this instance.',
			},
			disableRegistration: {
				type: 'boolean' as const,
				optional: false as const, nullable: false as const,
				description: 'Whether disabled open registration.',
			},
			disableLocalTimeline: {
				type: 'boolean' as const,
				optional: false as const, nullable: false as const,
				description: 'Whether disabled LTL and STL.',
			},
			disableGlobalTimeline: {
				type: 'boolean' as const,
				optional: false as const, nullable: false as const,
				description: 'Whether disabled GTL.',
			},
			enableEmojiReaction: {
				type: 'boolean' as const,
				optional: false as const, nullable: false as const,
				description: 'Whether enabled emoji reaction.',
			},
		}
	}
};

export default define(meta, async (ps, me) => {
	const instance = await fetchMeta(true);

	const emojis = await Emojis.find({ where: { host: null }, cache: { id: 'meta_emojis', milliseconds: 3600000 } }); // 1 hour

	const response: any = {
		maintainerName: instance.maintainerName,
		maintainerEmail: instance.maintainerEmail,

		version: pkg.version,

		name: instance.name,
		uri: config.url,
		description: instance.description,

		secure: config.https != null,
		machine: os.hostname(),
		os: os.platform(),
		node: process.version,
		psql: await getConnection().query('SHOW server_version').then(x => x[0].server_version),
		redis: redis.server_info.redis_version,

		cpu: {
			model: os.cpus()[0].model,
			cores: os.cpus().length
		},

		driveCapacityPerRemoteUserMb: instance.remoteDriveCapacityMb,
		cacheRemoteFiles: instance.cacheRemoteFiles,
		enableRecaptcha: instance.enableRecaptcha,
		recaptchaSiteKey: instance.recaptchaSiteKey,
		swPublickey: instance.swPublicKey,
		maxNoteTextLength: Math.min(instance.maxNoteTextLength, DB_MAX_NOTE_TEXT_LENGTH),
		emojis: emojis.map(e => ({
			id: e.id,
			aliases: e.aliases,
			name: e.name,
			url: e.url,
		})),
		enableServiceWorker: instance.enableServiceWorker,
		requireSetup: (await Users.count({})) === 0
	};

	if (ps.detail) {
		response.features = {
			elasticsearch: config.elasticsearch ? true : false,
			recaptcha: instance.enableRecaptcha,
			objectStorage: instance.useObjectStorage,
			serviceWorker: instance.enableServiceWorker,
		};
	}

	if (me) {
		response.useStarForReactionFallback = instance.useStarForReactionFallback;
		response.blockedHosts = instance.blockedHosts;
		response.recaptchaSecretKey = instance.recaptchaSecretKey;
		response.proxyAccount = instance.proxyAccount;
		response.summalyProxy = instance.summalyProxy;
		response.swPrivateKey = instance.swPrivateKey;
	}

	return response;
});
