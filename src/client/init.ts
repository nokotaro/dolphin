/**
 * App entry point
 */

import Vue from 'vue';
import Vuex from 'vuex';
import VueMeta from 'vue-meta';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import i18n from './i18n';
import VueHotkey from './scripts/hotkey';
import App from './app.vue';
import MiOS from './mios';
import { version, langs, instanceName } from './config';
import PostFormDialog from './components/post-form-dialog.vue';
import Dialog from './components/dialog.vue';
import { router } from './router';

Vue.use(Vuex);
Vue.use(VueHotkey);
Vue.use(VueMeta);
Vue.component('fa', FontAwesomeIcon);

require('./directives');
require('./components');
require('./filters');

Vue.mixin({
	methods: {
		destroyDom() {
			this.$destroy();

			if (this.$el.parentNode) {
				this.$el.parentNode.removeChild(this.$el);
			}
		}
	}
});

console.info(`Dolphin v${version}`);

//#region Detect the user language
let lang = null;

if (langs.map(x => x[0]).includes(navigator.language)) {
	lang = navigator.language;
} else {
	lang = langs.map(x => x[0]).find(x => x.split('-')[0] == navigator.language);

	if (lang == null) {
		// Fallback
		lang = 'en-US';
	}
}

localStorage.setItem('lang', lang);
//#endregion

// Detect the user agent
const ua = navigator.userAgent.toLowerCase();
const isMobile = /mobile|iphone|ipad|android/.test(ua) || window.innerWidth <= 1024;

// Get the <head> element
const head = document.getElementsByTagName('head')[0];

// If mobile, insert the viewport meta tag
if (isMobile) {
	const viewport = document.getElementsByName('viewport').item(0);
	viewport.setAttribute('content',
		`${viewport.getAttribute('content')},minimum-scale=1,maximum-scale=1,user-scalable=no`);
	head.appendChild(viewport);
}

//#region Fetch locale data
const cachedLocale = localStorage.getItem('locale');

const t = new Date().getTime();

if (cachedLocale == null) {
	fetch(`/assets/locales/${lang}.json?${t}`)
		.then(response => response.json()).then(locale => {
			localStorage.setItem('locale', JSON.stringify(locale));
			i18n.locale = lang;
			i18n.setLocaleMessage(lang, locale);
		});
} else {
	// TODO: 古い時だけ更新
	setTimeout(() => {
		fetch(`/assets/locales/${lang}.json?${t}`)
			.then(response => response.json()).then(locale => {
				localStorage.setItem('locale', JSON.stringify(locale));
			});
	}, 1000 * 5);
}
//#endregion

//#region Set lang attr
const html = document.documentElement;
html.setAttribute('lang', lang);
//#endregion

// iOSでプライベートモードだとlocalStorageが使えないので既存のメソッドを上書きする
try {
	localStorage.setItem('kyoppie', 'yuppie');
} catch (e) {
	Storage.prototype.setItem = () => { }; // noop
}

// http://qiita.com/junya/items/3ff380878f26ca447f85
document.body.setAttribute('ontouchstart', '');

// アプリ基底要素マウント
document.body.innerHTML = '<div id="app"></div>';

const os = new MiOS();

os.init(async () => {
	if (os.store.state.settings.wallpaper) document.documentElement.style.backgroundImage = `url(${os.store.state.settings.wallpaper})`;

	if ('Notification' in window && os.store.getters.isSignedIn) {
		// 許可を得ていなかったらリクエスト
		if (Notification.permission === 'default') {
			Notification.requestPermission();
		}
	}

	const app = new Vue({
		store: os.store,
		metaInfo: {
			title: null,
			titleTemplate: title => title ? `${title} | ${instanceName}` : instanceName
		},
		data() {
			return {
				stream: os.stream,
				isMobile: isMobile
			};
		},
		methods: {
			api: os.api,
			getMeta: os.getMeta,
			getMetaSync: os.getMetaSync,
			signout: os.signout,
			new(vm, props) {
				const x = new vm({
					parent: this,
					propsData: props
				}).$mount();
				document.body.appendChild(x.$el);
				return x;
			},
			dialog(opts) {
				const vm = this.new(Dialog, opts);
				const p: any = new Promise((res) => {
					vm.$once('ok', result => res({ canceled: false, result }));
					vm.$once('cancel', () => res({ canceled: true }));
				});
				p.close = () => {
					vm.close();
				};
				return p;
			},
			post(opts, cb) {
				const vm = this.new(PostFormDialog, opts);
				if (cb) vm.$once('closed', cb);
				(vm as any).focus();
			},
		},
		router: router,
		render: createEl => createEl(App)
	});

	os.app = app;

	// マウント
	app.$mount('#app');
});
