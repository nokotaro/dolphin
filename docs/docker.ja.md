Dockerを使ったDolphin構築方法
================================================================

このガイドはDockerを使ったDolphinセットアップ方法について解説します。

----------------------------------------------------------------

*1.* Dolphinのダウンロード
----------------------------------------------------------------
1. masterブランチからDolphinレポジトリをクローン

	`git clone https://github.com/mei23/dolphin.git`

2. dolphinディレクトリに移動

	`cd dolphin`

3. 最新のリリースをチェックアウト

	`git checkout mei-dolphin`

*2.* 設定ファイルの作成と編集
----------------------------------------------------------------

下記コマンドで設定ファイルを作成してください。

```bash
cd .config
cp example.yml default.yml
cp docker_example.env docker.env
```

### `default.yml`の編集

非Docker環境と同じ様に編集してください。  
ただし、Postgresql、RedisとElasticsearchのホストは`localhost`ではなく、`docker-compose.yml`で設定されたサービス名になっています。  
標準設定では次の通りです。

| サービス       | ホスト名 |
|---------------|---------|
| Postgresql    |`db`     |
| Redis         |`redis`  |
| Elasticsearch |`es`     |

### `docker.env`の編集

このファイルはPostgresqlの設定を記述します。  
最低限記述する必要がある設定は次の通りです。

| 設定                 | 内容         |
|---------------------|--------------|
| `POSTGRES_PASSWORD` | パスワード    |
| `POSTGRES_USER`     | ユーザー名    |
| `POSTGRES_DB`       | データベース名 |

*3.* Dockerの設定
----------------------------------------------------------------
`docker-compose.yml`を編集してください。

*4.* Dolphinのビルド
----------------------------------------------------------------
次のコマンドでDolphinをビルドしてください:

`docker-compose build`

*5.* 以上です！
----------------------------------------------------------------
お疲れ様でした。これでDolphinを動かす準備は整いました。

### 通常起動
`docker-compose up -d`するだけです。GLHF!

### Dolphinを最新バージョンにアップデートする方法:
1. `git stash`
2. `git checkout mei-dolphin`
3. `git pull`
4. `git stash pop`
5. `docker-compose build`
6. `docker-compose stop && docker-compose up -d`

### cliコマンドを実行する方法:

`docker-compose run --rm web node built/tools/mark-admin @example`

----------------------------------------------------------------

なにかお困りのことがありましたらお気軽にご連絡ください。
