/**
 * Web Client Server
 */

import * as os from 'os';
import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as send from 'koa-send';
import * as favicon from 'koa-favicon';
import * as views from 'koa-views';

import packFeed from './feed';
import { fetchMeta } from '../../misc/fetch-meta';
import * as pkg from '../../../package.json';
import config from '../../config';
import { Users, Notes, Emojis, UserProfiles } from '../../models';
import parseAcct from '../../misc/acct/parse';
import getNoteSummary from '../../misc/get-note-summary';
import { ensure } from '../../prelude/ensure';
import { getConnection } from 'typeorm';
import redis from '../../db/redis';

const client = `${__dirname}/../../client/`;

// Init app
const app = new Koa();

// Init renderer
app.use(views(__dirname + '/views', {
	extension: 'pug',
	options: {
		config
	}
}));

// Serve favicon
app.use(favicon(`${client}/assets/favicon.png`));

// Common request handler
app.use(async (ctx, next) => {
	// IFrameの中に入れられないようにする
	ctx.set('X-Frame-Options', 'DENY');
	await next();
});

// Init router
const router = new Router();

//#region static assets
router.get('/assets/*', async ctx => {
	await send(ctx as any, ctx.path, {
		root: client,
		maxage: 86400,
	});
});

// Apple touch icon
router.get('/apple-touch-icon.png', async ctx => {
	await send(ctx as any, '/assets/apple-touch-icon.png', {
		root: client
	});
});

// ServiceWorker
router.get(/^\/sw\.(.+?)\.js$/, async ctx => {
	await send(ctx as any, `/assets/sw.${ctx.params[0]}.js`, {
		root: client
	});
});

// Manifest
router.get('/manifest.json', require('./manifest'));

router.get('/robots.txt', async ctx => {
	await send(ctx as any, '/assets/robots.txt', {
		root: client
	});
});

//#endregion

// URL preview endpoint
router.get('/url', require('./url-preview'));

const getFeed = async (acct: string) => {
	const { username, host } = parseAcct(acct);
	const user = await Users.findOne({
		usernameLower: username.toLowerCase(),
		host
	});

	return user && await packFeed(user);
};

// Atom
router.get('/@:user.atom', async ctx => {
	const feed = await getFeed(ctx.params.user);

	if (feed) {
		ctx.set('Content-Type', 'application/atom+xml; charset=utf-8');
		ctx.body = feed.atom1();
	} else {
		ctx.status = 404;
	}
});

// RSS
router.get('/@:user.rss', async ctx => {
	const feed = await getFeed(ctx.params.user);

	if (feed) {
		ctx.set('Content-Type', 'application/rss+xml; charset=utf-8');
		ctx.body = feed.rss2();
	} else {
		ctx.status = 404;
	}
});

// JSON
router.get('/@:user.json', async ctx => {
	const feed = await getFeed(ctx.params.user);

	if (feed) {
		ctx.set('Content-Type', 'application/json; charset=utf-8');
		ctx.body = feed.json1();
	} else {
		ctx.status = 404;
	}
});

//#region for crawlers
// User
router.get(['/@:user', '/@:user/:sub'], async (ctx, next) => {
	const { username, host } = parseAcct(ctx.params.user);
	const user = await Users.findOne({
		usernameLower: username.toLowerCase(),
		host
	});

	if (user != null) {
		const profile = await UserProfiles.findOne(user.id).then(ensure);
		const meta = await fetchMeta();
		const me = profile.fields
			? profile.fields
				.filter(filed => filed.value != null && filed.value.match(/^https?:/))
				.map(field => field.value)
			: [];

		await ctx.render('user', {
			user, profile, me,
			sub: ctx.params.sub,
			instanceName: config.name,
			icon: meta.iconUrl
		});
		ctx.set('Cache-Control', 'public, max-age=30');
	} else {
		// リモートユーザーなので
		await next();
	}
});

router.get('/users/:user', async ctx => {
	const user = await Users.findOne({
		id: ctx.params.user,
		host: null
	});

	if (user == null) {
		ctx.status = 404;
		return;
	}

	ctx.redirect(`/@${user.username}${ user.host == null ? '' : '@' + user.host}`);
});

// Note
router.get('/notes/:note', async ctx => {
	const note = await Notes.findOne(ctx.params.note);

	if (note) {
		const _note = await Notes.pack(note);
		const meta = await fetchMeta();
		await ctx.render('note', {
			note: _note,
			summary: getNoteSummary(_note),
			instanceName: config.name,
			icon: meta.iconUrl
		});

		if (['public', 'home'].includes(note.visibility)) {
			ctx.set('Cache-Control', 'public, max-age=180');
		} else {
			ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
		}

		return;
	}

	ctx.status = 404;
});
//#endregion

router.get('/info', async ctx => {
	const meta = await fetchMeta(true);
	const emojis = await Emojis.find({
		where: { host: null }
	});
	await ctx.render('info', {
		version: pkg.version,
		machine: os.hostname(),
		os: os.platform(),
		node: process.version,
		psql: await getConnection().query('SHOW server_version').then(x => x[0].server_version),
		redis: redis.server_info.redis_version,
		cpu: {
			model: os.cpus()[0].model,
			cores: os.cpus().length
		},
		emojis: emojis,
		meta: meta,
		name: config.name,
		maintainerName: config.maintainerName,
		maintainerEmail: config.maintainerEmail,
		originalUsersCount: await Users.count({ host: null }),
		originalNotesCount: await Notes.count({ userHost: null })
	});
});

// streamingに非WebSocketリクエストが来た場合にbase htmlをキャシュ付きで返すと、Proxy等でそのパスがキャッシュされておかしくなる
router.get('/streaming', async ctx => {
	ctx.status = 503;
	ctx.set('Cache-Control', 'private, max-age=0');
});

// Render base html for all requests
router.get('*', async ctx => {
	const meta = await fetchMeta();
	await ctx.render('base', {
		version: pkg.version,
		img: meta.bannerUrl,
		title: config.name,
		instanceName: config.name,
		desc: meta.description,
		icon: meta.iconUrl
	});
	ctx.set('Cache-Control', 'public, max-age=300');
});

// Register router
app.use(router.routes());

module.exports = app;
