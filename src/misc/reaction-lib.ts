import { emojiRegex } from './emoji-regex';
import { fetchMeta } from './fetch-meta';
import { Emojis } from '../models';
import { toPunyNullable } from './convert-host';

const basic10: Record<string, string> = {
	'like':     '👍',
	'love':     '❤', // ここに記述する場合は異体字セレクタを入れない
	'laugh':    '😆',
	'hmm':      '🤔',
	'surprise': '😮',
	'congrats': '🎉',
	'angry':    '💢',
	'confused': '😥',
	'rip':      '😇',
	'pudding':  '🍮',
};

export async function getFallbackReaction(): Promise<string> {
	return '👍';
}

export function convertLegacyReactions(reactions: Record<string, number>) {
	// v12, m544 では ここに文字列 => Unicode 処理があるが対応しない

	const _reactions2 = {} as Record<string, number>;

	for (const reaction of Object.keys(reactions)) {
		_reactions2[decodeReaction(reaction).reaction] = reactions[reaction];
	}

	return _reactions2;
}

export async function toDbReaction(reaction?: string | null, reacterHost?: string | null): Promise<string> {
	if (reaction == null) return await getFallbackReaction();

	reacterHost = toPunyNullable(reacterHost);

	// Misskeyの文字列タイプのリアクションを絵文字に変換
	if (Object.keys(basic10).includes(reaction)) return basic10[reaction];

	// Unicode絵文字
	const match = emojiRegex.exec(reaction);
	if (match) {
		// 合字を含む1つの絵文字
		const unicode = match[0];

		// 異体字セレクタ除去後の絵文字
		const normalized = unicode.match('\u200d') ? unicode : unicode.replace(/\ufe0f/g, '');

		return normalized;
	}

	const custom = reaction.match(/^:([\w+-]+)(?:@\.)?:$/);
	if (custom) {
		const name = custom[1];
		const emoji = await Emojis.findOne({
			host: reacterHost || null,
			name,
		});

		if (emoji) return reacterHost ? `:${name}@${reacterHost}:` : `:${name}:`;
	}

	return await getFallbackReaction();
}

type DecodedReaction = {
	/**
	 * リアクション名 (Unicode Emoji or ':name@hostname' or ':name@.')
	 */
	reaction: string;

	/**
	 * name (カスタム絵文字の場合name, Emojiクエリに使う)
	 */
	name?: string;

	/**
	 * host (カスタム絵文字の場合host, Emojiクエリに使う)
	 */
	host?: string | null;
};

export function decodeReaction(str: string): DecodedReaction {
	const custom = str.match(/^:([\w+-]+)(?:@([\w.-]+))?:$/);

	if (custom) {
		const name = custom[1];
		const host = custom[2] || null;

		return {
			reaction: `:${name}@${host || '.'}:`,	// ローカル分は@以降を省略するのではなく.にする
			name,
			host
		};
	}

	return {
		reaction: str,
		name: undefined,
		host: undefined
	};
}

export function convertLegacyReaction(reaction: string): string {
	reaction = decodeReaction(reaction).reaction;
	//if (Object.keys(legacies).includes(reaction)) return legacies[reaction];
	return reaction;
}
