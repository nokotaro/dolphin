import { publishNoteStream } from '../../stream';
import { renderLike } from '../../../remote/activitypub/renderer/like';
import { deliver } from '../../../queue';
import { renderActivity } from '../../../remote/activitypub/renderer';
import { IdentifiableError } from '../../../misc/identifiable-error';
import { toDbReaction, decodeReaction } from '../../../misc/reaction-lib';
import { User } from '../../../models/entities/user';
import { Note } from '../../../models/entities/note';
import { NoteReactions, Users, Notes, Emojis } from '../../../models';
import { perUserReactionsChart } from '../../chart';
import { genId } from '../../../misc/gen-id';
import { NoteReaction } from '../../../models/entities/note-reaction';
import { createNotification } from '../../create-notification';
import { isDuplicateKeyValueError } from '../../../misc/is-duplicate-key-value-error';

export default async (user: User, note: Note, reaction?: string) => {
	// Myself
	if (note.userId === user.id) {
		throw new IdentifiableError('2d8e7297-1873-4c00-8404-792c68d7bef0', 'cannot react to my note');
	}

	reaction = await toDbReaction(reaction, user.host);

	// Create reaction
	const inserted = await NoteReactions.save({
		id: genId(),
		createdAt: new Date(),
		noteId: note.id,
		userId: user.id,
		reaction
	} as NoteReaction).catch(e => {
		// duplicate key error
		if (isDuplicateKeyValueError(e)) {
			throw new IdentifiableError('51c42bb4-931a-456b-bff7-e5a8a70dd298', 'already reacted');
		}

		throw e;
	});

	// Increment reactions count
	const sql = `jsonb_set("reactions", '{${reaction}}', (COALESCE("reactions"->>'${reaction}', '0')::int + 1)::text::jsonb)`;
	await Notes.createQueryBuilder().update()
		.set({
			reactions: () => sql,
		})
		.where('id = :id', { id: note.id })
		.execute();

	perUserReactionsChart.update(user, note);

	// カスタム絵文字リアクションだったら絵文字情報も送る
	const decodedReaction = decodeReaction(reaction);

	let emoji = await Emojis.findOne({
		where: {
			name: decodedReaction.name,
			host: decodedReaction.host
		},
		select: ['name', 'host', 'url']
	});

	if (emoji) {
		emoji = {
			name: emoji.host ? `${emoji.name}@${emoji.host}` : `${emoji.name}@.`,
			url: emoji.url
		} as any;
	}

	publishNoteStream(note.id, 'reacted', {
		reaction: decodedReaction.reaction,
		emoji: emoji,
		userId: user.id
	});

	// リアクションされたユーザーがローカルユーザーなら通知を作成
	if (note.userHost === null) {
		createNotification(note.userId, user.id, 'reaction', {
			noteId: note.id,
			reaction: reaction
		});
	}

	//#region 配信
	// リアクターがローカルユーザーかつリアクション対象がリモートユーザーの投稿なら配送
	if (Users.isLocalUser(user) && note.userHost !== null) {
		const content = renderActivity(await renderLike(inserted, note));
		Users.findOne(note.userId).then(u => {
			deliver(user, content, u!.inbox);
		});
	}
	//#endregion
};
